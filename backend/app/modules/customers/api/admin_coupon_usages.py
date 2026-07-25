from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict

from app.modules.customers.repositories.engagement_repository import CouponUsageRepository
from app.modules.iam.api.dependencies import require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User

router = APIRouter(prefix="/admin/coupon-usages", tags=["Admin Coupon Usages"])


class CouponUsageResponse(BaseModel):
    id: UUID
    coupon_id: UUID
    customer_id: UUID
    order_id: UUID | None
    used_at: datetime
    discount_amount: Decimal | None

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=list[CouponUsageResponse])
def list_coupon_usages(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
    coupon_id: UUID | None = Query(default=None),
    customer_id: UUID | None = Query(default=None),
) -> list[CouponUsageResponse]:
    rows = CouponUsageRepository(db).list_all(
        coupon_id=coupon_id, customer_id=customer_id
    )
    return [CouponUsageResponse.model_validate(row) for row in rows]
