from datetime import datetime, timezone
from decimal import Decimal
import csv
import io

from sqlalchemy.orm import Session

from app.modules.customers.repositories.customer_repository import CustomerRepository
from app.modules.fulfillment.repositories import ShipmentRepository
from app.modules.inventory.repositories.inventory_repository import (
    InventoryItemRepository,
    InventorySettingsRepository,
)
from app.modules.inventory.services.inventory_service import InventorySettingsService
from app.modules.orders.repositories.order_repository import OrderRepository
from app.modules.payments.repositories.payment_repository import RefundRepository
from app.modules.reporting.schemas.report import ReportSummaryResponse

REVENUE_STATUSES = ["paid", "processing", "shipped", "delivered", "refunded"]
CSV_HEADERS = [
    "order_number",
    "status",
    "payment_method",
    "subtotal",
    "shipping_amount",
    "discount_amount",
    "total",
    "currency",
    "created_at",
]


class ReportingService:
    """VL-028/VL-029 — read-only KPIs and sales export across modules."""

    def __init__(self, db: Session):
        self.order_repository = OrderRepository(db)
        self.inventory_repository = InventoryItemRepository(db)
        self.shipment_repository = ShipmentRepository(db)
        self.customer_repository = CustomerRepository(db)
        self.refund_repository = RefundRepository(db)
        self.inventory_settings_service = InventorySettingsService(
            InventorySettingsRepository(db)
        )

    def summary(self) -> ReportSummaryResponse:
        orders_count = self.order_repository.count()
        paid_count = self.order_repository.count(status="paid")
        revenue = Decimal(str(self.order_repository.sum_revenue(REVENUE_STATUSES)))
        pending_shipments = self.shipment_repository.count_active()
        new_customers = len(self.customer_repository.list())
        total_refunds = sum(
            (Decimal(str(row.amount)) for row in self.refund_repository.list()),
            Decimal("0"),
        )

        threshold = self.inventory_settings_service.get_threshold()
        low_stock_count = sum(
            1
            for item in self.inventory_repository.list()
            if (item.quantity - item.reserved) <= threshold
        )

        return ReportSummaryResponse(
            orders_count=orders_count,
            revenue=revenue,
            paid_count=paid_count,
            pending_shipments=pending_shipments,
            low_stock_count=low_stock_count,
            new_customers=new_customers,
            total_refunds=total_refunds,
            generated_at=datetime.now(timezone.utc),
        )

    def sales_csv(self) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(CSV_HEADERS)
        for order in self.order_repository.list():
            writer.writerow(
                [
                    order.order_number,
                    order.status,
                    order.payment_method,
                    order.subtotal,
                    order.shipping_amount,
                    order.discount_amount,
                    order.total,
                    order.currency,
                    order.created_at.isoformat(),
                ]
            )
        return output.getvalue()
