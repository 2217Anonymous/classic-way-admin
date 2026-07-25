from __future__ import annotations

from uuid import UUID
from app.modules.orders.repositories.address_repository import AddressRepository
from app.modules.orders.schemas.address import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
)
from app.utils.exceptions import NotFoundError

_EDITABLE_TEXT_FIELDS = (
    "full_name",
    "phone",
    "line1",
    "line2",
    "city",
    "state",
    "postal_code",
    "country",
)


class AddressService:
    """VL-016 — customer address book used during checkout."""

    def __init__(self, repository: AddressRepository):
        self.repository = repository

    def list_addresses(self, user_id: UUID | None = None) -> list[AddressResponse]:
        return [
            AddressResponse.model_validate(row)
            for row in self.repository.list(user_id)
        ]

    def get_address(self, address_id: UUID) -> AddressResponse:
        return AddressResponse.model_validate(self._get_or_404(address_id))

    def create_address(self, payload: AddressCreate) -> AddressResponse:
        if payload.is_default:
            self.repository.unset_default_for_user(payload.user_id)
        row = self.repository.create(
            user_id=payload.user_id,
            customer_id=getattr(payload, "customer_id", None),
            full_name=payload.full_name.strip(),
            phone=payload.phone.strip(),
            line1=payload.line1.strip(),
            line2=payload.line2.strip() if payload.line2 else None,
            city=payload.city.strip(),
            state=payload.state.strip(),
            postal_code=payload.postal_code.strip(),
            country=(payload.country or "India").strip(),
            is_default=payload.is_default,
        )
        return AddressResponse.model_validate(row)

    def update_address(
        self, address_id: UUID, payload: AddressUpdate
    ) -> AddressResponse:
        row = self._get_or_404(address_id)
        changes = payload.model_dump(exclude_unset=True)

        if changes.get("is_default"):
            self.repository.unset_default_for_user(row.user_id)

        for field in _EDITABLE_TEXT_FIELDS:
            if field in changes and changes[field] is not None:
                setattr(row, field, changes[field].strip())
        if "line2" in changes and changes["line2"] is None:
            row.line2 = None
        if "is_default" in changes and changes["is_default"] is not None:
            row.is_default = changes["is_default"]

        row = self.repository.save(row)
        return AddressResponse.model_validate(row)

    def delete_address(self, address_id: UUID) -> None:
        row = self._get_or_404(address_id)
        self.repository.delete(row)

    def _get_or_404(self, address_id: UUID):
        row = self.repository.get(address_id)
        if not row:
            raise NotFoundError("Address not found")
        return row
