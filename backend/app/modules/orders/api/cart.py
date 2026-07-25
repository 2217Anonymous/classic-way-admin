from fastapi import APIRouter, status

from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.identity.api.dependencies import DbSession
from app.modules.orders.repositories.cart_repository import CartRepository
from app.modules.orders.schemas.cart import (
    CartCreate,
    CartItemCreate,
    CartItemUpdate,
    CartResponse,
)
from app.modules.orders.services.cart_service import CartService

router = APIRouter(prefix="/cart", tags=["Cart"])


def get_service(db: DbSession) -> CartService:
    return CartService(CartRepository(db), ProductRepository(db))


@router.post("", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
def create_cart(payload: CartCreate, db: DbSession) -> CartResponse:
    return get_service(db).create_cart(payload)


@router.get("/{cart_id}", response_model=CartResponse)
def get_cart(cart_id: int, db: DbSession) -> CartResponse:
    return get_service(db).get_cart(cart_id)


@router.post("/{cart_id}/items", response_model=CartResponse)
def add_cart_item(cart_id: int, payload: CartItemCreate, db: DbSession) -> CartResponse:
    return get_service(db).add_item(cart_id, payload)


@router.patch("/{cart_id}/items/{item_id}", response_model=CartResponse)
def update_cart_item(
    cart_id: int, item_id: int, payload: CartItemUpdate, db: DbSession
) -> CartResponse:
    return get_service(db).update_item(cart_id, item_id, payload)


@router.delete("/{cart_id}/items/{item_id}", response_model=CartResponse)
def delete_cart_item(cart_id: int, item_id: int, db: DbSession) -> CartResponse:
    return get_service(db).delete_item(cart_id, item_id)
