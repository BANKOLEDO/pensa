"""API request/response models."""
from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class CreateVaultRequest(BaseModel):
    user: str = Field(..., min_length=40, max_length=42, description="EVM address")
    allocationPercent: int = Field(300, ge=0, le=1000)
    riskTolerance: int = Field(50, ge=0, le=100)
    preferredAssets: List[str] = []


class UpdateAllocationRequest(BaseModel):
    allocationPercent: int = Field(..., ge=0, le=1000)


class ForwardPaymentRequest(BaseModel):
    user: str
    asset: str = "USDC"
    amount: float = Field(..., gt=0)


class RecordReturnsRequest(BaseModel):
    user: str
    amount: float = Field(..., gt=0)


class X402PaymentRequest(BaseModel):
    recipient: str
    amount: float = Field(..., gt=0)
    token: str = "usdc"
    chainId: int = 196
    signature: Optional[str] = None


class RecommendRequest(BaseModel):
    user: str
    age: int = Field(30, ge=16, le=100)
    monthly_income: float = Field(2000, ge=0)
    riskTolerance: int = Field(50, ge=0, le=100)
    retirement_age: int = Field(65, ge=16, le=110)
    preferred_assets: List[str] = []


class ApplyStrategyRequest(BaseModel):
    user: str
    riskTolerance: Optional[int] = None
