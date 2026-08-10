"""PENSA portfolio optimizer.

Deterministic risk-based allocation engine. Given a user's risk tolerance
(0-100) and a live market snapshot, it returns concrete asset allocations
that sum to 100%.

The LLM layer can adjust these with natural-language reasoning; this module
is the source of truth when the model is unreachable (HF rate limits, offline).
"""
from __future__ import annotations

from typing import Dict, List


# Category weights interpolated by risk tolerance.
# (conservative) ... (aggressive)
CATEGORY_SPLITS = {
    "rwa": (0.50, 0.20),
    "stable": (0.35, 0.15),
    "defi": (0.15, 0.65),
}


def _pick_best(pools: List[Dict], n: int = 2) -> List[Dict]:
    """Pick top pools by APY weighted by TVL (quality filter: high TVL = safer)."""
    if not pools:
        return []
    scored = sorted(
        pools,
        key=lambda p: float(p["apy"]) * (0.7 + 0.3 * min(1.0, float(p["tvlUsd"]) / 1e8)),
        reverse=True,
    )
    return scored[:n]


def optimize(user_risk: int, market: Dict) -> List[Dict]:
    """Return allocations: [{asset, project, category, percentage, apy, pool}]."""
    risk = max(0, min(100, user_risk))
    t = risk / 100.0  # 0 = conservative, 1 = aggressive

    allocations: List[Dict] = []
    for cat, (lo, hi) in CATEGORY_SPLITS.items():
        cat_pct = lo + (hi - lo) * t
        key = {"rwa": "rwa_yields", "defi": "defi_yields", "stable": "stable_rates"}[cat]
        pools = market.get(key, [])
        picks = _pick_best(pools)
        if not picks:
            continue
        # Distribute the category's total across its top pools.
        weights = [1.0 / len(picks)] * len(picks)
        for p, w in zip(picks, weights):
            allocations.append({
                "asset": p["asset"],
                "project": p.get("project"),
                "category": cat,
                "percentage": round(cat_pct * w * 100, 2),
                "apy": round(float(p.get("apy") or 0.0), 2),
                "pool": p.get("pool"),
            })

    # Renormalise to exactly 100%.
    total = sum(a["percentage"] for a in allocations)
    if total > 0:
        for a in allocations:
            a["percentage"] = round(a["percentage"] * 100.0 / total, 2)
        # Fix rounding drift on the largest item.
        drift = round(100.0 - sum(a["percentage"] for a in allocations), 2)
        if drift:
            allocations[0]["percentage"] = round(allocations[0]["percentage"] + drift, 2)

    return allocations


def expected_apr(allocations: List[Dict]) -> float:
    """Weighted average APR of an allocation set."""
    return round(sum(float(a["apy"]) * float(a["percentage"]) / 100.0 for a in allocations), 2)
