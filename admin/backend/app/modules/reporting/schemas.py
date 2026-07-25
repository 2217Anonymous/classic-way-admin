from decimal import Decimal

from pydantic import BaseModel


class ReportSummaryResponse(BaseModel):
    orders_count: int
    revenue: Decimal
    paid_count: int
    pending_shipments: int
    low_stock_count: int
