"""PENSA FastAPI backend.

Run for dev (simulation, zero config):
    uvicorn backend.server:app --reload --port 8000

Run against X Layer (staging/prod): set APP_ENV, RPC and keys in .env first.

When a production build of the frontend exists at frontend/dist this process
also serves the SPA (same origin), so a single public URL is enough for the
whole product. Disable with SERVE_SPA=0.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .routes import payments, strategies, vaults
from .utils.xlayer_client import CLIENT

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("pensa")

settings = get_settings()

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
SERVE_SPA = settings.app_env != "dev" and os.getenv("SERVE_SPA", "1") != "0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    mode = "SIMULATION (dev, no chain)" if settings.is_simulation else f"{settings.app_env} on chain {settings.chain_id}"
    log.info("PENSA backend starting — mode: %s", mode)
    yield
    log.info("PENSA backend stopped")


app = FastAPI(
    title="PENSA API",
    description="AI-managed micro-pension for gig workers on OKX X Layer",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vaults.router)
app.include_router(payments.router)
app.include_router(strategies.router)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "pensa-backend", "env": settings.app_env}


@app.get("/system/config", tags=["system"])
def system_config(network: Optional[str] = Query(None, description="testnet | mainnet")):
    return CLIENT.system_config(network)


if SERVE_SPA and FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    index = FRONTEND_DIST / "index.html"

    @app.get("/", include_in_schema=False)
    def spa_index():
        return FileResponse(index)

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        # Serve the built SPA for deep links (react-router history routing);
        # every API route is registered above and wins this catch-all.
        candidate = (FRONTEND_DIST / full_path).resolve()
        if candidate.exists() and candidate.is_file() and full_path not in {"health"}:
            return FileResponse(candidate)
        return FileResponse(index)


@app.get("/", tags=["system"], include_in_schema=False)
def root():
    return {
        "service": "PENSA API",
        "docs": "/docs",
        "health": "/health",
        "env": settings.app_env,
        "simulated": settings.is_simulation,
    }
