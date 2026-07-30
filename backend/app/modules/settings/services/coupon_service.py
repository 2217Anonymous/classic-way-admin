from __future__ import annotations

from uuid import UUID

from sqlalchemy.exc import IntegrityError

from app.modules.settings.repositories.coupon_repository import CouponRepository
from app.modules.settings.schemas.coupon import (
    CouponCreate,
    CouponResponse,
    CouponUpdate,
)
from app.utils.exceptions import AppError, ConflictError, NotFoundError


class CouponService:
    def __init__(self, repository: CouponRepository):
        self.repository = repository

    def list_coupons(self) -> list[CouponResponse]:
        return [
            CouponResponse.model_validate(item) for item in self.repository.list()
        ]

    def create_coupon(self, payload: CouponCreate) -> CouponResponse:
        code = payload.code.strip().upper()
        if self.repository.get_by_code(code):
            raise ConflictError("A coupon with this code already exists")
        if payload.discount_type == "percent" and payload.discount_value > 100:
            raise AppError("Percent discount cannot exceed 100", 400)
        try:
            row = self.repository.create(
                code=code,
                name=payload.name.strip(),
                discount_type=payload.discount_type,
                discount_value=payload.discount_value,
                min_order_amount=payload.min_order_amount,
                max_uses=payload.max_uses,
                used_count=0,
                starts_at=payload.starts_at,
                ends_at=payload.ends_at,
                is_active=payload.is_active,
            )
            return CouponResponse.model_validate(row)
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("A coupon with this code already exists") from exc

    def update_coupon(self, coupon_id: UUID, payload: CouponUpdate) -> CouponResponse:
        row = self.repository.get(coupon_id)
        if not row:
            raise NotFoundError("Coupon not found")

        changes = payload.model_dump(exclude_unset=True)
        if "code" in changes and changes["code"] is not None:
            code = changes["code"].strip().upper()
            existing = self.repository.get_by_code(code)
            if existing and existing.id != coupon_id:
                raise ConflictError("A coupon with this code already exists")
            row.code = code
        if "name" in changes and changes["name"] is not None:
            row.name = changes["name"].strip()
        if "discount_type" in changes and changes["discount_type"] is not None:
            row.discount_type = changes["discount_type"]
        if "discount_value" in changes and changes["discount_value"] is not None:
            row.discount_value = changes["discount_value"]
        if "min_order_amount" in changes:
            row.min_order_amount = changes["min_order_amount"]
        if "max_uses" in changes:
            row.max_uses = changes["max_uses"]
        if "starts_at" in changes:
            row.starts_at = changes["starts_at"]
        if "ends_at" in changes:
            row.ends_at = changes["ends_at"]
        if "is_active" in changes and changes["is_active"] is not None:
            row.is_active = changes["is_active"]

        discount_type = row.discount_type
        if discount_type == "percent" and row.discount_value > 100:
            raise AppError("Percent discount cannot exceed 100", 400)

        try:
            return CouponResponse.model_validate(self.repository.save(row))
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("A coupon with this code already exists") from exc

    def delete_coupon(self, coupon_id: UUID) -> None:
        row = self.repository.get(coupon_id)
        if not row:
            raise NotFoundError("Coupon not found")
        self.repository.delete(row)
