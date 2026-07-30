from __future__ import annotations

from app.modules.settings.repositories.store_repository import StoreSettingsRepository
from app.modules.settings.schemas.store import StoreSettingsResponse, StoreSettingsUpdate


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
