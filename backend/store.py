"""In-memory simulation store used in dev mode (APP_ENV=dev).

Gives the frontend, bot, and AI agent a complete, realistic dataset without
any RPC connection, wallet, or gas. Every mutation mirrors what the contracts
would do on-chain so dev/prod behaviour stays in sync.
"""
from __future__ import annotations

import hashlib
import time
from typing import Dict, List, Optional

# ---- demo identities ---------------------------------------------------------
DEMO_USERS = [
    {"address": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "name": "Maya Chen", "age": 28, "monthly_income": 2400, "risk": 40, "retirement_age": 62},
    {"address": "0xB0B5B4E9c6fB4f1F8fB0B1B2B3B4B5B6B7B8B9BA", "name": "David Okafor", "age": 41, "monthly_income": 1800, "risk": 70, "retirement_age": 65},
    {"address": "0x1111111111111111111111111111111111111111", "name": "Sara Lindqvist", "age": 33, "monthly_income": 3100, "risk": 25, "retirement_age": 63},
]

DEMO_ASSETS = {
    "USDC": {"symbol": "USDC", "name": "USD Coin", "category": "stable", "price_usd": 1.0, "apy": 3.5},
    "USDT": {"symbol": "USDT", "name": "Tether", "category": "stable", "price_usd": 1.0, "apy": 3.3},
    "TBILL": {"symbol": "TBILL", "name": "US Treasury Bills (tokenized)", "category": "rwa", "price_usd": 1.0, "apy": 4.9},
    "USDY": {"symbol": "USDY", "name": "Ondo US Dollar Yield", "category": "rwa", "price_usd": 1.0, "apy": 4.7},
    "AAVE-USDC": {"symbol": "AAVE-USDC", "name": "Aave USDC Lending", "category": "defi", "price_usd": 1.0, "apy": 5.2},
}


class Store:
    def __init__(self):
        self.vaults: Dict[str, dict] = {}
        self._seed()

    # ---- helpers ------------------------------------------------------------
    @staticmethod
    def _deterministic_address(user: str, salt: str) -> str:
        h = hashlib.sha256(f"{user}:{salt}".encode()).hexdigest()
        return "0x" + h[:40]

    # ---- lifecycle ----------------------------------------------------------
    def _seed(self) -> None:
        for i, u in enumerate(DEMO_USERS):
            vault_addr = self._deterministic_address(u["address"], "vault")
            base = 800.0 + i * 340.0
            self.vaults[u["address"].lower()] = {
                "user": u["address"],
                "name": u["name"],
                "vault": vault_addr,
                "allocationPercent": 300,
                "riskTolerance": u["risk"],
                "preferredAssets": ["USDC", "TBILL", "USDY"],
                "holdings": {
                    "USDC": {"amount": round(base * 0.5, 2), "apy": 3.5},
                    "TBILL": {"amount": round(base * 0.3, 2), "apy": 4.9},
                    "AAVE-USDC": {"amount": round(base * 0.2, 2), "apy": 5.2},
                },
                "totalDeposited": round(base * 0.97, 2),
                "totalReturns": round(base * 0.03, 2),
                "strategyHash": "0x" + self._deterministic_address(u["address"], "strat")[:64],
                "lastStrategyUpdate": time.time() - 3600,
                "createdAt": time.time() - 90 * 86400,
                "simulated": True,
            }

    def list_vaults(self) -> List[dict]:
        return [self.summary(v) for v in self.vaults.values()]

    def summary(self, v: dict) -> dict:
        holdings_usd = {k: round(float(h["amount"]) * DEMO_ASSETS.get(k, {}).get("price_usd", 1.0), 2)
                        for k, h in v["holdings"].items()}
        total = round(sum(holdings_usd.values()), 2)
        deposited = v["totalDeposited"]
        returns = v["totalReturns"]
        growth = round((returns / deposited * 100.0) if deposited else 0.0, 2)
        return {
            "user": v["user"],
            "name": v["name"],
            "vault": v["vault"],
            "allocationPercent": v["allocationPercent"],
            "riskTolerance": v["riskTolerance"],
            "holdings": holdings_usd,
            "totalValue": total,
            "totalDeposited": deposited,
            "totalReturns": returns,
            "growthPct": growth,
            "strategyHash": v["strategyHash"],
            "simulated": v["simulated"],
        }

    # ---- mutations ----------------------------------------------------------
    def create_vault(self, user: str, allocation_percent: int, risk_tolerance: int, preferred: List[str]) -> dict:
        key = user.lower()
        if key in self.vaults:
            return self.summary(self.vaults[key])
        vault_addr = self._deterministic_address(user, "vault")
        self.vaults[key] = {
            "user": user,
            "name": f"Vault {user[:6]}",
            "vault": vault_addr,
            "allocationPercent": allocation_percent,
            "riskTolerance": risk_tolerance,
            "preferredAssets": preferred or ["USDC", "TBILL", "USDY"],
            "holdings": {"USDC": {"amount": 0.0, "apy": 3.5}},
            "totalDeposited": 0.0,
            "totalReturns": 0.0,
            "strategyHash": "0x" + "0" * 64,
            "lastStrategyUpdate": time.time(),
            "createdAt": time.time(),
            "simulated": True,
        }
        return self.summary(self.vaults[key])

    def get_vault(self, user: str) -> Optional[dict]:
        v = self.vaults.get(user.lower())
        return self.summary(v) if v else None

    def update_allocation(self, user: str, percent: int) -> Optional[dict]:
        v = self.vaults.get(user.lower())
        if not v:
            return None
        v["allocationPercent"] = max(0, min(1000, percent))
        return self.summary(v)

    def forward_payment(self, user: str, asset: str, amount: float) -> Optional[dict]:
        """Simulates an incoming payment; moves allocationPercent of it into the vault."""
        v = self.vaults.get(user.lower())
        if not v:
            return None
        alloc_pct = v["allocationPercent"]
        captured = round(amount * alloc_pct / 10000.0, 6)
        v["holdings"].setdefault(asset, {"amount": 0.0, "apy": DEMO_ASSETS.get(asset, {}).get("apy", 0.0)})
        v["holdings"][asset]["amount"] = round(v["holdings"][asset]["amount"] + captured, 6)
        v["totalDeposited"] = round(v["totalDeposited"] + captured, 6)
        return {"user": user, "asset": asset, "paymentAmount": amount, "captured": captured}

    def record_returns(self, user: str, amount: float) -> Optional[dict]:
        v = self.vaults.get(user.lower())
        if not v:
            return None
        v["totalReturns"] = round(v["totalReturns"] + amount, 6)
        return {"user": user, "returns": amount}

    def set_strategy(self, user: str, strategy_hash: str) -> Optional[dict]:
        v = self.vaults.get(user.lower())
        if not v:
            return None
        v["strategyHash"] = strategy_hash
        v["lastStrategyUpdate"] = time.time()
        return self.summary(v)


STORE = Store()
