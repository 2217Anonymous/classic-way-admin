from __future__ import annotations

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.orders.models.cart import Cart, CartItem


class CartRepository:
    def __init__(self, db: Session):
        self.db = db

    def _options(self):
        return (selectinload(Cart.items),)

    def create(self, **fields) -> Cart:
        cart = Cart(**fields)
        self.db.add(cart)
        self.db.commit()
        self.db.refresh(cart)
        return self.get(cart.id) or cart

    def get(self, cart_id: UUID) -> Cart | None:
        statement = select(Cart).where(Cart.id == cart_id).options(*self._options())
        return self.db.scalars(statement).unique().first()

    def get_by_session_key(self, session_key: str) -> Cart | None:
        statement = (
            select(Cart)
            .where(Cart.session_key == session_key)
            .options(*self._options())
            .order_by(Cart.id.desc())
        )
        return self.db.scalars(statement).unique().first()

    def get_by_customer_id(self, customer_id: UUID) -> Cart | None:
        statement = (
            select(Cart)
            .where(Cart.customer_id == customer_id)
            .options(*self._options())
            .order_by(Cart.id.desc())
        )
        return self.db.scalars(statement).unique().first()

    def save(self, cart: Cart) -> Cart:
        self.db.add(cart)
        self.db.commit()
        self.db.refresh(cart)
        return self.get(cart.id) or cart

    def add_item(self, item: CartItem) -> CartItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        self._expire_items(item.cart_id)
        return item

    def get_item(self, item_id: UUID) -> CartItem | None:
        return self.db.get(CartItem, item_id)

    def save_item(self, item: CartItem) -> CartItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        self._expire_items(item.cart_id)
        return item

    def delete_item(self, item: CartItem) -> None:
        cart_id = item.cart_id
        self.db.delete(item)
        self.db.commit()
        self._expire_items(cart_id)

    def clear_items(self, cart: Cart) -> None:
        for item in list(cart.items):
            self.db.delete(item)
        self.db.commit()
        self._expire_items(cart.id)

    def delete(self, cart: Cart) -> None:
        self.db.delete(cart)
        self.db.commit()

    def _expire_items(self, cart_id: UUID) -> None:
        cart = self.db.get(Cart, cart_id)
        if cart is not None:
            self.db.expire(cart, ["items"])
