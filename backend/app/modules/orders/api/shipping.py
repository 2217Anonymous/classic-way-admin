from fastapi import APIRouter

from app.modules.orders.schemas.shipping import (
    ShippingQuoteRequest,
    ShippingQuoteResponse,
)
from app.modules.orders.services.shipping_service import ShippingService

router = APIRouter(prefix="/shipping", tags=["Shipping"])


@router.post("/quote", response_model=ShippingQuoteResponse)
def get_shipping_quote(payload: ShippingQuoteRequest) -> ShippingQuoteResponse:
    return ShippingService().quote(payload)
