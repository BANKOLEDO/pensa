"""Vault routes — create, inspect, and configure pension vaults."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ..models import CreateVaultRequest, UpdateAllocationRequest
from ..utils.xlayer_client import CLIENT

router = APIRouter(prefix="/vaults", tags=["vaults"])


@router.get("")
def list_vaults(network: Optional[str] = Query(None, description="testnet | mainnet")):
    return {"vaults": CLIENT.list_vaults(network)}


@router.get("/{user}")
def get_vault(user: str, network: Optional[str] = Query(None, description="testnet | mainnet")):
    vault = CLIENT.get_vault(user, network)
    if vault is None:
        raise HTTPException(status_code=404, detail="No vault found for this address")
    return vault


@router.post("", status_code=201)
def create_vault(body: CreateVaultRequest, network: Optional[str] = Query(None, description="testnet | mainnet")):
    return CLIENT.create_vault(
        body.user,
        body.allocationPercent,
        body.riskTolerance,
        body.preferredAssets,
        network,
    )


@router.patch("/{user}/allocation")
def update_allocation(user: str, body: UpdateAllocationRequest, network: Optional[str] = Query(None, description="testnet | mainnet")):
    result = CLIENT.update_allocation(user, body.allocationPercent, network)
    if result is None:
        raise HTTPException(status_code=404, detail="No vault found for this address")
    return result


@router.post("/{user}/returns")
def record_returns(user: str, amount: float, network: Optional[str] = Query(None, description="testnet | mainnet")):
    return CLIENT.record_returns(user, amount, network)
