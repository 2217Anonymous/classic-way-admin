from decimal import Decimal

from pydantic import BaseModel, Field


class ShippingQuoteRequest(BaseModel):
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    postal_code: str = Field(min_length=3, max_length=20)
    subtotal: Decimal = Field(ge=0)


class ShippingQuoteResponse(BaseModel):
    amount: Decimal
    carrier: str
    eta_days: int
