from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.settings.repositories import (
    CouponRepository,
    StoreSettingsRepository,
    TaxRuleRepository,
)
from app.modules.settings.schemas import (
    CouponCreate,
    CouponResponse,
    CouponUpdate,
    StoreSettingsResponse,
    StoreSettingsUpdate,
    TaxRuleCreate,
    TaxRuleResponse,
    TaxRuleUpdate,
)
from app.modules.settings.services import (
    CouponService,
    StoreSettingsService,
    TaxRuleService,
)

router = APIRouter(tags=["Settings"])


def get_store_service(db: DbSession) -> StoreSettingsService:
    return StoreSettingsService(StoreSettingsRepository(db))


def get_tax_service(db: DbSession) -> TaxRuleService:
    return TaxRuleService(TaxRuleRepository(db))


def get_coupon_service(db: DbSession) -> CouponService:
    return CouponService(CouponRepository(db))


@router.get("/store-settings", response_model=StoreSettingsResponse)
def get_store_settings(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> StoreSettingsResponse:
    return get_store_service(db).get_settings()


@router.put("/store-settings", response_model=StoreSettingsResponse)
def update_store_settings(
    payload: StoreSettingsUpdate, db: DbSession, _: AdminUser
) -> StoreSettingsResponse:
    return get_store_service(db).update_settings(payload)


@router.get("/tax-rules", response_model=list[TaxRuleResponse])
def list_tax_rules(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[TaxRuleResponse]:
    return get_tax_service(db).list_rules()


@router.post(
    "/tax-rules",
    response_model=TaxRuleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_tax_rule(
    payload: TaxRuleCreate, db: DbSession, _: AdminUser
) -> TaxRuleResponse:
    return get_tax_service(db).create_rule(payload)


@router.patch("/tax-rules/{tax_id}", response_model=TaxRuleResponse)
def update_tax_rule(
    tax_id: int, payload: TaxRuleUpdate, db: DbSession, _: AdminUser
) -> TaxRuleResponse:
    return get_tax_service(db).update_rule(tax_id, payload)


@router.delete("/tax-rules/{tax_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tax_rule(tax_id: int, db: DbSession, _: AdminUser) -> None:
    get_tax_service(db).delete_rule(tax_id)


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
    coupon_id: int, payload: CouponUpdate, db: DbSession, _: AdminUser
) -> CouponResponse:
    return get_coupon_service(db).update_coupon(coupon_id, payload)


@router.delete("/coupons/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coupon(coupon_id: int, db: DbSession, _: AdminUser) -> None:
    get_coupon_service(db).delete_coupon(coupon_id)
