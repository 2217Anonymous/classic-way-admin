from __future__ import annotations

from uuid import UUID

from app.modules.settings.repositories.theme_repository import ThemeRepository
from app.modules.settings.schemas.theme import ThemeResponse, ThemeUpdate
from app.modules.settings.theme_constants import (
    DEFAULT_THEME,
    default_page_visibility,
    validate_theme_fields,
)
from app.utils.exceptions import AppError


class ThemeService:
    def __init__(self, repository: ThemeRepository):
        self.repository = repository

    def _ensure_default(self):
        row = self.repository.get_default()
        if row:
            return row
        visibility = default_page_visibility()
        return self.repository.create(
            customer_id=None,
            home_theme=DEFAULT_THEME["home_theme"],
            shop_category=DEFAULT_THEME["shop_category"],
            shop_layout=DEFAULT_THEME["shop_layout"],
            product_layout=DEFAULT_THEME["product_layout"],
            blog_layout=DEFAULT_THEME["blog_layout"],
            page_visibility=visibility,
            theme_config=None,
            is_default=True,
            is_active=True,
        )

    def _to_response(self, row, *, source: str) -> ThemeResponse:
        data = ThemeResponse.model_validate(row)
        data.source = source
        if not data.page_visibility:
            data.page_visibility = default_page_visibility()
        return data

    def get_default_theme(self) -> ThemeResponse:
        return self._to_response(self._ensure_default(), source="default")

    def update_default_theme(self, payload: ThemeUpdate) -> ThemeResponse:
        try:
            visibility = validate_theme_fields(
                home_theme=payload.home_theme,
                shop_category=payload.shop_category,
                shop_layout=payload.shop_layout,
                product_layout=payload.product_layout,
                blog_layout=payload.blog_layout,
                page_visibility=payload.page_visibility,
            )
        except ValueError as exc:
            raise AppError(str(exc), 400) from exc

        row = self._ensure_default()
        row.home_theme = payload.home_theme
        row.shop_category = payload.shop_category
        row.shop_layout = payload.shop_layout
        row.product_layout = payload.product_layout
        row.blog_layout = payload.blog_layout
        row.page_visibility = visibility
        row.theme_config = payload.theme_config
        row.is_default = True
        row.is_active = True
        return self._to_response(self.repository.save(row), source="default")

    def resolve_for_customer(self, customer_id: UUID | None) -> ThemeResponse:
        if customer_id is not None:
            custom = self.repository.get_by_customer(customer_id)
            if custom and custom.is_active:
                return self._to_response(custom, source="customer")
        return self.get_default_theme()

    def upsert_customer_theme(
        self, customer_id: UUID, payload: ThemeUpdate
    ) -> ThemeResponse:
        try:
            visibility = validate_theme_fields(
                home_theme=payload.home_theme,
                shop_category=payload.shop_category,
                shop_layout=payload.shop_layout,
                product_layout=payload.product_layout,
                blog_layout=payload.blog_layout,
                page_visibility=payload.page_visibility,
            )
        except ValueError as exc:
            raise AppError(str(exc), 400) from exc

        row = self.repository.get_by_customer(customer_id)
        if row:
            row.home_theme = payload.home_theme
            row.shop_category = payload.shop_category
            row.shop_layout = payload.shop_layout
            row.product_layout = payload.product_layout
            row.blog_layout = payload.blog_layout
            row.page_visibility = visibility
            row.theme_config = payload.theme_config
            row.is_default = False
            row.is_active = True
            return self._to_response(self.repository.save(row), source="customer")

        created = self.repository.create(
            customer_id=customer_id,
            home_theme=payload.home_theme,
            shop_category=payload.shop_category,
            shop_layout=payload.shop_layout,
            product_layout=payload.product_layout,
            blog_layout=payload.blog_layout,
            page_visibility=visibility,
            theme_config=payload.theme_config,
            is_default=False,
            is_active=True,
        )
        return self._to_response(created, source="customer")
