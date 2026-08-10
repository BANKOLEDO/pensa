"""PENSA FastAPI backend.

Run for dev (simulation, zero config):
    uvicorn backend.server:app --reload --port 8000

Run against X Layer (staging/prod): set APP_ENV, RPC and keys in .env first.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import payments, strategies, vaults
from .utils.xlayer_client import CLIENT

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("pensa")

settings = get_settings()


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
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=False,
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
def system_config():
    return CLIENT.system_config()


@app.get("/", tags=["system"])
def root():
    return {
        "service": "PENSA API",
        "docs": "/docs",
        "health": "/health",
        "env": settings.app_env,
        "simulated": settings.is_simulation,
    }
