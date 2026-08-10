"""PENSA risk analysis.

Produces a 0-100 risk score by blending:
  1. the user's stated tolerance (from profile creation),
  2. the live volatility of the assets the optimizer selected,
  3. concentration risk (how many assets / categories the portfolio holds).

No external model required — deterministic and cheap, used both as a
pre-filter for the LLM and as the offline fallback.
"""
from __future__ import annotations

import math
from typing import Dict, List

LEVELS = {
    (0, 30): ("conservative", "Capital preservation first — treasuries & stable yields."),
    (30, 60): ("balanced", "Stable core with moderate DeFi yield participation."),
    (60, 100): ("aggressive", "Higher DeFi & RWA upside, accepts drawdown risk."),
}


def label_for(score: int) -> tuple:
    for (lo, hi), v in LEVELS.items():
        if lo <= score < hi:
            return v
    return LEVELS[(60, 100)]


def compute_risk_score(
    user_risk: int,
    allocations: List[Dict],
    volatility: Dict[str, float] | None = None,
) -> Dict:
    """Returns { score, level, note, breakdown } with score in 0..100."""
    volatility = volatility or {}
    clamp = lambda v, lo=0, hi=100: max(lo, min(hi, v))

    # 1) Stated tolerance — 50% weight.
    tol_component = user_risk * 0.5

    # 2) Weighted portfolio volatility — 35% weight.
    vol_weighted = 0.0
    for a in allocations:
        sym = a.get("asset", "")
        vol = volatility.get(sym, 4.0)  # default ~stable asset vol
        pct = float(a.get("percentage", 0)) / 100.0
        vol_weighted += vol * pct
    vol_component = clamp(vol_weighted * 3.5)  # scale into 0..100 space

    # 3) Concentration — 15% weight. Fewer holdings -> more risk.
    count = len(allocations)
    concentration = 0 if count == 0 else max(0.0, (10 - count) * 10)
    concentration_component = clamp(concentration)

    score = clamp(round(tol_component + vol_component + concentration_component))
    level, note = label_for(score)

    return {
        "score": score,
        "level": level,
        "note": note,
        "breakdown": {
            "stated_tolerance": round(tol_component, 1),
            "portfolio_volatility": round(vol_component, 1),
            "concentration": round(concentration_component, 1),
        },
    }
