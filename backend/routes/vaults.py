"""Vault routes — create, inspect, and configure pension vaults."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models import CreateVaultRequest, UpdateAllocationRequest
from ..utils.xlayer_client import CLIENT

router = APIRouter(prefix="/vaults", tags=["vaults"])


@router.get("")
def list_vaults():
    return {"vaults": CLIENT.list_vaults()}


@router.get("/{user}")
def get_vault(user: str):
    vault = CLIENT.get_vault(user)
    if vault is None:
        raise HTTPException(status_code=404, detail="No vault found for this address")
    return vault


@router.post("", status_code=201)
def create_vault(body: CreateVaultRequest):
    return CLIENT.create_vault(
        body.user,
        body.allocationPercent,
        body.riskTolerance,
        body.preferredAssets,
    )


@router.patch("/{user}/allocation")
def update_allocation(user: str, body: UpdateAllocationRequest):
    result = CLIENT.update_allocation(user, body.allocationPercent)
    if result is None:
        raise HTTPException(status_code=404, detail="No vault found for this address")
    return result


@router.post("/{user}/returns")
def record_returns(user: str, amount: float):
    return CLIENT.record_returns(user, amount)
