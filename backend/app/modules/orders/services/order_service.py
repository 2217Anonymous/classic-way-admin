from __future__ import annotations

import random
import string
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.inventory.repositories.inventory_repository import InventoryItemRepository
from app.modules.orders.models.order import Order, OrderItem, OrderStatusHistory
from app.modules.orders.repositories.address_repository import AddressRepository
from app.modules.orders.repositories.cart_repository import CartRepository
from app.modules.orders.repositories.order_repository import OrderRepository
from app.modules.orders.schemas.order import (
    CheckoutRequest,
    OrderItemResponse,
    OrderResponse,
    OrderStatusHistoryResponse,
)
from app.modules.settings.repositories.coupon_repository import CouponRepository
from app.utils.exceptions import AppError, NotFoundError

CANCELLABLE_STATUSES = {"draft", "pending", "paid"}
PAYABLE_STATUSES = {"draft", "pending"}
FREE_SHIPPING_THRESHOLD = Decimal("999")
STANDARD_SHIPPING = Decimal("59")


def generate_order_number() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"ORD-{stamp}-{suffix}"


class OrderService:
    """VL-017/VL-018 — checkout, order lifecycle, and status history."""

    def __init__(
        self,
        repository: OrderRepository,
        cart_repository: CartRepository,
        address_repository: AddressRepository,
        inventory_repository: InventoryItemRepository,
        coupon_repository: CouponRepository,
        product_repository: ProductRepository | None = None,
    ):
        self.repository = repository
        self.cart_repository = cart_repository
        self.address_repository = address_repository
        self.inventory_repository = inventory_repository
        self.coupon_repository = coupon_repository
        self.product_repository = product_repository

    def checkout(self, payload: CheckoutRequest) -> OrderResponse:
        cart = self.cart_repository.get(payload.cart_id)
        if not cart:
            raise NotFoundError("Cart not found")
        if not cart.items:
            raise AppError("Cart is empty", 400)

        shipping_fields = self._resolve_shipping_fields(payload)
        subtotal = sum(
            (item.unit_price * item.quantity for item in cart.items), Decimal("0")
        )
        effective_coupon = payload.coupon_code or getattr(cart, "coupon_code", None)
        discount_amount, coupon_code = self._apply_coupon(effective_coupon, subtotal)

        shipping_amount = (
            Decimal("0") if subtotal >= FREE_SHIPPING_THRESHOLD else STANDARD_SHIPPING
        )
        tax_amount = Decimal("0")
        total = max(subtotal - discount_amount + shipping_amount + tax_amount, Decimal("0"))

        order_number = self._unique_order_number()
        order = self.repository.create(
            order_number=order_number,
            user_id=cart.user_id,
            customer_id=cart.customer_id,
            status="pending",
            payment_method=payload.payment_method,
            subtotal=subtotal,
            shipping_amount=shipping_amount,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total=total,
            currency="INR",
            coupon_code=coupon_code or getattr(cart, "coupon_code", None),
            notes=payload.notes,
            **shipping_fields,
        )

        for cart_item in cart.items:
            self.repository.add_item(
                OrderItem(
                    order_id=order.id,
                    product_id=cart_item.product_id,
                    variant_id=cart_item.variant_id,
                    sku=cart_item.sku,
                    name=cart_item.product_name,
                    quantity=cart_item.quantity,
                    unit_price=cart_item.unit_price,
                    line_total=cart_item.unit_price * cart_item.quantity,
                )
            )
            self._reserve_stock(cart_item.product_id, cart_item.variant_id, cart_item.quantity)

        self.repository.add_status_history(
            OrderStatusHistory(
                order_id=order.id,
                from_status=None,
                to_status="pending",
                note="Order created at checkout",
            )
        )
        self.cart_repository.clear_items(cart)

        return self._to_response(self.repository.get(order.id) or order)

    def list_orders(self, status: str | None = None) -> list[OrderResponse]:
        return [self._to_response(order) for order in self.repository.list(status)]

    def get_order(self, order_id: UUID) -> OrderResponse:
        return self._to_response(self._get_or_404(order_id))

    def get_order_model(self, order_id: UUID) -> Order:
        return self._get_or_404(order_id)

    def get_order_by_number(self, order_number: str) -> Order:
        order = self.repository.get_by_number(order_number)
        if not order:
            raise NotFoundError("Order not found")
        return order

    def cancel_order(self, order_id: UUID, reason: str | None = None) -> OrderResponse:
        order = self._get_or_404(order_id)
        if order.status not in CANCELLABLE_STATUSES:
            raise AppError(
                f"Order cannot be cancelled from status '{order.status}'", 400
            )
        previous = order.status
        order.status = "cancelled"
        self.repository.save(order)
        self._release_stock(order)
        self.repository.add_status_history(
            OrderStatusHistory(
                order_id=order.id,
                from_status=previous,
                to_status="cancelled",
                note=reason,
            )
        )
        return self._to_response(self.repository.get(order.id) or order)

    def mark_paid(self, order_id: UUID, note: str | None = None) -> OrderResponse:
        order = self._get_or_404(order_id)
        if order.status == "paid":
            return self._to_response(order)
        if order.status not in PAYABLE_STATUSES:
            raise AppError(
                f"Order cannot be marked paid from status '{order.status}'", 400
            )
        previous = order.status
        order.status = "paid"
        self.repository.save(order)
        self._deduct_stock(order)
        self.repository.add_status_history(
            OrderStatusHistory(
                order_id=order.id,
                from_status=previous,
                to_status="paid",
                note=note or "Marked paid",
            )
        )
        return self._to_response(self.repository.get(order.id) or order)

    def mark_refunded(self, order_id: UUID, note: str | None = None) -> OrderResponse:
        order = self._get_or_404(order_id)
        previous = order.status
        order.status = "refunded"
        self.repository.save(order)
        self.repository.add_status_history(
            OrderStatusHistory(
                order_id=order.id,
                from_status=previous,
                to_status="refunded",
                note=note or "Refund processed",
            )
        )
        return self._to_response(self.repository.get(order.id) or order)

    def _resolve_shipping_fields(self, payload: CheckoutRequest) -> dict:
        if payload.address_id is not None:
            address = self.address_repository.get(payload.address_id)
            if not address:
                raise NotFoundError("Address not found")
            return {
                "shipping_name": address.full_name,
                "shipping_phone": address.phone,
                "shipping_line1": address.line1,
                "shipping_line2": address.line2,
                "shipping_city": address.city,
                "shipping_state": address.state,
                "shipping_postal_code": address.postal_code,
                "shipping_country": address.country,
            }
        if payload.address is not None:
            addr = payload.address
            return {
                "shipping_name": addr.full_name,
                "shipping_phone": addr.phone,
                "shipping_line1": addr.line1,
                "shipping_line2": addr.line2,
                "shipping_city": addr.city,
                "shipping_state": addr.state,
                "shipping_postal_code": addr.postal_code,
                "shipping_country": addr.country,
            }
        raise AppError("An address_id or address must be provided", 400)

    def _apply_coupon(
        self, coupon_code: str | None, subtotal: Decimal
    ) -> tuple[Decimal, str | None]:
        if not coupon_code:
            return Decimal("0"), None

        coupon = self.coupon_repository.get_by_code(coupon_code.strip().upper())
        if not coupon or not coupon.is_active:
            raise AppError("Invalid or inactive coupon code", 400)
        if coupon.min_order_amount and subtotal < coupon.min_order_amount:
            raise AppError(
                f"Coupon requires a minimum order of {coupon.min_order_amount}", 400
            )
        if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
            raise AppError("Coupon usage limit reached", 400)

        if coupon.discount_type == "percent":
            discount_amount = (subtotal * coupon.discount_value / Decimal("100")).quantize(
                Decimal("0.01")
            )
        else:
            discount_amount = min(coupon.discount_value, subtotal)

        coupon.used_count += 1
        self.coupon_repository.save(coupon)
        return discount_amount, coupon.code

    def _unique_order_number(self) -> str:
        order_number = generate_order_number()
        while self.repository.get_by_number(order_number):
            order_number = generate_order_number()
        return order_number

    def _reserve_stock(
        self, product_id: UUID | None, variant_id: UUID | None, quantity: int
    ) -> None:
        item = self._get_or_create_inventory_item(product_id, variant_id)
        if item:
            item.reserved += quantity
            self.inventory_repository.save(item)

    def _release_stock(self, order: Order) -> None:
        for line in order.items:
            item = self.inventory_repository.get_by_product(
                line.product_id, line.variant_id
            )
            if item:
                item.reserved = max(0, item.reserved - line.quantity)
                self.inventory_repository.save(item)

    def _deduct_stock(self, order: Order) -> None:
        for line in order.items:
            item = self._get_or_create_inventory_item(line.product_id, line.variant_id)
            if item:
                item.reserved = max(0, item.reserved - line.quantity)
                item.quantity = max(0, item.quantity - line.quantity)
                self.inventory_repository.save(item)

    def _get_or_create_inventory_item(
        self, product_id: UUID | None, variant_id: UUID | None
    ):
        """Lazily create the inventory_items row on first order touch, so
        stock reservation/deduction works even if nobody has opened the
        inventory admin screen (which normally seeds it) yet."""
        item = self.inventory_repository.get_by_product(product_id, variant_id)
        if item or not product_id or not self.product_repository:
            return item

        product = self.product_repository.get(product_id)
        if not product:
            return None

        if variant_id:
            variant = next((v for v in product.variants if v.id == variant_id), None)
            if not variant:
                return None
            return self.inventory_repository.create(
                product_id=product_id,
                variant_id=variant_id,
                sku=variant.sku,
                quantity=variant.stock,
                reserved=0,
            )

        return self.inventory_repository.create(
            product_id=product_id,
            variant_id=None,
            sku=product.sku,
            quantity=product.stock,
            reserved=0,
        )

    def _get_or_404(self, order_id: UUID) -> Order:
        order = self.repository.get(order_id)
        if not order:
            raise NotFoundError("Order not found")
        return order

    def _to_response(self, order: Order) -> OrderResponse:
        items = [OrderItemResponse.model_validate(item) for item in order.items]
        history = [
            OrderStatusHistoryResponse.model_validate(entry)
            for entry in order.status_history
        ]
        return OrderResponse(
            id=order.id,
            order_number=order.order_number,
            user_id=order.user_id,
            customer_id=getattr(order, "customer_id", None),
            status=order.status,
            payment_method=order.payment_method,
            subtotal=order.subtotal,
            shipping_amount=order.shipping_amount,
            tax_amount=order.tax_amount,
            discount_amount=order.discount_amount,
            total=order.total,
            currency=order.currency,
            shipping_name=order.shipping_name,
            shipping_phone=order.shipping_phone,
            shipping_line1=order.shipping_line1,
            shipping_line2=order.shipping_line2,
            shipping_city=order.shipping_city,
            shipping_state=order.shipping_state,
            shipping_postal_code=order.shipping_postal_code,
            shipping_country=order.shipping_country,
            coupon_code=order.coupon_code,
            notes=order.notes,
            items=items,
            status_history=history,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )
