"""Full T-Shirt ecommerce seed for shared admin + shopping PostgreSQL DB.

Generates realistic related data matching the live schema (UUID PKs):
  - 12 categories, 20 brands, attribute definitions
  - 100 products with variants, media URLs, inventory
  - 50 customers, addresses, wishlists, carts
  - 50 coupons
  - 200 orders (paid/pending/cancelled/returned) + payments + shipments
  - 200 reviews, notifications

Usage (from repo root, with backend/.env configured):

  PYTHONPATH=backend python database/seeds/tshirt_full_seed.py
  PYTHONPATH=backend python database/seeds/tshirt_full_seed.py --reset
  PYTHONPATH=backend python database/seeds/tshirt_full_seed.py --sql-out database/seeds/sql/generated

Idempotent by product slug / customer email / coupon code / order_number.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import UUID, uuid4, uuid5, NAMESPACE_URL

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.modules.catalog.models.attribute import AttributeDefinition  # noqa: E402
from app.modules.catalog.models.brand import Brand  # noqa: E402
from app.modules.catalog.models.category import Category  # noqa: E402
from app.modules.catalog.models.product import (  # noqa: E402
    Product,
    ProductAttribute,
    ProductMedia,
    ProductVariant,
)
from app.modules.customers.models import (  # noqa: E402
    Customer,
    Review,
    Wishlist,
    WishlistItem,
)
from app.modules.fulfillment.models import Shipment, ShipmentEvent  # noqa: E402
from app.modules.inventory.models.inventory import (  # noqa: E402
    InventoryItem,
    InventorySettings,
)
from app.modules.notifications.models import Notification  # noqa: E402
from app.modules.orders.models.address import CustomerAddress  # noqa: E402
from app.modules.orders.models.cart import Cart, CartItem  # noqa: E402
from app.modules.orders.models.order import (  # noqa: E402
    Order,
    OrderItem,
    OrderStatusHistory,
)
from app.modules.payments.models.payment import Payment, Refund  # noqa: E402
from app.modules.settings.models.coupon import Coupon  # noqa: E402
from app.modules.settings.models.store import StoreSettings  # noqa: E402

SEED = 42
NS = NAMESPACE_URL
rng = random.Random(SEED)

COLORS = [
    "Black", "White", "Navy", "Olive", "Red", "Maroon", "Grey", "Charcoal",
    "Beige", "Cream", "Yellow", "Mustard", "Green", "Forest", "Blue",
    "Sky Blue", "Purple", "Pink", "Orange", "Brown",
]
SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
FABRICS = [
    "Cotton", "Bio Wash", "Organic Cotton", "Poly Cotton", "Dry Fit", "Linen Blend",
]
NECKS = ["Round Neck", "Polo", "V Neck", "Henley", "Mandarin"]
SLEEVES = ["Half Sleeve", "Full Sleeve", "Sleeveless"]
GENDERS = ["Men", "Women", "Unisex", "Kids"]

BRANDS = [
    ("Classic Way", "classic-way"),
    ("Urban Wear", "urban-wear"),
    ("Street Style", "street-style"),
    ("Elite Cotton", "elite-cotton"),
    ("Trend Fit", "trend-fit"),
    ("Cotton Co", "cotton-co"),
    ("Valaiyagam", "valaiyagam"),
    ("Urban Thread", "urban-thread"),
    ("North Loom", "north-loom"),
    ("Coast & Co", "coast-and-co"),
    ("Peak Athletic", "peak-athletic"),
    ("Soft Form", "soft-form"),
    ("Bold Ink", "bold-ink"),
    ("Daily Knit", "daily-knit"),
    ("Harbor Tees", "harbor-tees"),
    ("Metro Basics", "metro-basics"),
    ("Indie Loom", "indie-loom"),
    ("Aether Wear", "aether-wear"),
    ("Cedar Street", "cedar-street"),
    ("Nova Cotton", "nova-cotton"),
]

CATEGORIES = [
    ("Men's T-Shirts", "mens-t-shirts", None, 1),
    ("Women's T-Shirts", "womens-t-shirts", None, 2),
    ("Oversized", "oversized", "mens-t-shirts", 3),
    ("Polo", "polo", "mens-t-shirts", 4),
    ("Printed", "printed", "mens-t-shirts", 5),
    ("Graphic", "graphic", "womens-t-shirts", 6),
    ("Full Sleeve", "full-sleeve", "mens-t-shirts", 7),
    ("Half Sleeve", "half-sleeve", "mens-t-shirts", 8),
    ("Premium Cotton", "premium-cotton", None, 9),
    ("Sports Wear", "sports-wear", None, 10),
    ("Kids T-Shirts", "kids-t-shirts", None, 11),
    ("Unisex Basics", "unisex-basics", None, 12),
]

STYLES = [
    "Classic Crew", "Oversized Street", "Premium Polo", "Graphic Drop",
    "Heritage Logo", "Soft Modal", "Everyday Pocket", "Relaxed Fit",
    "Athletic Dry", "Bio Wash Essential", "Organic Basic", "Henley Soft",
    "V-Neck Slim", "Mandarin Collar", "Full Sleeve Core", "Sleeveless Tank",
    "Printed Wave", "Urban Boxy", "Coastal Linen", "Metro Slim",
]

CITIES = [
    ("Chennai", "Tamil Nadu", "600001"),
    ("Bengaluru", "Karnataka", "560001"),
    ("Hyderabad", "Telangana", "500001"),
    ("Mumbai", "Maharashtra", "400001"),
    ("Pune", "Maharashtra", "411001"),
    ("Delhi", "Delhi", "110001"),
    ("Jaipur", "Rajasthan", "302001"),
    ("Kochi", "Kerala", "682001"),
]

COURIERS = ["Delhivery", "BlueDart", "DTDC", "Ecom Express", "Shadowfax"]
PAY_METHODS = ["upi", "card", "debit_card", "netbanking", "cod", "wallet"]
REVIEW_BODIES = [
    "Great fabric and fit. Washed well after two cycles.",
    "Color is true to the photos. Soft on skin.",
    "Slightly oversized as described — love the street look.",
    "Good value for money. Will order another color.",
    "Stitching is neat. Perfect everyday tee.",
    "Polo collar holds shape. Office + weekend ready.",
    "Print quality is sharp. No cracking so far.",
    "Runs a bit small — size up if between sizes.",
    "Premium feel for the price. Highly recommended.",
    "Delivery was quick and packing was clean.",
]

TRUNCATE_SQL = """
TRUNCATE TABLE
  coupon_usages, review_images, reviews, notifications,
  shipment_events, shipments, refunds, payment_events, payments,
  order_status_history, order_items, orders, cart_items, carts,
  wishlist_items, wishlists, compare_items, compare_lists,
  customer_addresses, refresh_tokens, customers,
  stock_movements, inventory_items, product_media, product_variants,
  product_attributes, products, attribute_definitions, brands, categories, coupons
RESTART IDENTITY CASCADE
"""


def uid(key: str) -> UUID:
    return uuid5(NS, f"classic-way-seed:{key}")


def money(value: float | int | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def placeholder(label: str, bg: str = "1a1a1a") -> str:
    safe = label.replace(" ", "+")
    return f"https://placehold.co/900x1100/{bg}/ffffff?text={safe}"


def unsplash(photo_id: str) -> str:
    # Stable Unsplash source URLs (public CDN) — replace with S3 keys later.
    return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w=900&q=80"


TEE_PHOTOS = [
    "photo-1521572163474-6864f9cf17ab",  # plain tee
    "photo-1583743814966-8936f5b7be1a",  # black tee
    "photo-1576566588028-4147f3842f27",  # graphic
    "photo-1618354691373-d851c5c3a990",  # folded
    "photo-1562157873-818bc0726f68",  # rack
    "photo-1503342217505-b0a15ec3261c",  # white tee
]


def product_images(index: int, name: str) -> list[tuple[str, bool]]:
    """Return 4 gallery URLs; first is primary. Easy to swap for S3 later."""
    base = TEE_PHOTOS[index % len(TEE_PHOTOS)]
    color_hex = ["111111", "f5f5f5", "1e3a5f", "3f6212", "7f1d1d", "374151"][index % 6]
    return [
        (unsplash(base), True),
        (placeholder(f"{name}+Front", color_hex), False),
        (placeholder(f"{name}+Back", color_hex), False),
        (placeholder(f"{name}+Detail", color_hex), False),
    ]


def get_or_create_brand(db: Session, name: str, slug: str, sort: int) -> Brand:
    row = db.query(Brand).filter(Brand.slug == slug).one_or_none()
    if row:
        return row
    row = Brand(id=uid(f"brand:{slug}"), name=name, slug=slug, is_active=True)
    db.add(row)
    db.flush()
    return row


def get_or_create_category(
    db: Session,
    name: str,
    slug: str,
    parent: Category | None,
    sort: int,
) -> Category:
    row = db.query(Category).filter(Category.slug == slug).one_or_none()
    if row:
        return row
    row = Category(
        id=uid(f"category:{slug}"),
        name=name,
        slug=slug,
        description=f"{name} collection for Classic Way storefront",
        parent_id=parent.id if parent else None,
        is_active=True,
        sort_order=sort,
        image_url=placeholder(name, "2d3748"),
    )
    db.add(row)
    db.flush()
    return row


def seed_attributes(db: Session) -> None:
    defs = [
        ("Color", COLORS, 1),
        ("Size", SIZES, 2),
        ("Fabric", FABRICS, 3),
        ("Neck Type", NECKS, 4),
        ("Sleeve Type", SLEEVES, 5),
        ("Gender", GENDERS, 6),
    ]
    for name, values, sort in defs:
        existing = (
            db.query(AttributeDefinition)
            .filter(AttributeDefinition.name == name)
            .one_or_none()
        )
        if existing:
            continue
        db.add(
            AttributeDefinition(
                id=uid(f"attr:{name}"),
                name=name,
                values=values,
                sort_order=sort,
                is_active=True,
            )
        )
    db.flush()


def seed_store_and_inventory_settings(db: Session) -> None:
    if not db.query(StoreSettings).first():
        db.add(
            StoreSettings(
                id=uid("store-settings"),
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
        )
    if not db.query(InventorySettings).first():
        db.add(
            InventorySettings(id=uid("inventory-settings"), low_stock_threshold=10)
        )
    db.flush()


def seed_catalog(db: Session) -> tuple[list[Product], dict[str, Brand], dict[str, Category]]:
    brands = {
        slug: get_or_create_brand(db, name, slug, i)
        for i, (name, slug) in enumerate(BRANDS, start=1)
    }
    categories: dict[str, Category] = {}
    for name, slug, parent_slug, sort in CATEGORIES:
        parent = categories.get(parent_slug) if parent_slug else None
        categories[slug] = get_or_create_category(db, name, slug, parent, sort)

    products: list[Product] = []
    for i in range(1, 101):
        slug = f"tee-{i:03d}"
        existing = db.query(Product).filter(Product.slug == slug).one_or_none()
        if existing:
            products.append(existing)
            continue

        brand = brands[BRANDS[(i - 1) % len(BRANDS)][1]]
        cat_slug = CATEGORIES[(i - 1) % len(CATEGORIES)][1]
        category = categories[cat_slug]
        style = STYLES[(i - 1) % len(STYLES)]
        gender = GENDERS[(i - 1) % len(GENDERS)]
        fabric = FABRICS[(i - 1) % len(FABRICS)]
        neck = NECKS[(i - 1) % len(NECKS)]
        sleeve = SLEEVES[(i - 1) % len(SLEEVES)]
        color_a = COLORS[(i - 1) % len(COLORS)]
        color_b = COLORS[(i * 3) % len(COLORS)]
        if color_b == color_a:
            color_b = COLORS[(i * 3 + 1) % len(COLORS)]
        product_colors = [color_a, color_b]
        product_sizes = SIZES[1:5]  # S M L XL for sellable matrix

        mrp = money(799 + (i % 12) * 50)
        discount = money(10 + (i % 25))
        price = (mrp * (Decimal(100) - discount) / Decimal(100)).quantize(
            Decimal("0.01")
        )
        name = f"{brand.name} {style} {color_a} T-Shirt"

        product = Product(
            id=uid(f"product:{slug}"),
            name=name,
            slug=slug,
            short_description=f"{gender} {fabric} {neck} tee in {color_a}.",
            description=(
                f"{name} crafted in {fabric.lower()} with a {neck.lower()} and "
                f"{sleeve.lower()}. Ideal for everyday wear. Gender: {gender}. "
                f"Machine wash cold. GST inclusive pricing shown at checkout."
            ),
            price=price,
            compare_at_price=mrp,
            discount_percent=discount,
            sku=f"CW-TEE-{i:03d}",
            manufacturer_name="Classic Way Apparel",
            manufacturer_brand=brand.name,
            stock=0,
            tags=f"tshirt,{gender.lower()},{fabric.lower().replace(' ', '-')},{cat_slug}",
            visibility="public",
            published_at=datetime.utcnow() - timedelta(days=120 - (i % 100)),
            category_id=category.id,
            brand_id=brand.id,
            is_published=True,
            is_active=True,
            is_featured=(i % 7 == 0),
            is_trending=(i % 5 == 0),
            is_best_seller=(i % 9 == 0),
            seo_title=f"Buy {name} | Classic Way",
            seo_description=f"Shop {name}. Soft {fabric}, sizes S–XL. Free shipping over ₹999.",
            exchangeable=True,
            refundable=True,
            sort_order=i,
        )
        db.add(product)
        db.flush()

        attrs = [
            ("Size", product_sizes, 1),
            ("Color", product_colors, 2),
            ("Fabric", [fabric], 3),
            ("Neck Type", [neck], 4),
            ("Sleeve Type", [sleeve], 5),
            ("Gender", [gender], 6),
        ]
        for aname, values, sort in attrs:
            db.add(
                ProductAttribute(
                    id=uid(f"pattr:{slug}:{aname}"),
                    product_id=product.id,
                    name=aname,
                    values=values,
                    sort_order=sort,
                )
            )

        total_stock = 0
        sort = 0
        for color in product_colors:
            for size in product_sizes:
                sort += 1
                vsku = f"CW-TEE-{i:03d}-{color[:3].upper()}-{size}"
                vstock = 5 + ((i + sort) % 40)
                # Keep some low-stock SKUs for dashboard alerts
                if i % 17 == 0 and size == "S":
                    vstock = rng.randint(0, 8)
                variant = ProductVariant(
                    id=uid(f"variant:{vsku}"),
                    product_id=product.id,
                    sku=vsku,
                    price=price,
                    stock=vstock,
                    options={"Size": size, "Color": color},
                    is_active=True,
                    sort_order=sort,
                )
                db.add(variant)
                db.flush()
                db.add(
                    InventoryItem(
                        id=uid(f"inv:{vsku}"),
                        product_id=product.id,
                        variant_id=variant.id,
                        sku=vsku,
                        quantity=vstock,
                        reserved=0,
                    )
                )
                total_stock += vstock

        product.stock = total_stock

        for idx, (url, primary) in enumerate(product_images(i, style)):
            db.add(
                ProductMedia(
                    id=uid(f"media:{slug}:{idx}"),
                    product_id=product.id,
                    url=url,
                    alt_text=f"{name} image {idx + 1}",
                    sort_order=idx,
                    is_primary=primary,
                    storage_provider="url",
                    original_filename=f"{slug}-{idx}.jpg",
                    original_mime_type="image/jpeg",
                    width=900,
                    height=1100,
                )
            )

        products.append(product)

    db.flush()
    return products, brands, categories


def seed_coupons(db: Session) -> list[Coupon]:
    coupons: list[Coupon] = []
    templates = [
        ("WELCOME10", "Welcome 10% Off", "percent", "10", None, True),
        ("FIRSTORDER", "First Order 15%", "percent", "15", "999", True),
        ("FLAT150", "Flat ₹150 Off", "fixed", "150", "799", True),
        ("FREESHIP", "Free Shipping", "fixed", "59", "499", True),
        ("FESTIVE20", "Festival 20% Off", "percent", "20", "1299", True),
    ]
    for code, name, dtype, value, minimum, active in templates:
        if db.query(Coupon).filter(Coupon.code == code).one_or_none():
            continue
        coupons.append(
            Coupon(
                id=uid(f"coupon:{code}"),
                code=code,
                name=name,
                discount_type=dtype,
                discount_value=money(value),
                min_order_amount=money(minimum) if minimum else None,
                max_uses=500,
                used_count=0,
                starts_at=datetime.utcnow() - timedelta(days=30),
                ends_at=datetime.utcnow() + timedelta(days=180),
                is_active=active,
            )
        )
    for i in range(1, 46):
        code = f"TEE{i:02d}"
        if db.query(Coupon).filter(Coupon.code == code).one_or_none():
            continue
        percent = i % 2 == 0
        coupons.append(
            Coupon(
                id=uid(f"coupon:{code}"),
                code=code,
                name=f"Tee Offer {i}",
                discount_type="percent" if percent else "fixed",
                discount_value=money(5 + (i % 20) if percent else 50 + (i % 10) * 10),
                min_order_amount=money(500 + (i % 5) * 100),
                max_uses=100 + i,
                used_count=i % 12,
                starts_at=datetime.utcnow() - timedelta(days=i),
                ends_at=datetime.utcnow() + timedelta(days=60 + i),
                is_active=True,
            )
        )
    db.add_all(coupons)
    db.flush()
    return db.query(Coupon).all()


def seed_customers(db: Session, products: list[Product]) -> list[Customer]:
    # One hash reused for demo speed — password: Customer123!
    hashed = hash_password("Customer123!")
    customers: list[Customer] = []
    for i in range(1, 51):
        email = f"customer{i:02d}@classicway.example"
        existing = db.query(Customer).filter(Customer.email == email).one_or_none()
        if existing:
            customers.append(existing)
            continue
        city, state, pin = CITIES[(i - 1) % len(CITIES)]
        customer = Customer(
            id=uid(f"customer:{email}"),
            email=email,
            full_name=f"Customer {i:02d}",
            phone=f"+91 98{i:02d}00{i:04d}"[:14],
            hashed_password=hashed,
            is_active=True,
            email_verified=True,
        )
        db.add(customer)
        db.flush()
        db.add(
            CustomerAddress(
                id=uid(f"address:{email}:ship"),
                customer_id=customer.id,
                full_name=customer.full_name,
                phone=customer.phone,
                line1=f"{i} Residency Road",
                line2="Apartment block A",
                city=city,
                state=state,
                postal_code=pin,
                country="India",
                is_default=True,
            )
        )
        wishlist = Wishlist(id=uid(f"wishlist:{email}"), customer_id=customer.id)
        db.add(wishlist)
        db.flush()
        for product in rng.sample(products, k=min(5, len(products))):
            db.add(
                WishlistItem(
                    id=uid(f"wli:{email}:{product.slug}"),
                    wishlist_id=wishlist.id,
                    product_id=product.id,
                )
            )
        if i <= 20:
            cart = Cart(
                id=uid(f"cart:{email}"),
                customer_id=customer.id,
                session_key=f"seed-cart-{i:02d}",
                coupon_code="WELCOME10" if i % 3 == 0 else None,
            )
            db.add(cart)
            db.flush()
            for product in rng.sample(products, k=min(3, len(products))):
                variant = product.variants[0] if product.variants else None
                qty = rng.randint(1, 3)
                unit = variant.price or product.price
                db.add(
                    CartItem(
                        id=uid(f"ci:{email}:{product.slug}"),
                        cart_id=cart.id,
                        product_id=product.id,
                        variant_id=variant.id if variant else None,
                        quantity=qty,
                        unit_price=unit,
                        product_name=product.name,
                        sku=variant.sku if variant else product.sku,
                    )
                )
        customers.append(customer)
    db.flush()
    return customers


def seed_orders(
    db: Session, customers: list[Customer], products: list[Product]
) -> list[Order]:
    plan = (
        [("paid", 70), ("delivered", 30)]
        + [("pending", 50)]
        + [("cancelled", 25)]
        + [("returned", 25)]
    )
    statuses: list[str] = []
    for status, count in plan:
        statuses.extend([status] * count)
    rng.shuffle(statuses)

    orders: list[Order] = []
    for idx, status in enumerate(statuses, start=1):
        order_number = f"CW-2026-{idx:05d}"
        if db.query(Order).filter(Order.order_number == order_number).one_or_none():
            continue
        customer = customers[(idx - 1) % len(customers)]
        city, state, pin = CITIES[(idx - 1) % len(CITIES)]
        chosen = rng.sample(products, k=rng.randint(1, 3))
        subtotal = Decimal("0.00")
        line_rows: list[tuple[Product, ProductVariant | None, int, Decimal]] = []
        for product in chosen:
            variant = rng.choice(product.variants) if product.variants else None
            qty = rng.randint(1, 2)
            unit = (variant.price if variant and variant.price else product.price)
            subtotal += unit * qty
            line_rows.append((product, variant, qty, unit))

        shipping = money(0 if subtotal >= 999 else 59)
        discount = money(0)
        if idx % 4 == 0:
            discount = money(min(150, float(subtotal) * 0.1))
        tax = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
        total = subtotal + shipping + tax - discount
        created = datetime.utcnow() - timedelta(days=rng.randint(1, 90), hours=idx % 20)

        # Free-form statuses (schema is VARCHAR): paid/pending/cancelled/delivered/returned
        order = Order(
            id=uid(f"order:{order_number}"),
            order_number=order_number,
            customer_id=customer.id,
            status=status,
            payment_method="cod" if idx % 5 == 0 else "razorpay",
            subtotal=subtotal,
            shipping_amount=shipping,
            tax_amount=tax,
            discount_amount=discount,
            total=total,
            currency="INR",
            shipping_name=customer.full_name,
            shipping_phone=customer.phone,
            shipping_line1=f"{idx} Lake View Street",
            shipping_city=city,
            shipping_state=state,
            shipping_postal_code=pin,
            shipping_country="India",
            coupon_code="WELCOME10" if discount > 0 else None,
            notes="Customer return — seed" if status == "returned" else None,
            created_at=created,
            updated_at=created,
        )
        db.add(order)
        db.flush()

        for p, v, qty, unit in line_rows:
            db.add(
                OrderItem(
                    id=uid(f"oi:{order_number}:{p.slug}"),
                    order_id=order.id,
                    product_id=p.id,
                    variant_id=v.id if v else None,
                    sku=v.sku if v else p.sku,
                    name=p.name,
                    quantity=qty,
                    unit_price=unit,
                    line_total=unit * qty,
                )
            )

        history = [("draft", "pending")]
        if status in {"paid", "delivered", "returned"}:
            history.append(("pending", "paid"))
        if status == "delivered":
            history.append(("paid", "delivered"))
        if status == "cancelled":
            history.append(("pending", "cancelled"))
        if status == "returned":
            history.append(("paid", "returned"))
        for fr, to in history:
            db.add(
                OrderStatusHistory(
                    id=uid(f"osh:{order_number}:{fr}:{to}"),
                    order_id=order.id,
                    from_status=fr,
                    to_status=to,
                    note=f"Seed transition to {to}",
                    created_at=created,
                )
            )

        method = PAY_METHODS[(idx - 1) % len(PAY_METHODS)]
        pay_status = {
            "pending": "created",
            "cancelled": "failed",
            "paid": "paid",
            "delivered": "paid",
            "returned": "refunded",
        }.get(status, "created")
        payment = Payment(
            id=uid(f"pay:{order_number}"),
            order_id=order.id,
            provider="razorpay" if order.payment_method == "razorpay" else "cod",
            provider_order_id=f"order_demo_{idx:05d}",
            provider_payment_id=f"pay_demo_{idx:05d}" if pay_status == "paid" else None,
            amount=total,
            currency="INR",
            status=pay_status,
            method=method,
            created_at=created,
            updated_at=created,
        )
        db.add(payment)
        db.flush()

        if status == "returned":
            db.add(
                Refund(
                    id=uid(f"refund:{order_number}"),
                    payment_id=payment.id,
                    order_id=order.id,
                    amount=total,
                    reason="Customer return — seed",
                    status="processed",
                    provider_refund_id=f"rfnd_demo_{idx:05d}",
                    created_at=created + timedelta(days=3),
                )
            )

        if status in {"paid", "delivered", "returned"}:
            ship_status = {
                "paid": "in_transit",
                "delivered": "delivered",
                "returned": "rto",
            }[status]
            shipment = Shipment(
                id=uid(f"ship:{order_number}"),
                order_id=order.id,
                courier_provider=COURIERS[(idx - 1) % len(COURIERS)],
                awb=f"AWB{100000 + idx}",
                status=ship_status,
                pickup_scheduled_at=created + timedelta(days=1),
                exception_flag=(status == "returned"),
                exception_reason="Return to origin" if status == "returned" else None,
                created_at=created + timedelta(hours=6),
                updated_at=created + timedelta(days=2),
            )
            db.add(shipment)
            db.flush()
            db.add(
                ShipmentEvent(
                    id=uid(f"se:{order_number}:created"),
                    shipment_id=shipment.id,
                    status="created",
                    message="Shipment created",
                    event_at=created + timedelta(hours=6),
                    source="seed",
                )
            )
            db.add(
                ShipmentEvent(
                    id=uid(f"se:{order_number}:latest"),
                    shipment_id=shipment.id,
                    status=ship_status,
                    message=f"Status {ship_status}",
                    event_at=created + timedelta(days=2),
                    source="seed",
                )
            )

        db.add(
            Notification(
                id=uid(f"notif:{order_number}"),
                channel="email",
                template_key={
                    "pending": "order_confirmation",
                    "cancelled": "order_confirmation",
                    "paid": "payment_received",
                    "delivered": "order_delivered",
                    "returned": "order_shipped",
                }[status],
                recipient=customer.email,
                subject=f"Order {order_number} update",
                body=f"Your order {order_number} is now {order.status}.",
                status="sent",
                related_order_id=order.id,
                created_at=created,
            )
        )
        orders.append(order)

    db.flush()
    return orders


def seed_reviews(db: Session, customers: list[Customer], products: list[Product]) -> None:
    count = 0
    for i in range(200):
        customer = customers[i % len(customers)]
        product = products[i % len(products)]
        key = f"review:{customer.email}:{product.slug}:{i}"
        # Avoid unique collisions on reruns by id only
        existing = db.get(Review, uid(key))
        if existing:
            continue
        db.add(
            Review(
                id=uid(key),
                product_id=product.id,
                customer_id=customer.id,
                rating=1 + (i % 5),
                title=["Okay", "Good", "Great", "Excellent", "Love it"][i % 5],
                body=REVIEW_BODIES[i % len(REVIEW_BODIES)],
                is_verified_purchase=(i % 2 == 0),
                is_approved=True,
            )
        )
        count += 1
    db.flush()
    print(f"  reviews: +{count}")


def seed_extra_notifications(db: Session, customers: list[Customer]) -> None:
    templates = [
        ("email", "coupon_available", "New coupon for you", "Use WELCOME10 on your next tee."),
        ("email", "wishlist_price_drop", "Wishlist price drop", "An item on your wishlist is cheaper now."),
        ("sms", "payment_received", None, "Payment received for your Classic Way order."),
    ]
    for i, customer in enumerate(customers[:30], start=1):
        channel, key, subject, body = templates[i % len(templates)]
        db.add(
            Notification(
                id=uid(f"notif-extra:{customer.email}:{key}"),
                channel=channel,
                template_key=key,
                recipient=customer.email if channel == "email" else (customer.phone or customer.email),
                subject=subject,
                body=body,
                status="sent",
            )
        )
    db.flush()


def export_sql_snapshot(db: Session, out_dir: Path) -> None:
    """Export row counts helper SQL for operators (not full dump)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    counts = db.execute(
        text(
            """
            SELECT 'brands' AS t, count(*) FROM brands
            UNION ALL SELECT 'categories', count(*) FROM categories
            UNION ALL SELECT 'products', count(*) FROM products
            UNION ALL SELECT 'product_variants', count(*) FROM product_variants
            UNION ALL SELECT 'product_media', count(*) FROM product_media
            UNION ALL SELECT 'customers', count(*) FROM customers
            UNION ALL SELECT 'orders', count(*) FROM orders
            UNION ALL SELECT 'payments', count(*) FROM payments
            UNION ALL SELECT 'shipments', count(*) FROM shipments
            UNION ALL SELECT 'reviews', count(*) FROM reviews
            UNION ALL SELECT 'coupons', count(*) FROM coupons
            UNION ALL SELECT 'notifications', count(*) FROM notifications
            """
        )
    ).all()
    lines = [
        "-- Seed verification snapshot",
        "-- Generated by tshirt_full_seed.py --sql-out",
        "BEGIN;",
        "SELECT 'table' AS name, 0 AS rows WHERE false;",
    ]
    for name, count in counts:
        lines.append(f"-- {name}: {count}")
    lines.append("COMMIT;")
    (out_dir / "99_seed_counts.sql").write_text("\n".join(lines) + "\n", encoding="utf-8")
    meta = {name: int(count) for name, count in counts}
    (out_dir / "seed_counts.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Wrote verification files to {out_dir}")


def run(reset: bool, sql_out: Path | None) -> None:
    db = SessionLocal()
    try:
        if reset:
            print("Resetting seed tables...")
            db.execute(text(TRUNCATE_SQL))
            db.commit()

        print("Seeding master + catalog...")
        seed_store_and_inventory_settings(db)
        seed_attributes(db)
        products, _, _ = seed_catalog(db)
        print(f"  products: {len(products)}")

        print("Seeding coupons...")
        coupons = seed_coupons(db)
        print(f"  coupons: {len(coupons)}")

        print("Seeding customers / wishlist / cart...")
        customers = seed_customers(db, products)
        print(f"  customers: {len(customers)}")

        print("Seeding orders / payments / shipments...")
        orders = seed_orders(db, customers, products)
        print(f"  orders: {len(orders)}")

        print("Seeding reviews + notifications...")
        seed_reviews(db, customers, products)
        seed_extra_notifications(db, customers)

        db.commit()
        print("Seed complete.")

        if sql_out:
            export_sql_snapshot(db, sql_out)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Classic Way T-Shirt ecommerce data")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Truncate seed-related tables before inserting",
    )
    parser.add_argument(
        "--sql-out",
        type=Path,
        default=None,
        help="Write count verification SQL/JSON to this directory",
    )
    args = parser.parse_args()
    run(reset=args.reset, sql_out=args.sql_out)


if __name__ == "__main__":
    main()
