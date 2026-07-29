from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.settings.repositories.coupon_repository import CouponRepository
from app.modules.settings.schemas.coupon import (
    CouponCreate,
    CouponResponse,
    CouponUpdate,
)
from app.modules.settings.services.coupon_service import CouponService

router = APIRouter(tags=["Settings"])


def get_coupon_service(db: DbSession) -> CouponService:
    return CouponService(CouponRepository(db))


@router.get("/coupons", response_model=list[CouponResponse])
def list_coupons(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[CouponResponse]:
    return get_coupon_service(db).list_coupons()


@router.post(
    "/coupons",
    response_model=CouponResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_coupon(
    payload: CouponCreate, db: DbSession, _: AdminUser
) -> CouponResponse:
    return get_coupon_service(db).create_coupon(payload)


@router.patch("/coupons/{coupon_id}", response_model=CouponResponse)
def update_coupon(
    coupon_id: UUID, payload: CouponUpdate, db: DbSession, _: AdminUser
) -> CouponResponse:
    return get_coupon_service(db).update_coupon(coupon_id, payload)


@router.delete("/coupons/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coupon(coupon_id: UUID, db: DbSession, _: AdminUser) -> None:
    get_coupon_service(db).delete_coupon(coupon_id)
