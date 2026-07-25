from __future__ import annotations

from sqlalchemy.exc import IntegrityError

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
from app.utils.exceptions import AppError, ConflictError, NotFoundError


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


class StoreSettingsService:
    def __init__(self, repository: StoreSettingsRepository):
        self.repository = repository

    def get_settings(self) -> StoreSettingsResponse:
        row = self.repository.get_singleton()
        if not row:
            row = self.repository.create(
                store_name="Classic Way",
                legal_name="Classic Way Retail Pvt Ltd",
                email="hello@classicway.example",
                phone="+91 98765 43210",
                address_line1="12 Market Street",
                city="Chennai",
                state="Tamil Nadu",
                postal_code="600001",
                country="India",
                currency="INR",
                timezone="Asia/Kolkata",
            )
        return StoreSettingsResponse.model_validate(row)

    def update_settings(self, payload: StoreSettingsUpdate) -> StoreSettingsResponse:
        row = self.repository.get_singleton()
        if not row:
            row = self.repository.create(store_name=payload.store_name.strip())

        row.store_name = payload.store_name.strip()
        row.legal_name = _clean(payload.legal_name)
        row.email = _clean(payload.email)
        row.phone = _clean(payload.phone)
        row.address_line1 = _clean(payload.address_line1)
        row.address_line2 = _clean(payload.address_line2)
        row.city = _clean(payload.city)
        row.state = _clean(payload.state)
        row.postal_code = _clean(payload.postal_code)
        row.country = _clean(payload.country)
        row.currency = payload.currency.strip().upper() or "INR"
        row.timezone = payload.timezone.strip() or "Asia/Kolkata"
        return StoreSettingsResponse.model_validate(self.repository.save(row))


class TaxRuleService:
    def __init__(self, repository: TaxRuleRepository):
        self.repository = repository

    def list_rules(self) -> list[TaxRuleResponse]:
        return [
            TaxRuleResponse.model_validate(item) for item in self.repository.list()
        ]

    def create_rule(self, payload: TaxRuleCreate) -> TaxRuleResponse:
        code = payload.code.strip().upper()
        if self.repository.get_by_code(code):
            raise ConflictError("A tax rule with this code already exists")
        try:
            row = self.repository.create(
                name=payload.name.strip(),
                code=code,
                rate_percent=payload.rate_percent,
                is_inclusive=payload.is_inclusive,
                country=_clean(payload.country),
                state=_clean(payload.state),
                is_active=payload.is_active,
                sort_order=payload.sort_order,
            )
            return TaxRuleResponse.model_validate(row)
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("A tax rule with this code already exists") from exc

    def update_rule(self, tax_id: int, payload: TaxRuleUpdate) -> TaxRuleResponse:
        row = self.repository.get(tax_id)
        if not row:
            raise NotFoundError("Tax rule not found")

        changes = payload.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] is not None:
            row.name = changes["name"].strip()
        if "code" in changes and changes["code"] is not None:
            code = changes["code"].strip().upper()
            existing = self.repository.get_by_code(code)
            if existing and existing.id != tax_id:
                raise ConflictError("A tax rule with this code already exists")
            row.code = code
        if "rate_percent" in changes and changes["rate_percent"] is not None:
            row.rate_percent = changes["rate_percent"]
        if "is_inclusive" in changes and changes["is_inclusive"] is not None:
            row.is_inclusive = changes["is_inclusive"]
        if "country" in changes:
            row.country = _clean(changes["country"])
        if "state" in changes:
            row.state = _clean(changes["state"])
        if "is_active" in changes and changes["is_active"] is not None:
            row.is_active = changes["is_active"]
        if "sort_order" in changes and changes["sort_order"] is not None:
            row.sort_order = changes["sort_order"]

        try:
            return TaxRuleResponse.model_validate(self.repository.save(row))
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("A tax rule with this code already exists") from exc

    def delete_rule(self, tax_id: int) -> None:
        row = self.repository.get(tax_id)
        if not row:
            raise NotFoundError("Tax rule not found")
        self.repository.delete(row)


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

    def update_coupon(self, coupon_id: int, payload: CouponUpdate) -> CouponResponse:
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

    def delete_coupon(self, coupon_id: int) -> None:
        row = self.repository.get(coupon_id)
        if not row:
            raise NotFoundError("Coupon not found")
        self.repository.delete(row)
