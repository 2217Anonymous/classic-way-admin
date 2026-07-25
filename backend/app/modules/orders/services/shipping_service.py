from __future__ import annotations

from decimal import Decimal

from app.modules.orders.schemas.shipping import (
    ShippingQuoteRequest,
    ShippingQuoteResponse,
)

FREE_SHIPPING_THRESHOLD = Decimal("999")
BASE_RATE = Decimal("59")
REMOTE_SURCHARGE = Decimal("40")
METRO_STATES = {
    "tamil nadu",
    "karnataka",
    "maharashtra",
    "delhi",
    "telangana",
    "west bengal",
}


class ShippingService:
    """VL-016 — demo shipping-rate quotes (no live courier API required)."""

    def quote(self, payload: ShippingQuoteRequest) -> ShippingQuoteResponse:
        is_metro = payload.state.strip().lower() in METRO_STATES

        if payload.subtotal >= FREE_SHIPPING_THRESHOLD:
            amount = Decimal("0")
        else:
            amount = BASE_RATE if is_metro else BASE_RATE + REMOTE_SURCHARGE

        return ShippingQuoteResponse(
            amount=amount,
            carrier="Valaiyagam Logistics",
            eta_days=3 if is_metro else 6,
        )
