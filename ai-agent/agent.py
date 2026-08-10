"""PENSA AI Agent — orchestrator.

Responsibilities:
  * analyze_user_profile  -> natural-language LLM reasoning (HF free tier) w/ offline fallback
  * optimize_portfolio    -> LLM-adjusted allocation, guaranteed sane by portfolio_optimizer
  * rebalance_signal      -> concrete buy/sell instructions
  * execute_strategy      -> writes strategy hash on-chain via PENSAFactory

CLI:
    python ai-agent/agent.py profile  --user 0x... [--network xlayer]
    python ai-agent/agent.py optimize --user 0x... [--risk 60] [--network xlayer]
    python ai-agent/agent.py strategy --user 0x... [--network xlayer] [--dry-run]
    python ai-agent/agent.py run      [--network xlayer] [--loop] [--dry-run]

When no RPC / factory is configured, commands run in SIMULATION mode and print
what would happen on-chain (useful for offline demo & CI).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional

import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from market_data import get_market_snapshot, get_volatility
from portfolio_optimizer import optimize, expected_apr
from risk_analyzer import compute_risk_score, label_for

ROOT = Path(__file__).resolve().parent.parent

# config 

X_LAYER_RPC = os.getenv("X_LAYER_RPC", "https://rpc.xlayer.tech")
CHAIN_ID = int(os.getenv("CHAIN_ID", "196"))
AGENT_KEY = os.getenv("AGENT_PRIVATE_KEY", "").strip()
HF_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
HF_MODEL = os.getenv("HUGGINGFACE_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")
AI_FALLBACK_SLEEP = float(os.getenv("AI_FALLBACK_SLEEP", "20"))


def load_deployments(network: str) -> Optional[Dict]:
    """Read addresses written by scripts/deploy.js."""
    if network in ("dev", "simulation"):
        return None
    path = ROOT / "deployments" / f"{network}.json"
    if path.exists():
        return json.loads(path.read_text())
    return None


def _embed_abi() -> Dict[str, List[Dict]]:
    """Minimal ABIs embedded so the agent runs without hardhat artifacts."""
    factory_abi = [
        {"inputs": [{"name": "u", "type": "address"}], "name": "getUserVault", "outputs": [{"name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "getVaults", "outputs": [{"name": "", "type": "address[]"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "vaultCount", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [{"name": "u", "type": "address"}, {"name": "a", "type": "uint256"}], "name": "recordReturns", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
        {"inputs": [{"name": "h", "type": "bytes32"}], "name": "updateStrategy", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
        {"inputs": [{"name": "p", "type": "uint256"}, {"name": "a", "type": "address[]"}, {"name": "r", "type": "uint256"}], "name": "createVault", "outputs": [{"name": "", "type": "address"}], "stateMutability": "nonpayable", "type": "function"},
    ]
    vault_abi = [
        {"inputs": [], "name": "user", "outputs": [{"name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "allocationPercent", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "riskTolerance", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "totalDeposited", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "totalReturns", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "currentStrategyHash", "outputs": [{"name": "", "type": "bytes32"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "getTotalValue", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "getHoldings", "outputs": [{"name": "", "type": "address[]"}, {"name": "", "type": "uint256[]"}], "stateMutability": "view", "type": "function"},
    ]
    return {"factory": factory_abi, "vault": vault_abi}


#  web3 wiring 

def _build_w3(network: str, deployments: Optional[Dict]):
    try:
        from web3 import Web3
    except ImportError:
        return None, None

    rpc = X_LAYER_RPC
    if deployments:
        rpc = deployments.get("rpc") or rpc
    w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 15}))
    try:
        from web3.middleware import ExtraDataToPOAMiddleware
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    except Exception:
        pass

    abis = _embed_abi()
    if not w3.is_connected():
        return None, None
    if not deployments or not deployments.get("factory"):
        return w3, None
    factory = w3.eth.contract(address=deployments["factory"], abi=abis["factory"])
    return w3, factory


def strategy_hash(allocations: List[Dict]) -> bytes:
    payload = json.dumps([{"a": a["asset"], "pct": a["percentage"]} for a in allocations], sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


# user profile

@dataclass
class UserProfile:
    address: str
    age: int = 30
    risk_tolerance: int = 50
    preferred_assets: List[str] = None
    monthly_income: float = 2000.0
    retirement_age: int = 65

    def __post_init__(self):
        self.preferred_assets = self.preferred_assets or []

    def as_dict(self) -> Dict:
        return asdict(self)


#  LLM interface 

class PENSAgent:
    def __init__(self, network: str = "dev"):
        self.network = network
        self.deployments = load_deployments(network)
        self.w3, self.factory = _build_w3(network, self.deployments)
        self.simulation = self.factory is None
        self.session = requests.Session()
        if HF_KEY:
            self.session.headers.update({"Authorization": f"Bearer {HF_KEY}"})

    #  public API 
    def analyze_user_profile(self, user_data: Dict) -> UserProfile:
        prompt = (
            "You are PENSA, a pension advisor for gig-economy workers. "
            "Given this profile, reply with JSON only: "
            '{"allocation_percent": 3-10, "risk_tolerance": 0-100, "note": "one sentence"}. '
            f"Profile: {json.dumps(user_data)}"
        )
        raw = self._query_ai(prompt)
        parsed = self._safe_json(raw)
        base = UserProfile(
            address=user_data["address"],
            age=int(user_data.get("age", 30)),
            risk_tolerance=int(parsed.get("risk_tolerance", user_data.get("risk_tolerance", 50))),
            preferred_assets=user_data.get("preferred_assets", []),
            monthly_income=float(user_data.get("monthly_income", 2000)),
            retirement_age=int(user_data.get("retirement_age", 65)),
        )
        return base

    def optimize_portfolio(self, profile: UserProfile, market: Optional[Dict] = None) -> List[Dict]:
        market = market or get_market_snapshot()
        base = optimize(profile.risk_tolerance, market)
        prompt = (
            "You are PENSA's portfolio optimizer. Given this user and these candidate "
            f"allocations ({json.dumps(base)}), adjust within reason. Reply with JSON only: "
            '{"allocations": [{"asset": "USDC", "category": "stable", "percentage": 40}]}'
            "Percentages must sum to 100. Do not invent assets not listed."
        )
        raw = self._query_ai(prompt)
        parsed = self._safe_json(raw)
        llm_allocations = parsed.get("allocations")
        if isinstance(llm_allocations, list) and llm_allocations:
            final = self._sanitize_allocations(llm_allocations, market)
        else:
            final = base
        return final

    def rebalance_signal(self, current: Dict, target: List[Dict]) -> Dict:
        current_total = float(current.get("totalValue", 0))
        desired = {}
        for a in target:
            desired[a["asset"]] = current_total * float(a["percentage"]) / 100.0
        held = current.get("holdings", {})
        actions = {"sell": [], "buy": [], "hold": [], "estimated_gas_okb": 0.0003}
        for asset, target_usd in desired.items():
            diff = target_usd - float(held.get(asset, 0))
            if diff > 0:
                actions["buy"].append({"asset": asset, "usd": round(diff, 2)})
            elif diff < 0:
                actions["sell"].append({"asset": asset, "usd": round(-diff, 2)})
            else:
                actions["hold"].append(asset)
        return actions

    # -- on-chain 
    def execute_strategy(self, user: str, allocations: List[Dict], dry_run: bool = False) -> Dict:
        if self.simulation or dry_run:
            return {
                "status": "simulated",
                "user": user,
                "strategy_hash": strategy_hash(allocations),
                "allocations": allocations,
                "note": "dry-run — no transaction sent" if dry_run else "simulation — no RPC/factory configured",
            }
        if not AGENT_KEY:
            raise RuntimeError(
                "AGENT_PRIVATE_KEY not set. Either run with --dry-run, or set it in .env "
                "for real execution on X Layer."
            )
        acct = self.w3.eth.account.from_key(AGENT_KEY)
        h = "0x" + strategy_hash(allocations)
        tx = self.factory.functions.updateStrategy(h).build_transaction({
            "from": acct.address,
            "gas": 200000,
            "gasPrice": self.w3.eth.gas_price,
            "nonce": self.w3.eth.get_transaction_count(acct.address),
        })
        signed = acct.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return {"status": "submitted", "user": user, "strategy_hash": h, "tx_hash": tx_hash.hex(), "receipt": str(receipt["transactionHash"])}

    def record_returns(self, user: str, amount: int, dry_run: bool = False) -> Dict:
        if self.simulation or dry_run:
            return {"status": "simulated", "user": user, "returns": amount}
        if not AGENT_KEY:
            raise RuntimeError("AGENT_PRIVATE_KEY not set")
        acct = self.w3.eth.account.from_key(AGENT_KEY)
        tx = self.factory.functions.recordReturns(user, amount).build_transaction({
            "from": acct.address, "gas": 120000,
            "gasPrice": self.w3.eth.gas_price,
            "nonce": self.w3.eth.get_transaction_count(acct.address),
        })
        signed = acct.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return {"status": "submitted", "user": user, "returns": amount, "tx_hash": tx_hash.hex()}

    def list_vaults(self) -> List[str]:
        if self.simulation:
            return []
        try:
            return list(self.factory.functions.getVaults().call())
        except Exception:
            return []

    def vault_snapshot(self, vault: str) -> Dict:
        if self.simulation:
            return {"simulated": True, "vault": vault}
        try:
            abis = _embed_abi()
            v = self.w3.eth.contract(address=vault, abi=abis["vault"])
            user = v.functions.user().call()
            total = v.functions.getTotalValue().call()
            strategy = v.functions.currentStrategyHash().call().hex()
            alloc = v.functions.allocationPercent().call()
            return {
                "vault": vault, "user": user,
                "totalValue": total, "allocationPercent": alloc,
                "strategyHash": "0x" + strategy,
            }
        except Exception as exc:
            return {"vault": vault, "error": str(exc)}

    # internals 
    def _query_ai(self, prompt: str) -> str:
        if not HF_KEY:
            return self._fallback(prompt)
        try:
            resp = self.session.post(
                f"https://api-inference.huggingface.co/models/{HF_MODEL}",
                json={"inputs": prompt, "parameters": {"max_new_tokens": 300, "temperature": 0.3, "return_full_text": False}},
                timeout=60,
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and data:
                    return str(data[0].get("generated_text", ""))
                if isinstance(data, dict) and data.get("error"):
                    print(f"[AI] rate limited: {data['error']}")
            else:
                print(f"[AI] HTTP {resp.status_code} — using fallback")
        except Exception as exc:
            print(f"[AI] error {exc} — using fallback")
        time.sleep(min(AI_FALLBACK_SLEEP, 30))
        return self._fallback(prompt)

    @staticmethod
    def _fallback(prompt: str) -> str:
        # Rule-based: produces the same JSON schema the LLM would.
        return json.dumps({
            "allocation_percent": 3,
            "risk_tolerance": 50,
            "note": "deterministic fallback portfolio",
            "allocations": [
                {"asset": "USDC", "category": "stable", "percentage": 50},
                {"asset": "USDT", "category": "stable", "percentage": 30},
                {"asset": "TBILL", "category": "rwa", "percentage": 20},
            ],
        })

    @staticmethod
    def _safe_json(raw: str) -> Dict:
        raw = raw.strip()
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1:
            return {}
        try:
            return json.loads(raw[start:end + 1])
        except Exception:
            return {}

    @staticmethod
    def _sanitize_allocations(allocations: List[Dict], market: Dict) -> List[Dict]:
        known: Dict[str, Dict] = {}
        for key in ("rwa_yields", "defi_yields", "stable_rates"):
            for p in market.get(key, []):
                known.setdefault(p["asset"], p)
        out = []
        for a in allocations:
            asset = str(a.get("asset", "")).upper()
            try:
                pct = float(a.get("percentage", 0))
            except (TypeError, ValueError):
                pct = 0.0
            if not asset or pct <= 0:
                continue
            cat = a.get("category", "defi")
            pool = known.get(asset, {})
            out.append({
                "asset": asset,
                "category": cat,
                "percentage": round(pct, 2),
                "apy": round(float(pool.get("apy") or 0.0), 2),
                "project": pool.get("project"),
                "pool": pool.get("pool"),
            })
        total = sum(x["percentage"] for x in out)
        if total <= 0:
            return [
                {"asset": "USDC", "category": "stable", "percentage": 50, "apy": 3.5, "project": "stable", "pool": "baseline"},
                {"asset": "USDT", "category": "stable", "percentage": 30, "apy": 3.3, "project": "stable", "pool": "baseline"},
                {"asset": "TBILL", "category": "rwa", "percentage": 20, "apy": 4.9, "project": "tbill", "pool": "baseline"},
            ]
        for x in out:
            x["percentage"] = round(x["percentage"] * 100.0 / total, 2)
        out[0]["percentage"] = round(out[0]["percentage"] + (100.0 - sum(x["percentage"] for x in out)), 2)
        return out


#  CLI

def _profile_arg(agent: PENSAgent, user: str) -> Dict:
    return {"address": user, "age": 30, "monthly_income": 2000, "risk_tolerance": 50, "retirement_age": 65}


def cmd_profile(agent: PENSAgent, args) -> int:
    user = args.user
    profile = agent.analyze_user_profile(_profile_arg(agent, user))
    print(json.dumps(profile.as_dict(), indent=2))
    return 0


def cmd_optimize(agent: PENSAgent, args) -> int:
    user = args.user
    profile = agent.analyze_user_profile(_profile_arg(agent, user))
    if args.risk is not None:
        profile.risk_tolerance = int(args.risk)
    market = get_market_snapshot()
    allocs = agent.optimize_portfolio(profile, market)
    risk = compute_risk_score(profile.risk_tolerance, allocs, get_volatility([a["asset"] for a in allocs]))
    print(json.dumps({
        "user": user,
        "risk_tolerance": profile.risk_tolerance,
        "risk": risk,
        "expected_apr": expected_apr(allocs),
        "allocations": allocs,
    }, indent=2))
    return 0


def cmd_strategy(agent: PENSAgent, args) -> int:
    user = args.user
    profile = agent.analyze_user_profile(_profile_arg(agent, user))
    market = get_market_snapshot()
    allocs = agent.optimize_portfolio(profile, market)
    result = agent.execute_strategy(user, allocs, dry_run=args.dry_run)
    print(json.dumps(result, indent=2))
    return 0


def cmd_run(agent: PENSAgent, args) -> int:
    mode = "simulation" if agent.simulation else args.network
    print(f"[PENSA] agent online — network={mode} dry_run={args.dry_run}")
    first = True
    while first or args.loop:
        first = False
        vaults = agent.list_vaults()
        if not vaults:
            print("[PENSA] no vaults found (deploy + seed first, or use simulation data).")
            if not args.loop:
                return 0
            time.sleep(30)
            continue
        for v in vaults:
            snap = agent.vault_snapshot(v)
            print(f"[PENSA] vault {v}: {snap}")
        if not args.loop:
            return 0
        time.sleep(int(os.getenv("AGENT_POLL_SECONDS", "3600")))


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(prog="pensa-agent")
    parser.add_argument("--network", default="dev", help="dev|localhost|xlayerTestnet|xlayer")
    parser.add_argument("--dry-run", action="store_true", help="never broadcast transactions")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("profile")
    p.add_argument("--user", required=True)
    p.set_defaults(fn=cmd_profile)

    p = sub.add_parser("optimize")
    p.add_argument("--user", required=True)
    p.add_argument("--risk", type=int, default=None)
    p.set_defaults(fn=cmd_optimize)

    p = sub.add_parser("strategy")
    p.add_argument("--user", required=True)
    p.set_defaults(fn=cmd_strategy)

    p = sub.add_parser("run")
    p.add_argument("--loop", action="store_true")
    p.set_defaults(fn=cmd_run)

    args = parser.parse_args(argv)
    agent = PENSAgent(args.network)
    return args.fn(agent, args)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
