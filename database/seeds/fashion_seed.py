"""Seed fashion catalog data for Valaiyagam shopping storefront.

Usage (from repo root, with DB env configured):

  PYTHONPATH=backend python database/seeds/fashion_seed.py

Idempotent: skips creating rows when slug/code already exists.
"""

from __future__ import annotations

import sys
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from sqlalchemy.orm import Session  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.modules.catalog.models.brand import Brand  # noqa: E402
from app.modules.catalog.models.category import Category  # noqa: E402
from app.modules.catalog.models.product import (  # noqa: E402
    Product,
    ProductAttribute,
    ProductMedia,
    ProductVariant,
)
from app.modules.catalog.repositories.category_repository import (  # noqa: E402
    CategoryRepository,
)
from app.modules.catalog.repositories.product_repository import (  # noqa: E402
    ProductRepository,
)
from app.modules.catalog.repositories.brand_repository import (  # noqa: E402
    BrandRepository,
)
from app.modules.settings.models.coupon import Coupon  # noqa: E402
from app.modules.settings.repositories.coupon_repository import CouponRepository  # noqa: E402

SIZES = ["S", "M", "L", "XL"]
COLORS = ["Black", "White", "Navy", "Olive"]

BRANDS = [
    ("Valaiyagam", "valaiyagam"),
    ("Cotton Co", "cotton-co"),
    ("Urban Thread", "urban-thread"),
]

CATEGORIES = [
    ("Men", "men", "Men's fashion essentials"),
    ("Women", "women", "Women's fashion essentials"),
    ("Unisex", "unisex", "Unisex everyday wear"),
    ("T-Shirts", "t-shirts", "Graphic and plain tees"),
]

PRODUCTS = [
    {
        "name": "Classic Crew Tee",
        "slug": "classic-crew-tee",
        "price": "799.00",
        "compare": "999.00",
        "discount": "20.00",
        "category": "t-shirts",
        "brand": "valaiyagam",
        "featured": True,
        "image": "/tshirts/IMG_5661.PNG",
    },
    {
        "name": "Oversized Street Tee",
        "slug": "oversized-street-tee",
        "price": "999.00",
        "compare": "1299.00",
        "discount": "23.00",
        "category": "t-shirts",
        "brand": "urban-thread",
        "trending": True,
        "image": "/tshirts/IMG_5662.PNG",
    },
    {
        "name": "Heritage Logo Tee",
        "slug": "heritage-logo-tee",
        "price": "899.00",
        "compare": "1099.00",
        "discount": "18.00",
        "category": "men",
        "brand": "valaiyagam",
        "best_seller": True,
        "image": "/tshirts/IMG_5676.PNG",
    },
    {
        "name": "Soft Modal Tee",
        "slug": "soft-modal-tee",
        "price": "1099.00",
        "compare": "1399.00",
        "discount": "21.00",
        "category": "women",
        "brand": "cotton-co",
        "featured": True,
        "image": "/tshirts/IMG_5678.PNG",
    },
    {
        "name": "Everyday Pocket Tee",
        "slug": "everyday-pocket-tee",
        "price": "849.00",
        "compare": "999.00",
        "discount": "15.00",
        "category": "unisex",
        "brand": "cotton-co",
        "image": "/tshirts/IMG_5698.PNG",
    },
    {
        "name": "Relaxed Fit Tee",
        "slug": "relaxed-fit-tee",
        "price": "949.00",
        "compare": "1199.00",
        "discount": "21.00",
        "category": "men",
        "brand": "urban-thread",
        "trending": True,
        "image": "/tshirts/IMG_5699.PNG",
    },
    {
        "name": "Cropped Box Tee",
        "slug": "cropped-box-tee",
        "price": "899.00",
        "compare": "1149.00",
        "discount": "22.00",
        "category": "women",
        "brand": "valaiyagam",
        "best_seller": True,
        "image": "/tshirts/IMG_5700.PNG",
    },
    {
        "name": "Heavyweight Essentials Tee",
        "slug": "heavyweight-essentials-tee",
        "price": "1199.00",
        "compare": "1499.00",
        "discount": "20.00",
        "category": "unisex",
        "brand": "urban-thread",
        "featured": True,
        "image": "/tshirts/IMG_5701.PNG",
    },
    {
        "name": "Summer Wash Tee",
        "slug": "summer-wash-tee",
        "price": "779.00",
        "compare": "999.00",
        "discount": "22.00",
        "category": "t-shirts",
        "brand": "cotton-co",
        "trending": True,
        "image": "/tshirts/IMG_4915.PNG",
    },
    {
        "name": "Minimal Stripe Tee",
        "slug": "minimal-stripe-tee",
        "price": "929.00",
        "compare": "1199.00",
        "discount": "22.00",
        "category": "men",
        "brand": "valaiyagam",
        "image": "/tshirts/IMG_4916.PNG",
    },
    {
        "name": "Studio Fit Tee",
        "slug": "studio-fit-tee",
        "price": "1049.00",
        "compare": "1299.00",
        "discount": "19.00",
        "category": "women",
        "brand": "urban-thread",
        "best_seller": True,
        "image": "/tshirts/IMG_5661.PNG",
    },
    {
        "name": "Weekend Drop Tee",
        "slug": "weekend-drop-tee",
        "price": "869.00",
        "compare": "1099.00",
        "discount": "21.00",
        "category": "unisex",
        "brand": "cotton-co",
        "featured": True,
        "trending": True,
        "image": "/tshirts/IMG_5676.PNG",
    },
]

COUPONS = [
    {
        "code": "WELCOME10",
        "name": "Welcome 10% off",
        "discount_type": "percent",
        "discount_value": "10.00",
        "min_order_amount": "499.00",
        "max_uses": 1000,
    },
    {
        "code": "TEE150",
        "name": "Flat ₹150 off tees",
        "discount_type": "fixed",
        "discount_value": "150.00",
        "min_order_amount": "799.00",
        "max_uses": 500,
    },
    {
        "code": "FREESHIP",
        "name": "Free shipping style discount",
        "discount_type": "fixed",
        "discount_value": "59.00",
        "min_order_amount": "999.00",
        "max_uses": None,
    },
]


def _get_or_create_brand(repo: BrandRepository, name: str, slug: str) -> Brand:
    existing = repo.get_by_slug(slug)
    if existing:
        return existing
    return repo.create(name=name, slug=slug, is_active=True)


def _get_or_create_category(
    repo: CategoryRepository, name: str, slug: str, description: str
) -> Category:
    existing = repo.get_by_slug(slug)
    if existing:
        return existing
    return repo.create(
        name=name,
        slug=slug,
        description=description,
        is_active=True,
        sort_order=0,
    )


def _seed_product(
    db: Session,
    product_repo: ProductRepository,
    categories: dict[str, Category],
    brands: dict[str, Brand],
    data: dict,
) -> None:
    if product_repo.get_by_slug(data["slug"]):
        print(f"  skip product {data['slug']}")
        return

    category = categories[data["category"]]
    brand = brands[data["brand"]]
    price = Decimal(data["price"])
    compare = Decimal(data["compare"])
    discount = Decimal(data["discount"])

    product = product_repo.create(
        name=data["name"],
        slug=data["slug"],
        description=f"{data['name']} — soft cotton jersey with a clean everyday fit.",
        short_description="Premium cotton tee with size and color variants.",
        price=price,
        compare_at_price=compare,
        discount_percent=discount,
        sku=f"VT-{data['slug'][:20].upper()}",
        stock=80,
        tags="fashion,tshirt,cotton",
        visibility="public",
        category_id=category.id,
        brand_id=brand.id,
        is_published=True,
        is_active=True,
        is_featured=bool(data.get("featured")),
        is_trending=bool(data.get("trending")),
        is_best_seller=bool(data.get("best_seller")),
        seo_title=f"{data['name']} | Valaiyagam",
        seo_description=f"Shop {data['name']} online at Valaiyagam.",
        exchangeable=True,
        refundable=True,
        sort_order=0,
    )

    product_repo.replace_attributes(
        product,
        [
            ProductAttribute(name="Size", values=SIZES, sort_order=0),
            ProductAttribute(name="Color", values=COLORS, sort_order=1),
        ],
    )

    variants: list[ProductVariant] = []
    sort = 0
    for color in COLORS[:2]:
        for size in SIZES:
            sku = f"{product.sku}-{color[:3].upper()}-{size}"
            variants.append(
                ProductVariant(
                    sku=sku,
                    price=price,
                    stock=10,
                    options={"Size": size, "Color": color},
                    is_active=True,
                    sort_order=sort,
                )
            )
            sort += 1
    product_repo.replace_variants(product, variants)

    product_repo.add_media(
        ProductMedia(
            product_id=product.id,
            url=data["image"],
            alt_text=data["name"],
            sort_order=0,
            is_primary=True,
        )
    )
    print(f"  created product {data['slug']}")


def seed(db: Session) -> None:
    brand_repo = BrandRepository(db)
    category_repo = CategoryRepository(db)
    product_repo = ProductRepository(db)
    coupon_repo = CouponRepository(db)

    print("Seeding brands...")
    brands = {
        slug: _get_or_create_brand(brand_repo, name, slug) for name, slug in BRANDS
    }

    print("Seeding categories...")
    categories = {
        slug: _get_or_create_category(category_repo, name, slug, desc)
        for name, slug, desc in CATEGORIES
    }

    print("Seeding products...")
    for item in PRODUCTS:
        _seed_product(db, product_repo, categories, brands, item)

    print("Seeding coupons...")
    for row in COUPONS:
        if coupon_repo.get_by_code(row["code"]):
            print(f"  skip coupon {row['code']}")
            continue
        coupon_repo.create(
            code=row["code"],
            name=row["name"],
            discount_type=row["discount_type"],
            discount_value=Decimal(row["discount_value"]),
            min_order_amount=Decimal(row["min_order_amount"])
            if row["min_order_amount"]
            else None,
            max_uses=row["max_uses"],
            used_count=0,
            is_active=True,
        )
        print(f"  created coupon {row['code']}")

    print("Fashion seed complete.")


def main() -> None:
    with SessionLocal() as db:
        seed(db)


if __name__ == "__main__":
    main()
