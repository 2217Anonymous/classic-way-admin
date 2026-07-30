"""Theme settings allowed values and defaults (shared validation whitelist)."""

from __future__ import annotations

from typing import Any

HOME_THEMES = ("grocery", "fashion")

SHOP_CATEGORIES = ("classic", "banner", "columns", "list")

SHOP_LAYOUTS_BY_CATEGORY: dict[str, tuple[str, ...]] = {
    "classic": (
        "left-sidebar-col-3",
        "left-sidebar-col-4",
        "right-sidebar-col-3",
        "right-sidebar-col-4",
        "full-width",
    ),
    "banner": (
        "banner-left-sidebar-col-3",
        "banner-left-sidebar-col-4",
        "banner-right-sidebar-col-3",
        "banner-right-sidebar-col-4",
        "banner-full-width",
    ),
    "columns": (
        "full-width-col-3",
        "full-width-col-4",
        "full-width-col-5",
        "full-width-col-6",
        "banner-full-width-col-3",
    ),
    "list": (
        "list-left-sidebar",
        "list-right-sidebar",
        "list-banner-left-sidebar",
        "list-banner-right-sidebar",
        "list-full-col-2",
    ),
}

ALL_SHOP_LAYOUTS = tuple(
    layout for layouts in SHOP_LAYOUTS_BY_CATEGORY.values() for layout in layouts
)

PRODUCT_LAYOUTS = (
    "left-sidebar",
    "right-sidebar",
    "full-width",
    "accordion-left-sidebar",
    "accordion-right-sidebar",
    "accordion-full-width",
)

BLOG_LAYOUTS = (
    "left-sidebar",
    "right-sidebar",
    "full-width",
    "detail-left-sidebar",
    "detail-right-sidebar",
    "detail-full-width",
)

PAGE_VISIBILITY_KEYS = (
    "about_us",
    "contact_us",
    "cart",
    "checkout",
    "compare",
    "faq",
    "login",
    "register",
    "wishlist",
    "terms",
    "track_order",
)

DEFAULT_PAGE_VISIBILITY: dict[str, bool] = {key: True for key in PAGE_VISIBILITY_KEYS}

DEFAULT_THEME: dict[str, Any] = {
    "home_theme": "fashion",
    "shop_category": "classic",
    "shop_layout": "full-width",
    "product_layout": "full-width",
    "blog_layout": "full-width",
    "page_visibility": dict(DEFAULT_PAGE_VISIBILITY),
}


def default_page_visibility() -> dict[str, bool]:
    return dict(DEFAULT_PAGE_VISIBILITY)


def validate_theme_fields(
    *,
    home_theme: str,
    shop_category: str,
    shop_layout: str,
    product_layout: str,
    blog_layout: str,
    page_visibility: dict[str, Any] | None,
) -> dict[str, bool]:
    if home_theme not in HOME_THEMES:
        raise ValueError(f"Invalid home_theme: {home_theme}")
    if shop_category not in SHOP_CATEGORIES:
        raise ValueError(f"Invalid shop_category: {shop_category}")
    allowed_layouts = SHOP_LAYOUTS_BY_CATEGORY.get(shop_category, ())
    if shop_layout not in allowed_layouts:
        raise ValueError(
            f"Invalid shop_layout '{shop_layout}' for category '{shop_category}'"
        )
    if product_layout not in PRODUCT_LAYOUTS:
        raise ValueError(f"Invalid product_layout: {product_layout}")
    if blog_layout not in BLOG_LAYOUTS:
        raise ValueError(f"Invalid blog_layout: {blog_layout}")

    visibility = default_page_visibility()
    if page_visibility:
        for key, value in page_visibility.items():
            if key not in PAGE_VISIBILITY_KEYS:
                raise ValueError(f"Invalid page_visibility key: {key}")
            if not isinstance(value, bool):
                raise ValueError(f"page_visibility.{key} must be boolean")
            visibility[key] = value
    return visibility
