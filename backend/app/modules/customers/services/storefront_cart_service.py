from __future__ import annotations

from uuid import UUID
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.customers.models import Customer
from app.modules.orders.repositories.cart_repository import CartRepository
from app.modules.orders.schemas.cart import CartCreate, CartItemCreate, CartItemUpdate, CartResponse
from app.modules.orders.services.cart_service import CartService
from app.utils.exceptions import AuthorizationError, NotFoundError


class StorefrontCartService:
    def __init__(
        self,
        cart_repository: CartRepository,
        product_repository: ProductRepository,
    ):
        self.cart_repository = cart_repository
        self.cart_service = CartService(cart_repository, product_repository)

    def resolve_cart(
        self,
        *,
        cart_id_header: UUID | None,
        customer: Customer | None,
        create_if_missing: bool = True,
    ) -> CartResponse:
        if customer:
            existing = self.cart_repository.get_by_customer_id(customer.id)
            if existing:
                return self.cart_service.get_cart(existing.id)
            if create_if_missing:
                return self.cart_service.create_cart(
                    CartCreate(customer_id=customer.id)
                )
            raise NotFoundError("Cart not found")

        if cart_id_header is not None:
            cart = self.cart_repository.get(cart_id_header)
            if cart and cart.customer_id is None:
                return self.cart_service.get_cart(cart.id)
            if cart and cart.customer_id is not None:
                raise AuthorizationError("Cart belongs to another customer")

        if create_if_missing:
            return self.cart_service.create_cart(CartCreate())
        raise NotFoundError("Cart not found")

    def get_cart(
        self, *, cart_id_header: UUID | None, customer: Customer | None
    ) -> CartResponse:
        return self.resolve_cart(
            cart_id_header=cart_id_header,
            customer=customer,
            create_if_missing=True,
        )

    def clear_cart(
        self, *, cart_id_header: UUID | None, customer: Customer | None
    ) -> CartResponse:
        cart = self.resolve_cart(
            cart_id_header=cart_id_header,
            customer=customer,
            create_if_missing=True,
        )
        return self.cart_service.clear_cart(cart.id)

    def add_item(
        self,
        payload: CartItemCreate,
        *,
        cart_id_header: UUID | None,
        customer: Customer | None,
    ) -> CartResponse:
        cart = self.resolve_cart(
            cart_id_header=cart_id_header,
            customer=customer,
            create_if_missing=True,
        )
        return self.cart_service.add_item(cart.id, payload)

    def update_item(
        self,
        item_id: UUID,
        payload: CartItemUpdate,
        *,
        cart_id_header: UUID | None,
        customer: Customer | None,
    ) -> CartResponse:
        cart = self.resolve_cart(
            cart_id_header=cart_id_header,
            customer=customer,
            create_if_missing=False,
        )
        return self.cart_service.update_item(cart.id, item_id, payload)

    def delete_item(
        self,
        item_id: UUID,
        *,
        cart_id_header: UUID | None,
        customer: Customer | None,
    ) -> CartResponse:
        cart = self.resolve_cart(
            cart_id_header=cart_id_header,
            customer=customer,
            create_if_missing=False,
        )
        return self.cart_service.delete_item(cart.id, item_id)

    def merge(
        self,
        *,
        guest_cart_id: UUID | None,
        cart_id_header: UUID | None,
        customer: Customer,
    ) -> CartResponse:
        guest_id = guest_cart_id or cart_id_header
        return self.cart_service.merge_into_customer(guest_id, customer.id)
