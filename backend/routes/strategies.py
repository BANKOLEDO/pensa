"""Strategy routes — AI-driven recommendation and on-chain application."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..models import ApplyStrategyRequest, RecommendRequest
from ..utils.xlayer_client import CLIENT

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "ai-agent"))

router = APIRouter(prefix="/strategies", tags=["strategies"])


def _run_optimization(body: RecommendRequest) -> dict:
    from agent import PENSAgent
    from portfolio_optimizer import expected_apr
    from risk_analyzer import compute_risk_score
    from market_data import get_market_snapshot, get_volatility

    agent = PENSAgent("dev" if CLIENT.is_simulation else "xlayer")
    profile = agent.analyze_user_profile({
        "address": body.user,
        "age": body.age,
        "monthly_income": body.monthly_income,
        "risk_tolerance": body.riskTolerance,
        "retirement_age": body.retirement_age,
        "preferred_assets": body.preferred_assets,
    })
    market = get_market_snapshot()
    allocations = agent.optimize_portfolio(profile, market)
    risk = compute_risk_score(profile.risk_tolerance, allocations, get_volatility([a["asset"] for a in allocations]))
    return {
        "user": body.user,
        "profile": profile.as_dict(),
        "market": {
            "is_fallback": market.get("is_fallback", False),
            "rwa_count": len(market.get("rwa_yields", [])),
            "defi_count": len(market.get("defi_yields", [])),
            "stable_count": len(market.get("stable_rates", [])),
        },
        "risk": risk,
        "expectedApr": expected_apr(allocations),
        "allocations": allocations,
    }


def _hash_allocations(allocations: list) -> str:
    payload = json.dumps([{"a": a["asset"], "pct": a["percentage"]} for a in allocations], sort_keys=True)
    return "0x" + hashlib.sha256(payload.encode()).hexdigest()


@router.post("/recommend")
def recommend(body: RecommendRequest):
    return _run_optimization(body)


@router.get("/{user}")
def current_strategy(user: str):
    vault = CLIENT.get_vault(user)
    if vault is None:
        raise HTTPException(status_code=404, detail="No vault found for this address")
    return {
        "user": user,
        "strategyHash": vault.get("strategyHash"),
        "lastUpdate": vault.get("lastStrategyUpdate"),
        "simulated": vault.get("simulated", False),
    }


@router.post("/apply")
def apply_strategy(body: ApplyStrategyRequest):
    """Compute the AI recommendation and store its hash on the vault."""
    recommend_body = RecommendRequest(
        user=body.user,
        riskTolerance=body.riskTolerance if body.riskTolerance is not None else 50,
    )
    result = _run_optimization(recommend_body)
    strategy_hash = _hash_allocations(result["allocations"])
    outcome = CLIENT.set_strategy(body.user, strategy_hash)
    if outcome is None:
        raise HTTPException(status_code=404, detail="No vault found for this address")
    return {**result, "strategyHash": strategy_hash, "applied": outcome}
