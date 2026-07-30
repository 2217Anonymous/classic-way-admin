from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.customers.models import Customer
from app.modules.customers.repositories.engagement_repository import CouponUsageRepository
from app.modules.customers.schemas.auth import MessageResponse
from app.modules.customers.schemas.commerce import (
    CheckoutPreviewRequest,
    CheckoutPreviewResponse,
    CouponApplyRequest,
    CouponResultResponse,
    CouponValidateRequest,
    CustomerOrderItemResponse,
    CustomerOrderResponse,
    CustomerOrderTrackingResponse,
    PaymentCreateBody,
    PaymentVerifyBody,
    ShipmentEventBrief,
    StatusHistoryBrief,
)
from app.modules.customers.services.storefront_cart_service import StorefrontCartService
from app.modules.fulfillment.repositories import ShipmentRepository
from app.modules.inventory.repositories.inventory_repository import InventoryItemRepository
from app.modules.orders.repositories.address_repository import AddressRepository
from app.modules.orders.repositories.cart_repository import CartRepository
from app.modules.orders.repositories.order_repository import OrderRepository
from app.modules.orders.schemas.order import CheckoutRequest
from app.modules.orders.services.cart_service import CartService
from app.modules.orders.services.order_service import (
    FREE_SHIPPING_THRESHOLD,
    STANDARD_SHIPPING,
    OrderService,
)
from app.modules.payments.repositories.payment_repository import (
    PaymentEventRepository,
    PaymentRepository,
    RefundRepository,
)
from app.modules.payments.schemas.payment import PaymentCreateRequest, PaymentResponse
from app.modules.payments.services.payment_service import PaymentService
from app.modules.settings.repositories.coupon_repository import CouponRepository
from app.utils.exceptions import AppError, AuthorizationError, NotFoundError


class CommerceService:
    def __init__(
        self,
        db,
        cart_repository: CartRepository,
        product_repository: ProductRepository,
        order_repository: OrderRepository,
        address_repository: AddressRepository,
        inventory_repository: InventoryItemRepository,
        coupon_repository: CouponRepository,
        coupon_usage_repository: CouponUsageRepository | None = None,
        shipment_repository: ShipmentRepository | None = None,
    ):
        self.db = db
        self.cart_repository = cart_repository
        self.coupon_repository = coupon_repository
        self.coupon_usage_repository = coupon_usage_repository
        self.shipment_repository = shipment_repository
        self.order_repository = order_repository
        self.address_repository = address_repository
        self.cart_service = CartService(cart_repository, product_repository)
        self.storefront_cart = StorefrontCartService(cart_repository, product_repository)
        self.order_service = OrderService(
            order_repository,
            cart_repository,
            address_repository,
            inventory_repository,
            coupon_repository,
            product_repository,
        )
        self.payment_service = PaymentService(
            PaymentRepository(db),
            PaymentEventRepository(db),
            RefundRepository(db),
            order_repository,
            self.order_service,
        )

    def validate_coupon(self, payload: CouponValidateRequest) -> CouponResultResponse:
        coupon, discount = self._compute_discount(payload.code, payload.subtotal)
        return CouponResultResponse(
            code=coupon.code,
            discount_type=coupon.discount_type,
            discount_value=coupon.discount_value,
            discount_amount=discount,
            message="Coupon is valid",
        )

    def apply_coupon(
        self,
        payload: CouponApplyRequest,
        *,
        cart_id_header: UUID | None,
        customer: Customer | None,
    ) -> CouponResultResponse:
        cart = self.storefront_cart.resolve_cart(
            cart_id_header=payload.cart_id or cart_id_header,
            customer=customer,
            create_if_missing=True,
        )
        coupon, discount = self._compute_discount(payload.code, cart.subtotal)
        self.cart_service.set_coupon(cart.id, coupon.code)
        return CouponResultResponse(
            code=coupon.code,
            discount_type=coupon.discount_type,
            discount_value=coupon.discount_value,
            discount_amount=discount,
            message="Coupon applied",
        )

    def remove_coupon(
        self, *, cart_id_header: UUID | None, customer: Customer | None
    ) -> MessageResponse:
        cart = self.storefront_cart.resolve_cart(
            cart_id_header=cart_id_header,
            customer=customer,
            create_if_missing=True,
        )
        self.cart_service.set_coupon(cart.id, None)
        return MessageResponse(message="Coupon removed")

    def preview_checkout(
        self,
        payload: CheckoutPreviewRequest,
        *,
        cart_id_header: UUID | None,
        customer: Customer | None,
    ) -> CheckoutPreviewResponse:
        cart = self.storefront_cart.resolve_cart(
            cart_id_header=payload.cart_id or cart_id_header,
            customer=customer,
            create_if_missing=False,
        )
        if not cart.items:
            raise AppError("Cart is empty", 400)

        coupon_code = payload.coupon_code or cart.coupon_code
        discount = Decimal("0")
        if coupon_code:
            _, discount = self._compute_discount(coupon_code, cart.subtotal)

        shipping = (
            Decimal("0")
            if cart.subtotal >= FREE_SHIPPING_THRESHOLD
            else STANDARD_SHIPPING
        )
        tax = Decimal("0")
        total = max(cart.subtotal - discount + shipping + tax, Decimal("0"))
        return CheckoutPreviewResponse(
            subtotal=cart.subtotal,
            shipping_amount=shipping,
            tax_amount=tax,
            discount_amount=discount,
            total=total,
            coupon_code=coupon_code,
            item_count=cart.item_count,
            currency="INR",
        )

    def validate_checkout(
        self,
        payload: CheckoutPreviewRequest,
        *,
        cart_id_header: UUID | None,
        customer: Customer | None,
    ) -> CheckoutPreviewResponse:
        if payload.address_id is None and payload.address is None:
            raise AppError("An address_id or address must be provided", 400)
        if payload.address_id is not None and customer:
            address = self.address_repository.get(payload.address_id)
            if not address or address.customer_id != customer.id:
                raise NotFoundError("Address not found")
        return self.preview_checkout(
            payload, cart_id_header=cart_id_header, customer=customer
        )

    def create_order(
        self,
        payload: CheckoutPreviewRequest,
        *,
        cart_id_header: UUID | None,
        customer: Customer,
    ) -> CustomerOrderResponse:
        cart = self.storefront_cart.resolve_cart(
            cart_id_header=payload.cart_id or cart_id_header,
            customer=customer,
            create_if_missing=False,
        )
        if cart.customer_id != customer.id:
            # Attach guest cart if needed
            cart_model = self.cart_repository.get(cart.id)
            if cart_model and cart_model.customer_id is None:
                cart_model.customer_id = customer.id
                self.cart_repository.save(cart_model)
            elif cart.customer_id != customer.id:
                raise AuthorizationError("Cart does not belong to this customer")

        if payload.address_id is not None:
            address = self.address_repository.get(payload.address_id)
            if not address or address.customer_id != customer.id:
                raise NotFoundError("Address not found")

        coupon_code = payload.coupon_code or cart.coupon_code
        checkout = CheckoutRequest(
            cart_id=cart.id,
            address_id=payload.address_id,
            address=payload.address,
            payment_method=payload.payment_method,
            coupon_code=coupon_code,
            notes=payload.notes,
        )
        order = self.order_service.checkout(checkout)

        if coupon_code and self.coupon_usage_repository:
            coupon = self.coupon_repository.get_by_code(coupon_code.strip().upper())
            if coupon:
                self.coupon_usage_repository.create(
                    coupon_id=coupon.id,
                    customer_id=customer.id,
                    order_id=order.id,
                    discount_amount=order.discount_amount,
                )

        return self._customer_order(self.order_repository.get(order.id) or order)

    def list_orders(
        self, customer: Customer, status: str | None = None
    ) -> list[CustomerOrderResponse]:
        orders = self.order_repository.list_for_customer(customer.id, status=status)
        return [self._customer_order(o) for o in orders]

    def get_order(self, customer: Customer, order_id: UUID) -> CustomerOrderResponse:
        order = self.order_repository.get(order_id)
        if not order or order.customer_id != customer.id:
            raise NotFoundError("Order not found")
        return self._customer_order(order)

    def cancel_order(
        self, customer: Customer, order_id: UUID, reason: str | None = None
    ) -> CustomerOrderResponse:
        order = self.order_repository.get(order_id)
        if not order or order.customer_id != customer.id:
            raise NotFoundError("Order not found")
        cancelled = self.order_service.cancel_order(order_id, reason)
        return self._customer_order(
            self.order_repository.get(cancelled.id) or cancelled
        )

    def track_order(
        self, customer: Customer, order_number: str
    ) -> CustomerOrderTrackingResponse:
        order = self.order_repository.get_by_number(order_number)
        if not order or order.customer_id != customer.id:
            raise NotFoundError("Order not found")

        history = [
            StatusHistoryBrief(
                from_status=h.from_status,
                to_status=h.to_status,
                note=h.note,
                created_at=h.created_at,
                status=h.to_status,
            )
            for h in order.status_history
        ]
        awb = None
        shipment_status = None
        events: list[ShipmentEventBrief] | None = None
        if self.shipment_repository:
            shipments = self.shipment_repository.get_for_order(order.id)
            if shipments:
                shipment = shipments[0]
                awb = shipment.awb
                shipment_status = shipment.status
                events = [
                    ShipmentEventBrief(
                        status=e.status,
                        description=e.message,
                        location=None,
                        occurred_at=e.event_at,
                        source=e.source,
                    )
                    for e in shipment.events
                ]

        return CustomerOrderTrackingResponse(
            order_number=order.order_number,
            status=order.status,
            status_history=history,
            shipping_city=order.shipping_city,
            created_at=order.created_at,
            awb=awb,
            shipment_status=shipment_status,
            shipment_events=events,
        )

    def create_payment(
        self, customer: Customer, payload: PaymentCreateBody
    ) -> PaymentResponse | dict:
        order = self.order_repository.get(payload.order_id)
        if not order or order.customer_id != customer.id:
            raise NotFoundError("Order not found")

        if payload.provider == "cod":
            return {
                "order_id": order.id,
                "provider": "cod",
                "status": "created",
                "message": "Cash on delivery selected",
            }

        return self.payment_service.create_razorpay_payment(
            PaymentCreateRequest(order_id=order.id)
        )

    def verify_payment(self, customer: Customer, payload: PaymentVerifyBody) -> dict:
        order = self.order_repository.get(payload.order_id)
        if not order or order.customer_id != customer.id:
            raise NotFoundError("Order not found")

        if order.payment_method == "cod":
            return {
                "order_id": order.id,
                "status": order.status,
                "message": "COD order — payment collected on delivery",
            }

        if payload.provider_payment_id or payload.provider_order_id:
            self.order_service.mark_paid(order.id, note="Payment verified (sandbox)")
            return {"order_id": order.id, "status": "paid", "message": "Payment verified"}

        raise AppError("Payment verification details required", 400)

    def _compute_discount(self, code: str, subtotal: Decimal):
        coupon = self.coupon_repository.get_by_code(code.strip().upper())
        if not coupon or not coupon.is_active:
            raise AppError("Invalid or inactive coupon code", 400)
        if coupon.min_order_amount and subtotal < coupon.min_order_amount:
            raise AppError(
                f"Coupon requires a minimum order of {coupon.min_order_amount}", 400
            )
        if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
            raise AppError("Coupon usage limit reached", 400)
        if coupon.discount_type == "percent":
            discount = (subtotal * coupon.discount_value / Decimal("100")).quantize(
                Decimal("0.01")
            )
        else:
            discount = min(coupon.discount_value, subtotal)
        return coupon, discount

    def _customer_order(self, order) -> CustomerOrderResponse:
        items = [
            CustomerOrderItemResponse(
                id=item.id,
                name=item.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
            for item in order.items
        ]
        return CustomerOrderResponse(
            id=order.id,
            order_number=order.order_number,
            status=order.status,
            payment_method=order.payment_method,
            subtotal=order.subtotal,
            shipping_amount=order.shipping_amount,
            tax_amount=order.tax_amount,
            discount_amount=order.discount_amount,
            total=order.total,
            currency=order.currency,
            items=items,
            created_at=order.created_at,
        )
