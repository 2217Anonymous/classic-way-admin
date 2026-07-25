from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.orders.models.cart import Cart, CartItem
from app.modules.orders.repositories.cart_repository import CartRepository
from app.modules.orders.schemas.cart import (
    CartCreate,
    CartItemCreate,
    CartItemResponse,
    CartItemUpdate,
    CartResponse,
)
from app.utils.exceptions import NotFoundError


class CartService:
    """VL-015 — cart creation and line-item management."""

    def __init__(
        self, repository: CartRepository, product_repository: ProductRepository
    ):
        self.repository = repository
        self.product_repository = product_repository

    def create_cart(self, payload: CartCreate) -> CartResponse:
        cart = self.repository.create(
            session_key=payload.session_key,
            user_id=payload.user_id,
            customer_id=getattr(payload, "customer_id", None),
        )
        return self._to_response(cart)

    def get_cart(self, cart_id: UUID) -> CartResponse:
        return self._to_response(self._get_or_404(cart_id))

    def add_item(self, cart_id: UUID, payload: CartItemCreate) -> CartResponse:
        cart = self._get_or_404(cart_id)
        product = self.product_repository.get(payload.product_id)
        if not product or not product.is_active:
            raise NotFoundError("Product not found")

        unit_price = product.price
        sku = product.sku
        if payload.variant_id is not None:
            variant = next(
                (v for v in product.variants if v.id == payload.variant_id), None
            )
            if not variant:
                raise NotFoundError("Product variant not found")
            unit_price = variant.price if variant.price is not None else product.price
            sku = variant.sku

        existing = next(
            (
                item
                for item in cart.items
                if item.product_id == payload.product_id
                and item.variant_id == payload.variant_id
            ),
            None,
        )
        if existing:
            existing.quantity += payload.quantity
            self.repository.save_item(existing)
        else:
            self.repository.add_item(
                CartItem(
                    cart_id=cart.id,
                    product_id=product.id,
                    variant_id=payload.variant_id,
                    quantity=payload.quantity,
                    unit_price=unit_price,
                    product_name=product.name,
                    sku=sku,
                )
            )

        return self._to_response(self._get_or_404(cart.id))

    def update_item(
        self, cart_id: UUID, item_id: UUID, payload: CartItemUpdate
    ) -> CartResponse:
        self._get_or_404(cart_id)
        item = self.repository.get_item(item_id)
        if not item or item.cart_id != cart_id:
            raise NotFoundError("Cart item not found")
        item.quantity = payload.quantity
        self.repository.save_item(item)
        return self._to_response(self._get_or_404(cart_id))

    def delete_item(self, cart_id: UUID, item_id: UUID) -> CartResponse:
        self._get_or_404(cart_id)
        item = self.repository.get_item(item_id)
        if not item or item.cart_id != cart_id:
            raise NotFoundError("Cart item not found")
        self.repository.delete_item(item)
        return self._to_response(self._get_or_404(cart_id))

    def clear_cart(self, cart_id: UUID) -> CartResponse:
        cart = self._get_or_404(cart_id)
        self.repository.clear_items(cart)
        cart.coupon_code = None
        self.repository.save(cart)
        return self._to_response(self._get_or_404(cart_id))

    def set_coupon(self, cart_id: UUID, coupon_code: str | None) -> CartResponse:
        cart = self._get_or_404(cart_id)
        cart.coupon_code = coupon_code.strip().upper() if coupon_code else None
        self.repository.save(cart)
        return self._to_response(self._get_or_404(cart_id))

    def merge_into_customer(
        self, guest_cart_id: UUID | None, customer_id: UUID
    ) -> CartResponse:
        customer_cart = self.repository.get_by_customer_id(customer_id)
        if not customer_cart:
            customer_cart = self.repository.create(customer_id=customer_id)

        if guest_cart_id and guest_cart_id != customer_cart.id:
            guest = self.repository.get(guest_cart_id)
            if guest and guest.customer_id is None:
                for item in list(guest.items):
                    self.add_item(
                        customer_cart.id,
                        CartItemCreate(
                            product_id=item.product_id,
                            variant_id=item.variant_id,
                            quantity=item.quantity,
                        ),
                    )
                if guest.coupon_code and not customer_cart.coupon_code:
                    customer_cart = self._get_or_404(customer_cart.id)
                    customer_cart.coupon_code = guest.coupon_code
                    self.repository.save(customer_cart)
                self.repository.delete(guest)

        return self._to_response(self._get_or_404(customer_cart.id))

    def _get_or_404(self, cart_id: UUID) -> Cart:
        cart = self.repository.get(cart_id)
        if not cart:
            raise NotFoundError("Cart not found")
        return cart

    def _to_response(self, cart: Cart) -> CartResponse:
        items = [
            CartItemResponse(
                id=item.id,
                cart_id=item.cart_id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                product_name=item.product_name,
                sku=item.sku,
                line_total=item.unit_price * item.quantity,
            )
            for item in cart.items
        ]
        subtotal = sum((row.line_total for row in items), Decimal("0"))
        return CartResponse(
            id=cart.id,
            session_key=cart.session_key,
            user_id=cart.user_id,
            customer_id=getattr(cart, "customer_id", None),
            coupon_code=getattr(cart, "coupon_code", None),
            items=items,
            subtotal=subtotal,
            item_count=sum(row.quantity for row in items),
            created_at=cart.created_at,
            updated_at=cart.updated_at,
        )
