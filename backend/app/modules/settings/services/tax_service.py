from __future__ import annotations

from uuid import UUID

from sqlalchemy.exc import IntegrityError

from app.modules.settings.repositories.tax_repository import TaxRuleRepository
from app.modules.settings.schemas.tax import TaxRuleCreate, TaxRuleResponse, TaxRuleUpdate
from app.utils.exceptions import ConflictError, NotFoundError


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


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

    def update_rule(self, tax_id: UUID, payload: TaxRuleUpdate) -> TaxRuleResponse:
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

    def delete_rule(self, tax_id: UUID) -> None:
        row = self.repository.get(tax_id)
        if not row:
            raise NotFoundError("Tax rule not found")
        self.repository.delete(row)
