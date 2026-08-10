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

# Canonical bridged USDC on X Layer (mainnet 196 / testnet 1952). The testnet
# usually has a mintable demo USDC in deployments/xlayerTestnet.json instead.
CANONICAL_USDC = {
    196: "0x74b7f16337b8972027f6196a17a631ac6de26f22",
    1952: "0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3",
}

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
    {"inputs": [], "name": "lastStrategyUpdate", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getTotalValue", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getHoldings", "outputs": [{"name": "", "type": "address[]"}, {"name": "", "type": "uint256[]"}], "stateMutability": "view", "type": "function"},
]


class XLayerClient:
    def __init__(self):
        self.settings = get_settings()

    # ---- wiring ------------------------------------------------------------
    def _network_context(self, network: Optional[str] = None):
        """Resolve (rpc, chain_id, deployments, simulated) for a network label.

        `network` is one of "testnet" | "mainnet" (from the frontend selector)
        or None to use the env-configured default. In dev/simulation, always
        fall back to the in-memory store regardless of the label.
        """
        if self.settings.is_simulation:
            return self.settings.effective_rpc, self.settings.effective_chain_id, self.settings.load_deployments(), True
        if network == "testnet":
            rpc, chain_id, net = self.settings.x_layer_testnet_rpc, 1952, "xlayerTestnet"
        elif network == "mainnet":
            rpc, chain_id, net = self.settings.x_layer_rpc, 196, "xlayer"
        else:
            return self.settings.effective_rpc, self.settings.effective_chain_id, self.settings.load_deployments(), False
        path = ROOT / "deployments" / f"{net}.json"
        deployments = json.loads(path.read_text()) if path.exists() else {}
        return rpc, chain_id, deployments, False

    def _web3(self, network: Optional[str] = None):
        from web3 import Web3
        rpc, _, _, _ = self._network_context(network)
        w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 15}))
        try:
            from web3.middleware import ExtraDataToPOAMiddleware
            w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        except Exception:
            pass
        return w3

    def _factory(self, w3=None, network: Optional[str] = None):
        w3 = w3 or self._web3(network)
        _, _, deployments, _ = self._network_context(network)
        addr = deployments.get("factory")
        if not addr:
            return None
        return w3.eth.contract(address=addr, abi=FACTORY_ABI)

    @property
    def is_simulation(self) -> bool:
        return self.settings.is_simulation

    # ---- public API --------------------------------------------------------
    def system_config(self, network: Optional[str] = None) -> dict:
        rpc, chain_id, d, simulated = self._network_context(network)
        return {
            "env": self.settings.app_env,
            "network": network or ("testnet" if chain_id == 1952 else "mainnet"),
            "chainId": chain_id,
            "rpc": rpc,
            "simulated": simulated or self.is_simulation,
            "factoryAddress": d.get("factory", ""),
            "strategyAddress": d.get("strategy", ""),
            "usdc": d.get("usdc", ""),
            "usdcLabel": "USDC",
        }

    def list_vaults(self, network: Optional[str] = None) -> List[dict]:
        if self.is_simulation:
            from .. import store
            return store.STORE.list_vaults()
        factory = self._factory(network=network)
        if not factory:
            return []
        w3 = self._web3(network)
        try:
            vaults = factory.functions.getVaults().call()
            return [self.vault_snapshot(v, network) for v in vaults]
        except Exception as exc:
            log.warning("list_vaults failed: %s", exc)
            return []

    def get_vault(self, user: str, network: Optional[str] = None) -> Optional[dict]:
        if self.is_simulation:
            from .. import store
            return store.STORE.get_vault(user)
        factory = self._factory(network=network)
        if not factory:
            return None
        try:
            vault = factory.functions.getUserVault(user).call()
            if vault and int(vault, 16) != 0:
                return self.vault_snapshot(vault, network)
        except Exception as exc:
            log.warning("get_vault failed: %s", exc)
        return None

    def vault_snapshot(self, vault: str, network: Optional[str] = None) -> dict:
        w3 = self._web3(network)
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
            v.functions.lastStrategyUpdate(),
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
        last_update = int(results[7])
        assets, amounts = results[8]
        holdings_raw = {a: int(am) for a, am in zip(assets, amounts)}

        # Normalize raw token units → human USD. USDC and the demo USDC are 6
        # decimals; read decimals() per asset (fallback 6) so the dashboard
        # shows $3.00, not $3,000,000.
        decimals = {a: self._asset_decimals(w3, a) for a in holdings_raw}
        holdings = {a: round(am / 10 ** decimals[a], 6) for a, am in holdings_raw.items()}
        scale = min(decimals.values()) if decimals else 6
        total_norm = round(total / 10 ** scale, 6)
        deposited_norm = round(deposited / 10 ** scale, 6)
        returns_norm = round(returns / 10 ** scale, 6)
        growth = (returns_norm / deposited_norm * 100.0) if deposited_norm else 0.0

        return {
            "user": user,
            "vault": vault,
            "allocationPercent": alloc,
            "riskTolerance": risk,
            "holdings": holdings,
            "totalValue": total_norm,
            "totalDeposited": deposited_norm,
            "totalReturns": returns_norm,
            "growthPct": round(growth, 2),
            "strategyHash": "0x" + strategy,
            "lastStrategyUpdate": last_update,
            "simulated": False,
        }

    @staticmethod
    def _asset_decimals(w3, asset: str, _cache: dict = {}) -> int:
        """Cache decimals() per token address, falling back to 6 (USDC-like)."""
        low = asset.lower()
        if low in _cache:
            return _cache[low]
        try:
            tok = w3.eth.contract(
                address=asset,
                abi=[{"inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "stateMutability": "view", "type": "function"}],
            )
            d = int(tok.functions.decimals().call())
        except Exception:
            d = 6
        _cache[low] = d
        return d

    def create_vault(self, user: str, allocation_percent: int, risk_tolerance: int, preferred: List[str], network: Optional[str] = None) -> dict:
        if self.is_simulation:
            from .. import store
            return store.STORE.create_vault(user, allocation_percent, risk_tolerance, preferred)
        factory = self._factory(network=network)
        if not factory:
            return {"user": user, "status": "unavailable", "detail": "No deployment for requested network"}
        w3 = self._web3(network)
        agent = w3.eth.account.from_key(self.settings.agent_private_key)
        tx = factory.functions.createVault(allocation_percent, preferred, risk_tolerance).build_transaction({
            "from": agent.address, "gas": 400000, "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(agent.address),
        })
        signed = agent.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(h)
        return {"user": user, "status": "submitted", "txHash": h.hex()}

    def update_allocation(self, user: str, percent: int, network: Optional[str] = None) -> Optional[dict]:
        if self.is_simulation:
            from .. import store
            return store.STORE.update_allocation(user, percent)
        factory = self._factory(network=network)
        if not factory:
            return None
        w3 = self._web3(network)
        agent = w3.eth.account.from_key(self.settings.agent_private_key)
        tx = factory.functions.updateAllocation(percent).build_transaction({
            "from": agent.address, "gas": 120000, "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(agent.address),
        })
        signed = agent.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(h)
        return {"user": user, "allocationPercent": percent, "txHash": h.hex()}

    def forward_payment(self, user: str, asset: str, amount: int, network: Optional[str] = None) -> dict:
        """Route an incoming payment; allocationPercent of it enters the vault.

        `amount` is expressed in human units (e.g. 1000 = $1,000 USD); `asset`
        may be a token symbol ("USDC"/"USDT") or an address; symbols are
        resolved to the per-network demo/canonical USDC. It is scaled to the
        asset's decimals before calling the contract. When the signing agent is
        also the payer (in-app simulate flow), an ERC-20 approval is issued
        automatically if the allowance is insufficient.
        """
        if self.is_simulation:
            from .. import store
            return store.STORE.forward_payment(user, asset, amount)
        factory = self._factory(network=network)
        if not factory:
            return {"user": user, "status": "unavailable", "detail": "No deployment for requested network"}
        w3 = self._web3(network)
        asset_addr = self._resolve_asset(asset, network)
        decimals = self._asset_decimals(w3, asset_addr)
        raw = int(round(amount * (10 ** decimals)))
        agent = w3.eth.account.from_key(self.settings.agent_private_key)

        # Ensure the agent can pull funds: approve the factory when needed.
        self._ensure_allowance(w3, asset_addr, factory.address, agent, raw)

        tx = factory.functions.forwardPayment(user, asset_addr, raw).build_transaction({
            "from": agent.address, "gas": 250000, "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(agent.address),
        })
        signed = agent.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(h)
        return {"user": user, "asset": asset, "status": "submitted", "txHash": h.hex()}

    def _resolve_asset(self, asset: str, network: Optional[str] = None) -> str:
        """Map a token symbol to its user address for the active chain.

        Addresses pass through; "USDC" resolves to the mintable demo token
        written by scripts/fund.js (testnet) or the canonical bridged USDC.
        """
        if not isinstance(asset, str) or asset.startswith("0x"):
            return asset
        symbol = asset.strip().upper()
        if symbol != "USDC":
            return asset
        _, chain_id, deployments, _ = self._network_context(network)
        demo = deployments.get("usdc")
        if demo:
            return demo
        return CANONICAL_USDC.get(chain_id, CANONICAL_USDC[196])

    def _ensure_allowance(self, w3, asset: str, spender: str, account, amount: int) -> None:
        """Approve `spender` to move `amount` of `asset` from `account` if needed."""
        approve_abi = [
            {"inputs": [{"name": "s", "type": "address"}, {"name": "a", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"},
            {"inputs": [{"name": "o", "type": "address"}, {"name": "s", "type": "address"}], "name": "allowance", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        ]
        tok = w3.eth.contract(address=asset, abi=approve_abi)
        current = tok.functions.allowance(account.address, spender).call()
        if current >= amount:
            return
        tx = tok.functions.approve(spender, amount).build_transaction({
            "from": account.address, "gas": 120000, "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(account.address),
        })
        signed = account.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(h)

    def record_returns(self, user: str, amount: int, network: Optional[str] = None) -> dict:
        if self.is_simulation:
            from .. import store
            return store.STORE.record_returns(user, amount)
        factory = self._factory(network=network)
        if not factory:
            return {"user": user, "status": "unavailable", "detail": "No deployment for requested network"}
        w3 = self._web3(network)
        # Returns are booked in the vault's first held asset's decimals.
        vault = self.get_vault(user, network)
        assets = vault.get("holdings", {}) if vault else {}
        decimals = self._asset_decimals(w3, next(iter(assets), user)) if assets else 6
        raw = int(round(amount * (10 ** decimals))) if isinstance(amount, float) else amount
        agent = w3.eth.account.from_key(self.settings.agent_private_key)
        tx = factory.functions.recordReturns(user, raw).build_transaction({
            "from": agent.address, "gas": 120000, "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(agent.address),
        })
        signed = agent.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(h)
        return {"user": user, "returns": amount, "txHash": h.hex()}

    def set_strategy(self, user: str, strategy_hash: str, network: Optional[str] = None) -> dict:
        if self.is_simulation:
            from .. import store
            return store.STORE.set_strategy(user, strategy_hash)
        factory = self._factory(network=network)
        if not factory:
            return {"user": user, "status": "unavailable", "detail": "No deployment for requested network"}
        w3 = self._web3(network)
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
