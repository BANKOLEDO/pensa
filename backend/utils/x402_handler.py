"""x402 payment handling.

x402 (https://github.com/Coinbase/x402) is a standard for requesting and
verifying HTTP payments with crypto. PENSA uses it as the payment rail that
carries gig payouts; the receiving endpoint verifies the signed intent and
auto-routes the allocationPercent into the payer's pension vault.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Optional

log = logging.getLogger("pensa.x402")

EXPECT_HEADER = "expect"
SEND_HEADER = "send"
VERIFY_HEADER = "x-verify"
SIGNATURE_HEADER = "x-signature"


def build_meta(recipient: str, base_url: str, chain_id: int = 196) -> dict:
    """The 'x402 meta' response a client fetches before paying (POST /payments/x402/meta)."""
    return {
        "method": "send",
        "receiver": recipient,
        "resource": f"{base_url}/payments/x402",
        "amount": 1,
        "token": "usdc",  # canonical USDC on X Layer
        "chainId": chain_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "expiresAt": (datetime.now(timezone.utc).replace(microsecond=0)).isoformat(),
    }


def build_payment_url(recipient: str, amount: float, token: str = "usdc", chain_id: int = 196) -> str:
    """A shareable payment URL a client can open to pay via wallet."""
    params = {"recipient": recipient, "amount": amount, "token": token, "chainId": chain_id}
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    return f"pensa://pay?{qs}"


def compute_digest(intent: dict) -> bytes:
    """Deterministic hash of the payment intent (chainId, recipient, token, amount)."""
    payload = json.dumps(
        {
            "chainId": intent.get("chainId", 196),
            "recipient": intent.get("recipient", "").lower(),
            "token": intent.get("token", "").lower(),
            "amount": str(intent.get("amount", 0)),
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode()).digest()


def verify_payment(intent: dict, signature: str) -> Optional[str]:
    """Validate an x402 intent + EIP-191 signature. Returns the signer address.

    The signed message is the intent digest above (the same payload an x402
    client signs with its wallet). Returns None when verification fails.
    """
    try:
        from eth_account import Account
        digest = compute_digest(intent)
        recovered = Account.recover_message(message=b"x402:" + digest, signature=signature)
        return recovered
    except Exception as exc:
        log.warning("x402 signature verify failed: %s", exc)
        return None


def parse_payment(payload: dict) -> dict:
    """Normalise a raw x402 request body into a validated intent."""
    chain_id = int(payload.get("chainId", 196))
    recipient = payload.get("recipient", "")
    token = payload.get("token", "usdc").lower()
    amount = float(payload.get("amount", 0))
    return {"chainId": chain_id, "recipient": recipient, "token": token, "amount": amount}
