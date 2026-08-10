"""PENSA market data — free sources only.

- DefiLlama Yields API (https://yields.llama.fi) for live APY / TVL across DeFi
  and RWA (real-world asset) pools. No API key required.
- CoinGecko public API for token prices / 24h volatility. No key required.
Every source degrades gracefully: if a network call fails we return the last
good snapshot (or conservative defaults) so the agent never crashes.
"""
from __future__ import annotations

import os
import time
import logging
from functools import lru_cache
from typing import Dict, List

import requests

log = logging.getLogger("pensa.market")

YIELDS_URL = "https://yields.llama.fi/pools"
COINGECKO_URL = "https://api.coingecko.com/api/v3"

# Projects on DefiLlama that are real-world-asset treasuries / stablecoin funds.
RWA_PROJECTS = {
    "ondo-finance", "ondo", "open-eden", "centrifuge", "backed", "truefi",
    "maple", "tbill", "stable", "mountain-protocol", "usdy", "usdf",
    "superstate", "matrixdock", "franklin-templeton", "figment", "usreal",
}

# Projects treated as DeFi yield (lending + LPs).
DEFI_PROJECTS = {
    "aave", "compound", "spark", "morpho", "benqi", "radiant", "venus",
    "unichain", "uniswap", "curve", "balancer", "pendle", "euler", "fluid",
    "beefy", "convex", "yearn",
}

STABLE_SYMBOLS = {"USDC", "USDT", "DAI", "USDe", "USDE", "FDUSD", "PYUSD", "LUSD", "FRAX"}

_CACHE_TTL = 15 * 60  # seconds
_cache: Dict[str, tuple] = {}


def _cached(key: str, ttl: int = _CACHE_TTL):
    def deco(fn):
        def wrapper(*a, **kw):
            now = time.time()
            hit = _cache.get(key)
            if hit and now - hit[0] < ttl:
                return hit[1]
            try:
                value = fn(*a, **kw)
                _cache[key] = (now, value)
                return value
            except Exception as exc:  # degrade, don't crash
                log.warning("market data source %s failed: %s", key, exc)
                if hit:
                    return hit[1]
                return fn.__defaults__[0] if getattr(fn, "__defaults__", None) else None
        return wrapper
    return deco


def _session() -> requests.Session:
    s = requests.Session()
    s.headers["User-Agent"] = "PENSA-agent/1.0 (BuildX AI Season)"
    key = os.getenv("COINGECKO_API_KEY")
    if key:
        s.headers["x-cg-demo-api-key"] = key
    return s


def _apy(pool: dict) -> float:
    return float(pool.get("apy") or 0.0)


def _tvl(pool: dict) -> float:
    return float(pool.get("tvlUsd") or 0.0)


def _classify(pool: dict) -> str:
    project = (pool.get("project") or "").lower()
    symbol = (pool.get("symbol") or "").upper()
    if project in RWA_PROJECTS or "rwa" in project:
        return "rwa"
    if project in DEFI_PROJECTS:
        return "defi"
    if symbol in STABLE_SYMBOLS and _tvl(pool) > 1_000_000:
        return "stable"
    return "defi"


@_cached("yields")
def fetch_yields() -> List[dict]:
    """Live pool yields from DefiLlama (free, no key)."""
    resp = _session().get(YIELDS_URL, timeout=20)
    resp.raise_for_status()
    pools = resp.json().get("data", [])
    if not isinstance(pools, list):
        return []
    out = []
    for p in pools:
        if _tvl(p) < 500_000:
            continue
        cat = _classify(p)
        out.append({
            "asset": p.get("symbol"),
            "project": p.get("project"),
            "chain": p.get("chain"),
            "apy": _apy(p),
            "tvlUsd": _tvl(p),
            "category": cat,
            "pool": p.get("pool"),
        })
    return out


def get_market_snapshot() -> Dict:
    """Aggregated, per-category market data used by the optimizer."""
    pools = fetch_yields() or []
    snapshot = {"rwa_yields": [], "defi_yields": [], "stable_rates": [], "timestamp": time.time()}

    for p in pools:
        cat = p["category"]
        target = {
            "rwa": "rwa_yields",
            "defi": "defi_yields",
            "stable": "stable_rates",
        }[cat]
        snapshot[target].append(p)

    # If live data is empty (offline), provide conservative baseline rates.
    if not pools:
        snapshot = {
            "rwa_yields": [
                {"asset": "TBILL", "project": "tbill", "chain": "Ethereum", "apy": 4.9, "tvlUsd": 1e9, "category": "rwa", "pool": "baseline"},
                {"asset": "USDY", "project": "ondo-finance", "chain": "Ethereum", "apy": 4.7, "tvlUsd": 5e8, "category": "rwa", "pool": "baseline"},
            ],
            "defi_yields": [
                {"asset": "USDC", "project": "aave", "chain": "Ethereum", "apy": 5.2, "tvlUsd": 2e9, "category": "defi", "pool": "baseline"},
                {"asset": "USDC", "project": "compound", "chain": "Ethereum", "apy": 4.1, "tvlUsd": 1.2e9, "category": "defi", "pool": "baseline"},
            ],
            "stable_rates": [
                {"asset": "USDC", "project": "stable", "chain": "Ethereum", "apy": 3.5, "tvlUsd": 1e9, "category": "stable", "pool": "baseline"},
                {"asset": "USDT", "project": "stable", "chain": "Ethereum", "apy": 3.3, "tvlUsd": 8e8, "category": "stable", "pool": "baseline"},
            ],
            "timestamp": time.time(),
            "is_fallback": True,
        }
    return snapshot


def _price_change_24h(symbol: str) -> float:
    """Annualized volatility proxy from 24h price change (0..100)."""
    try:
        url = f"{COINGECKO_URL}/coins/markets"
        resp = _session().get(url, params={
            "vs_currency": "usd", "ids": symbol, "per_page": 1, "page": 1
        }, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data and "price_change_percentage_24h" in data[0]:
            return abs(float(data[0]["price_change_percentage_24h"]))
    except Exception as exc:
        log.warning("coingecko vol failed for %s: %s", symbol, exc)
    return 0.0


@_cached("prices")
def get_prices(coins: List[str]) -> Dict[str, float]:
    """Spot USD prices for a list of CoinGecko ids (best-effort)."""
    if not coins:
        return {}
    try:
        resp = _session().get(f"{COINGECKO_URL}/simple/price", params={
            "ids": ",".join(coins), "vs_currencies": "usd"
        }, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return {k: float(v["usd"]) for k, v in data.items() if isinstance(v, dict)}
    except Exception as exc:
        log.warning("coingecko prices failed: %s", exc)
        return {}


def get_volatility(coins: List[str]) -> Dict[str, float]:
    """Volatility proxy (24h abs % change) for a list of CoinGecko ids."""
    out = {}
    for c in coins:
        out[c] = _price_change_24h(c)
    return out
