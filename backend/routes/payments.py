"""Payment routes — auto-allocation of incoming gig payouts + x402 rail."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ..models import ForwardPaymentRequest, X402PaymentRequest
from ..config import get_settings
from ..utils.auth import require_admin
from ..utils.x402_handler import (
    EXPECT_HEADER, SEND_HEADER, SIGNATURE_HEADER, build_meta, build_payment_url,
    parse_payment, verify_payment,
)
from ..utils.xlayer_client import CLIENT

router = APIRouter(prefix="/payments", tags=["payments"])

# Canonical USDC on X Layer (mainnet: 0x74b7f163...; testnet chain 1952: 0xDec90b781...). See scripts/_tokens.js.
USDC_ON_XLAYER = {
    196: "0x74b7f16337b8972027f6196a17a631ac6de26f22",
    1952: "0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3",
}


def _chain_id_for(network: Optional[str]) -> int:
    settings = get_settings()
    if network == "mainnet":
        return 196
    if network == "testnet":
        return 1952
    return settings.effective_chain_id


def _usdc_address(network: Optional[str] = None) -> str:
    """Resolve the USDC address for the requested network / env.

    On staging/prod, prefer the `usdc` override written by scripts/fund.js
    (a mintable demo USDC) so payment sims work without Circle's faucet,
    which does not support X Layer testnet. Falls back to the canonical escrow.
    """
    settings = get_settings()
    chain_id = _chain_id_for(network)
    if not settings.is_simulation:
        deployments = settings.load_deployments()
        demo = deployments.get("usdc")
        # Only the testnet deployment carries a mintable demo USDC.
        if demo and network != "mainnet":
            return demo
    return USDC_ON_XLAYER.get(chain_id, USDC_ON_XLAYER[196])


@router.get("/x402/meta")
def x402_meta(request: Request, network: Optional[str] = Query(None, description="testnet | mainnet")):
    """Discovery endpoint an x402 client calls before paying."""
    base = str(request.base_url).rstrip("/")
    chain_id = _chain_id_for(network)
    return build_meta(_usdc_address(network), base, chain_id)


@router.post("/x402")
def receive_x402(body: X402PaymentRequest, request: Request, network: Optional[str] = Query(None, description="testnet | mainnet"), _admin=Depends(require_admin)):
    """x402 webhook — verify the signed payment intent, then auto-allocate."""
    intent = parse_payment(body.model_dump())

    if not intent["recipient"]:
        raise HTTPException(status_code=400, detail="recipient is required")

    if body.signature:
        signer = verify_payment(intent, body.signature)
        if signer is None:
            raise HTTPException(status_code=401, detail="Invalid payment signature")
        payer = signer
    else:
        payer = intent["recipient"]

    # The 3% (allocationPercent) split is handled by the protocol layer.
    captured = CLIENT.forward_payment(payer, intent["token"], intent["amount"], network)
    if captured is None:
        raise HTTPException(status_code=404, detail="No vault for this user — create one first")

    return {
        "status": "accepted",
        "payer": payer,
        "payment": intent,
        "captured": captured,
        "paymentUrl": build_payment_url(intent["recipient"], intent["amount"], intent["token"], _chain_id_for(network)),
    }


@router.post("/auto")
def auto_allocate(body: ForwardPaymentRequest, network: Optional[str] = Query(None, description="testnet | mainnet"), _admin=Depends(require_admin)):
    """Simulate/execute an incoming payout and route allocationPercent to the vault."""
    captured = CLIENT.forward_payment(body.user, body.asset, body.amount, network)
    if captured is None:
        raise HTTPException(status_code=404, detail="No vault found for this address")
    return {
        "paymentAmount": body.amount,
        "asset": body.asset,
        "allocation": captured,
        "message": f"{body.amount} {body.asset} received; allocation routed to pension vault",
    }
