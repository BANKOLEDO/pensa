"""Auth for agent-signed write routes — enforced the same way in every env."""
from __future__ import annotations

import hmac
from typing import Optional

from fastapi import Header, HTTPException

from ..config import get_settings

ADMIN_HEADER = "X-PENSA-ADMIN"


def require_admin(x_pensa_admin: Optional[str] = Header(default=None)) -> None:
    """Reject unless the request carries the configured admin token.

    Fails closed: if ADMIN_TOKEN is unset the route is disabled (503) rather
    than silently open, so an unconfigured staging/prod box can never accept
    agent-signed writes.
    """
    settings = get_settings()
    if not settings.admin_token:
        raise HTTPException(status_code=503, detail="ADMIN_TOKEN not configured — write routes disabled")
    if not x_pensa_admin:
        raise HTTPException(status_code=401, detail="Missing X-PENSA-ADMIN token")
    if not hmac.compare_digest(x_pensa_admin.strip(), settings.admin_token):
        raise HTTPException(status_code=401, detail="Invalid X-PENSA-ADMIN token")