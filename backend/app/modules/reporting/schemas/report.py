from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class ReportSummaryResponse(BaseModel):
    orders_count: int
    revenue: Decimal
    paid_count: int
    pending_shipments: int
    low_stock_count: int
    new_customers: int = 0
    total_refunds: Decimal = Decimal("0")
    generated_at: datetime | None = None
