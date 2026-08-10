"""X Layer client — one interface for simulation, testnet, and mainnet.

In dev mode (APP_ENV=dev) every call is served by the in-memory Store so the
whole product is testable offline. In staging/prod it talks to the PENSA
factory contract over the X Layer RPC.
"""
from __future__ import annotations

import json
import logging
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Optional

from ..config import get_settings

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "ai-agent"))

log = logging.getLogger("pensa.xlayer")

# --- embedded factory ABI (subset used by the backend) ----------------------
FACTORY_ABI = [
    {"inputs": [{"name": "u", "type": "address"}], "name": "getUserVault", "outputs": [{"name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getVaults", "outputs": [{"name": "", "type": "address[]"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "vaultCount", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "u", "type": "address"}, {"name": "a", "type": "uint256"}], "name": "recordReturns", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"name": "h", "type": "bytes32"}], "name": "updateStrategy", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"name": "p", "type": "uint256"}, {"name": "a", "type": "address[]"}, {"name": "r", "type": "uint256"}], "name": "createVault", "outputs": [{"name": "", "type": "address"}], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"name": "_user", "type": "address"}, {"name": "_asset", "type": "address"}, {"name": "_amount", "type": "uint256"}], "name": "forwardPayment", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
]

VAULT_ABI = [
    {"inputs": [], "name": "user", "outputs": [{"name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "allocationPercent", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "riskTolerance", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "totalDeposited", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "totalReturns", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "currentStrategyHash", "outputs": [{"name": "", "type": "bytes32"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getTotalValue", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getHoldings", "outputs": [{"name": "", "type": "address[]"}, {"name": "", "type": "uint256[]"}], "stateMutability": "view", "type": "function"},
]


class XLayerClient:
    def __init__(self):
        self.settings = get_settings()

    # ---- wiring ------------------------------------------------------------
    def _web3(self):
        from web3 import Web3
        w3 = Web3(Web3.HTTPProvider(self.settings.effective_rpc, request_kwargs={"timeout": 15}))
        try:
            from web3.middleware import ExtraDataToPOAMiddleware
            w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        except Exception:
            pass
        return w3

    def _factory(self, w3=None):
        w3 = w3 or self._web3()
        deployments = self.settings.load_deployments()
        addr = deployments.get("factory")
        if not addr:
            return None
        return w3.eth.contract(address=addr, abi=FACTORY_ABI)

    @property
    def is_simulation(self) -> bool:
        return self.settings.is_simulation

    # ---- public API --------------------------------------------------------
    def system_config(self) -> dict:
        d = self.settings.load_deployments()
        return {
            "env": self.settings.app_env,
            "chainId": self.settings.effective_chain_id,
            "rpc": self.settings.effective_rpc,
            "simulated": self.is_simulation,
            "factoryAddress": d.get("factory", ""),
            "strategyAddress": d.get("strategy", ""),
        }

    def list_vaults(self) -> List[dict]:
        if self.is_simulation:
            from .. import store
            return store.STORE.list_vaults()
        factory = self._factory()
        if not factory:
            return []
        w3 = self._web3()
        try:
            vaults = factory.functions.getVaults().call()
            return [self.vault_snapshot(v) for v in vaults]
        except Exception as exc:
            log.warning("list_vaults failed: %s", exc)
            return []

    def get_vault(self, user: str) -> Optional[dict]:
        if self.is_simulation:
            from .. import store
            return store.STORE.get_vault(user)
        factory = self._factory()
        if not factory:
            return None
        try:
            vault = factory.functions.getUserVault(user).call()
            if vault and int(vault, 16) != 0:
                return self.vault_snapshot(vault)
        except Exception as exc:
            log.warning("get_vault failed: %s", exc)
        return None

    def vault_snapshot(self, vault: str) -> dict:
        w3 = self._web3()
        v = w3.eth.contract(address=vault, abi=VAULT_ABI)
        # Testnet RPCs are slow (~3s per call); fetch the 8 reads concurrently
        # instead of sequentially (~25s → ~4s).
        calls = [
            v.functions.user(),
            v.functions.getTotalValue(),
            v.functions.totalDeposited(),
            v.functions.totalReturns(),
            v.functions.allocationPercent(),
            v.functions.riskTolerance(),
            v.functions.currentStrategyHash(),
            v.functions.getHoldings(),
        ]
        with ThreadPoolExecutor(max_workers=8) as ex:
            results = list(ex.map(lambda fn: fn.call(), calls))

        user = results[0]
        total = results[1]
        deposited = results[2]
        returns = results[3]
        alloc = results[4]
        risk = results[5]
        strategy = results[6].hex()
        assets, amounts = results[7]
        holdings = {a: int(am) for a, am in zip(assets, amounts)}
        growth = (returns / deposited * 100.0) if deposited else 0.0
        return {
            "user": user,
            "vault": vault,
            "allocationPercent": alloc,
            "riskTolerance": risk,
            "holdings": holdings,
            "totalValue": int(total),
            "totalDeposited": int(deposited),
            "totalReturns": int(returns),
            "growthPct": round(growth, 2),
            "strategyHash": "0x" + strategy,
            "simulated": False,
        }

    def create_vault(self, user: str, allocation_percent: int, risk_tolerance: int, preferred: List[str]) -> dict:
        if self.is_simulation:
            from .. import store
            return store.STORE.create_vault(user, allocation_percent, risk_tolerance, preferred)
        factory = self._factory()
        w3 = self._web3()
        agent = w3.eth.account.from_key(self.settings.agent_private_key)
        tx = factory.functions.createVault(allocation_percent, preferred, risk_tolerance).build_transaction({
            "from": agent.address, "gas": 400000, "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(agent.address),
        })
        signed = agent.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(h)
        return {"user": user, "status": "submitted", "txHash": h.hex()}

    def update_allocation(self, user: str, percent: int) -> Optional[dict]:
        if self.is_simulation:
            from .. import store
            return store.STORE.update_allocation(user, percent)
        factory = self._factory()
        w3 = self._web3()
        agent = w3.eth.account.from_key(self.settings.agent_private_key)
        tx = factory.functions.updateAllocation(percent).build_transaction({
            "from": agent.address, "gas": 120000, "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(agent.address),
        })
        signed = agent.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(h)
        return {"user": user, "allocationPercent": percent, "txHash": h.hex()}

    def forward_payment(self, user: str, asset: str, amount: int) -> dict:
        """Route an incoming payment; allocationPercent of it enters the vault."""
        if self.is_simulation:
            from .. import store
            return store.STORE.forward_payment(user, asset, amount)
        factory = self._factory()
        w3 = self._web3()
        agent = w3.eth.account.from_key(self.settings.agent_private_key)
        tx = factory.functions.forwardPayment(user, asset, amount).build_transaction({
            "from": agent.address, "gas": 250000, "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(agent.address),
        })
        signed = agent.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(h)
        return {"user": user, "asset": asset, "status": "submitted", "txHash": h.hex()}

    def record_returns(self, user: str, amount: int) -> dict:
        if self.is_simulation:
            from .. import store
            return store.STORE.record_returns(user, amount)
        factory = self._factory()
        w3 = self._web3()
        agent = w3.eth.account.from_key(self.settings.agent_private_key)
        tx = factory.functions.recordReturns(user, amount).build_transaction({
            "from": agent.address, "gas": 120000, "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(agent.address),
        })
        signed = agent.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(h)
        return {"user": user, "returns": amount, "txHash": h.hex()}

    def set_strategy(self, user: str, strategy_hash: str) -> dict:
        if self.is_simulation:
            from .. import store
            return store.STORE.set_strategy(user, strategy_hash)
        factory = self._factory()
        w3 = self._web3()
        agent = w3.eth.account.from_key(self.settings.agent_private_key)
        tx = factory.functions.updateStrategy(strategy_hash).build_transaction({
            "from": agent.address, "gas": 150000, "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(agent.address),
        })
        signed = agent.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(h)
        return {"user": user, "strategyHash": strategy_hash, "txHash": h.hex()}


CLIENT = XLayerClient()
