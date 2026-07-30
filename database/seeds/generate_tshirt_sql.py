"""Generate production-ready PostgreSQL seed SQL for Classic Way T-Shirt store.

Matches the live shared-DB schema (UUID PKs). Does NOT invent columns that
do not exist (no barcode/GST product columns). Size/Color live on
product_variants.options JSON; Fabric/Gender/Neck/Sleeve on product_attributes.

Usage (from repo root):

  python database/seeds/generate_tshirt_sql.py
  python database/seeds/generate_tshirt_sql.py --out database/seeds/sql

Then apply:

  psql "$DATABASE_URL" -f database/seeds/sql/00_reset_seed_data.sql
  psql "$DATABASE_URL" -f database/seeds/sql/01_master_catalog.sql
  ... in numeric order through 07_*.sql

Or seed via ORM (writes DB directly):

  PYTHONPATH=backend python database/seeds/tshirt_full_seed.py --reset
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import UUID, uuid5, NAMESPACE_URL

SEED_NS = NAMESPACE_URL
OUT_DEFAULT = Path(__file__).resolve().parent / "sql"

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

TEE_PHOTOS = [
    "photo-1521572163474-6864f9cf17ab",
    "photo-1583743814966-8936f5b7be1a",
    "photo-1576566588028-4147f3842f27",
    "photo-1618354691373-d851c5c3a990",
    "photo-1562157873-818bc0726f68",
    "photo-1503342217505-b0a15ec3261c",
]

# Dummy Argon2/bcrypt-compatible placeholder — replace in real env via ORM seed.
# Customers created via SQL use this static hash; login password documented as Customer123!
# Prefer tshirt_full_seed.py for real password hashes.
DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$c2VlZC1zYWx0LWNsYXNzaWN3YXk$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"


def uid(key: str) -> UUID:
    return uuid5(SEED_NS, f"classic-way-seed:{key}")


def money(value: float | int | str) -> str:
    return str(Decimal(str(value)).quantize(Decimal("0.01")))


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def sql_uuid(value: UUID) -> str:
    return f"'{value}'::uuid"


def sql_json(value: object) -> str:
    return sql_str(json.dumps(value, ensure_ascii=False)) + "::json"


def sql_ts(dt: datetime) -> str:
    return f"'{dt.strftime('%Y-%m-%d %H:%M:%S')}'::timestamp"


def sql_bool(value: bool) -> str:
    return "true" if value else "false"


def sql_num(value: str | None) -> str:
    return "NULL" if value is None else value


def placeholder(label: str, bg: str = "1a1a1a") -> str:
    return f"https://placehold.co/900x1100/{bg}/ffffff?text={label.replace(' ', '+')}"


def unsplash(photo_id: str) -> str:
    return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w=900&q=80"


def product_images(index: int, name: str) -> list[tuple[str, bool]]:
    """3–6 gallery URLs; index 0 is primary. Swap URLs for S3 later with UPDATE."""
    base = TEE_PHOTOS[index % len(TEE_PHOTOS)]
    color_hex = ["111111", "f5f5f5", "1e3a5f", "3f6212", "7f1d1d", "374151"][index % 6]
    count = 3 + (index % 4)  # 3..6
    urls: list[tuple[str, bool]] = [(unsplash(base), True)]
    labels = ["Front", "Back", "Side", "Detail", "Lifestyle", "Flatlay"]
    for i in range(1, count):
        urls.append((placeholder(f"{name}+{labels[i]}", color_hex), False))
    return urls


def header(title: str) -> str:
    return (
        "-- =============================================================================\n"
        f"-- {title}\n"
        "-- Classic Way T-Shirt seed · shared admin + shopping PostgreSQL\n"
        "-- Generated by database/seeds/generate_tshirt_sql.py\n"
        "-- UUIDs are deterministic (uuid5) for easy S3 URL updates later.\n"
        "-- =============================================================================\n\n"
        "BEGIN;\n\n"
    )


def footer() -> str:
    return "\nCOMMIT;\n"


def write(path: Path, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")
    print(f"Wrote {path} ({path.stat().st_size // 1024} KB)")


def gen_reset(out: Path) -> None:
    # Keep existing curated reset file if present; refresh content.
    write(
        out / "00_reset_seed_data.sql",
        header("Reset ecommerce seed data (keeps admin users/roles)")
        + """TRUNCATE TABLE
  coupon_usages,
  review_images,
  reviews,
  notifications,
  shipment_events,
  shipments,
  refunds,
  payment_events,
  payments,
  order_status_history,
  order_items,
  orders,
  cart_items,
  carts,
  wishlist_items,
  wishlists,
  compare_items,
  compare_lists,
  customer_addresses,
  refresh_tokens,
  customers,
  stock_movements,
  inventory_items,
  product_media,
  product_variants,
  product_attributes,
  products,
  attribute_definitions,
  brands,
  categories,
  coupons
RESTART IDENTITY CASCADE;
"""
        + footer(),
    )


def gen_master(out: Path) -> None:
    lines = [header("01 Master catalog — attributes, brands, categories, settings")]

    lines.append("-- Attribute definitions (filter facets)\n")
    lines.append(
        "INSERT INTO attribute_definitions (id, name, values, sort_order, is_active) VALUES\n"
    )
    attr_rows = [
        (uid("attr:Color"), "Color", COLORS, 1),
        (uid("attr:Size"), "Size", SIZES, 2),
        (uid("attr:Fabric"), "Fabric", FABRICS, 3),
        (uid("attr:Neck Type"), "Neck Type", NECKS, 4),
        (uid("attr:Sleeve Type"), "Sleeve Type", SLEEVES, 5),
        (uid("attr:Gender"), "Gender", GENDERS, 6),
    ]
    parts = []
    for aid, name, values, sort in attr_rows:
        parts.append(
            f"  ({sql_uuid(aid)}, {sql_str(name)}, {sql_json(values)}, {sort}, true)"
        )
    lines.append(",\n".join(parts) + "\nON CONFLICT (name) DO NOTHING;\n\n")

    lines.append("-- Brands (20)\n")
    lines.append("INSERT INTO brands (id, name, slug, is_active) VALUES\n")
    parts = []
    for name, slug in BRANDS:
        parts.append(
            f"  ({sql_uuid(uid(f'brand:{slug}'))}, {sql_str(name)}, {sql_str(slug)}, true)"
        )
    lines.append(",\n".join(parts) + "\nON CONFLICT (slug) DO NOTHING;\n\n")

    lines.append("-- Categories (12) with parent tree\n")
    # Insert parents first, then children
    cat_ids: dict[str, UUID] = {}
    for name, slug, parent_slug, sort in CATEGORIES:
        cat_ids[slug] = uid(f"category:{slug}")

    lines.append(
        "INSERT INTO categories (id, name, slug, description, parent_id, is_active, sort_order, image_url) VALUES\n"
    )
    parts = []
    for name, slug, parent_slug, sort in CATEGORIES:
        parent = sql_uuid(cat_ids[parent_slug]) if parent_slug else "NULL"
        img = placeholder(name, "2d3748")
        parts.append(
            "  ("
            f"{sql_uuid(cat_ids[slug])}, {sql_str(name)}, {sql_str(slug)}, "
            f"{sql_str(f'{name} collection for Classic Way storefront')}, "
            f"{parent}, true, {sort}, {sql_str(img)})"
        )
    lines.append(",\n".join(parts) + "\nON CONFLICT (slug) DO NOTHING;\n\n")

    lines.append(
        f"""INSERT INTO inventory_settings (id, low_stock_threshold)
SELECT {sql_uuid(uid("inventory-settings"))}, 10
WHERE NOT EXISTS (SELECT 1 FROM inventory_settings LIMIT 1);

INSERT INTO store_settings (
  id, store_name, legal_name, email, phone,
  address_line1, city, state, postal_code, country, currency, timezone
)
SELECT
  {sql_uuid(uid("store-settings"))},
  'Classic Way',
  'Classic Way Retail Pvt Ltd',
  'hello@classicway.example',
  '+91 98765 43210',
  '12 Market Street',
  'Chennai',
  'Tamil Nadu',
  '600001',
  'India',
  'INR',
  'Asia/Kolkata'
WHERE NOT EXISTS (SELECT 1 FROM store_settings LIMIT 1);

INSERT INTO tax_rules (id, name, code, rate_percent, is_inclusive, country, state, is_active, sort_order)
VALUES (
  {sql_uuid(uid("tax:GST5"))}, 'GST 5%', 'GST5', 5.00, false, 'India', NULL, true, 1
)
ON CONFLICT (code) DO NOTHING;
"""
    )
    lines.append(footer())
    write(out / "01_master_catalog.sql", "".join(lines))


def gen_products(out: Path) -> tuple[list[dict], list[dict]]:
    """Returns product metas and variant metas for later order linking."""
    now = datetime(2026, 7, 1, 10, 0, 0)
    product_lines: list[str] = []
    attr_lines: list[str] = []
    variant_lines: list[str] = []
    inv_lines: list[str] = []
    media_lines: list[str] = []

    products_meta: list[dict] = []
    variants_meta: list[dict] = []

    for i in range(1, 101):
        slug = f"tee-{i:03d}"
        brand_name, brand_slug = BRANDS[(i - 1) % len(BRANDS)]
        cat_name, cat_slug, _, _ = CATEGORIES[(i - 1) % len(CATEGORIES)]
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
        product_sizes = SIZES[1:5]  # S M L XL

        mrp = Decimal(799 + (i % 12) * 50)
        discount = Decimal(10 + (i % 25))
        price = (mrp * (Decimal(100) - discount) / Decimal(100)).quantize(Decimal("0.01"))
        name = f"{brand_name} {style} {color_a} T-Shirt"
        pid = uid(f"product:{slug}")
        sku = f"CW-TEE-{i:03d}"
        published = now - timedelta(days=120 - (i % 100))

        short = f"{gender} {fabric} {neck} tee in {color_a}."
        long = (
            f"{name} crafted in {fabric.lower()} with a {neck.lower()} and "
            f"{sleeve.lower()}. Ideal for everyday wear. Gender: {gender}. "
            f"Machine wash cold. Tax applied at checkout via tax_rules."
        )
        tags = f"tshirt,{gender.lower()},{fabric.lower().replace(' ', '-')},{cat_slug}"

        product_lines.append(
            "("
            f"{sql_uuid(pid)}, {sql_str(name)}, {sql_str(slug)}, "
            f"{sql_str(long)}, {sql_str(short)}, "
            f"{money(price)}, {money(mrp)}, {money(discount)}, {sql_str(sku)}, "
            f"{sql_str('Classic Way Apparel')}, {sql_str(brand_name)}, 0, "
            f"{sql_str(tags)}, 'public', {sql_ts(published)}, "
            f"{sql_uuid(uid(f'category:{cat_slug}'))}, {sql_uuid(uid(f'brand:{brand_slug}'))}, "
            f"true, true, {sql_bool(i % 7 == 0)}, {sql_bool(i % 5 == 0)}, {sql_bool(i % 9 == 0)}, "
            f"{sql_str(f'Buy {name} | Classic Way')}, "
            f"{sql_str(f'Shop {name}. Soft {fabric}, sizes S–XL. Free shipping over ₹999.')}, "
            f"true, true, {i}, {sql_ts(published)}, {sql_ts(published)}, NULL"
            ")"
        )

        attrs = [
            ("Size", product_sizes, 1),
            ("Color", product_colors, 2),
            ("Fabric", [fabric], 3),
            ("Neck Type", [neck], 4),
            ("Sleeve Type", [sleeve], 5),
            ("Gender", [gender], 6),
        ]
        for aname, values, sort in attrs:
            attr_lines.append(
                f"({sql_uuid(uid(f'pattr:{slug}:{aname}'))}, {sql_uuid(pid)}, "
                f"{sql_str(aname)}, {sql_json(values)}, {sort}, {sql_ts(published)})"
            )

        total_stock = 0
        sort = 0
        product_variants = []
        for color in product_colors:
            for size in product_sizes:
                sort += 1
                vsku = f"CW-TEE-{i:03d}-{color[:3].upper()}-{size}"
                vstock = 5 + ((i + sort) % 40)
                if i % 17 == 0 and size == "S":
                    vstock = (i + sort) % 9
                vid = uid(f"variant:{vsku}")
                options = {"Size": size, "Color": color}
                variant_lines.append(
                    f"({sql_uuid(vid)}, {sql_uuid(pid)}, {sql_str(vsku)}, "
                    f"{money(price)}, {vstock}, {sql_json(options)}, true, {sort}, "
                    f"{sql_ts(published)}, {sql_ts(published)})"
                )
                inv_lines.append(
                    f"({sql_uuid(uid(f'inv:{vsku}'))}, {sql_uuid(pid)}, {sql_uuid(vid)}, "
                    f"{sql_str(vsku)}, {vstock}, 0, {sql_ts(published)})"
                )
                total_stock += vstock
                meta_v = {
                    "id": vid,
                    "product_id": pid,
                    "sku": vsku,
                    "price": price,
                    "product_name": name,
                    "product_slug": slug,
                }
                product_variants.append(meta_v)
                variants_meta.append(meta_v)

        # Fix product.stock via separate UPDATE after insert
        products_meta.append(
            {
                "id": pid,
                "slug": slug,
                "name": name,
                "sku": sku,
                "price": price,
                "stock": total_stock,
                "variants": product_variants,
            }
        )

        for idx, (url, primary) in enumerate(product_images(i, style)):
            media_lines.append(
                f"({sql_uuid(uid(f'media:{slug}:{idx}'))}, {sql_uuid(pid)}, "
                f"{sql_str(url)}, {sql_str(f'{name} image {idx + 1}')}, {idx}, "
                f"{sql_bool(primary)}, 'url', {sql_str(f'{slug}-{idx}.jpg')}, "
                f"'image/jpeg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, "
                f"900, 1100, {sql_ts(published)}, {sql_ts(published)})"
            )

    body = [header("02 Products, attributes, variants, media, inventory (100 T-shirts)")]
    body.append(
        """INSERT INTO products (
  id, name, slug, description, short_description,
  price, compare_at_price, discount_percent, sku,
  manufacturer_name, manufacturer_brand, stock, tags, visibility, published_at,
  category_id, brand_id, is_published, is_active, is_featured, is_trending, is_best_seller,
  seo_title, seo_description, exchangeable, refundable, sort_order,
  created_at, updated_at, deleted_at
) VALUES
"""
    )
    body.append(",\n".join(product_lines) + "\nON CONFLICT (slug) DO NOTHING;\n\n")

    # Update stocks
    body.append("-- Aggregate variant stock onto products\n")
    for p in products_meta:
        body.append(
            f"UPDATE products SET stock = {p['stock']} WHERE id = {sql_uuid(p['id'])};\n"
        )
    body.append("\n")

    body.append(
        "INSERT INTO product_attributes (id, product_id, name, values, sort_order, created_at) VALUES\n"
    )
    body.append(",\n".join(attr_lines) + ";\n\n")

    body.append(
        "INSERT INTO product_variants (id, product_id, sku, price, stock, options, is_active, sort_order, created_at, updated_at) VALUES\n"
    )
    body.append(",\n".join(variant_lines) + "\nON CONFLICT (sku) DO NOTHING;\n\n")

    body.append(
        "INSERT INTO inventory_items (id, product_id, variant_id, sku, quantity, reserved, updated_at) VALUES\n"
    )
    body.append(",\n".join(inv_lines) + ";\n\n")

    body.append(
        """INSERT INTO product_media (
  id, product_id, url, alt_text, sort_order, is_primary,
  storage_provider, original_filename, original_mime_type,
  original_file_size, original_width, original_height,
  large_storage_key, medium_storage_key, thumbnail_storage_key,
  large_file_size, medium_file_size, thumbnail_file_size,
  width, height, created_at, updated_at
) VALUES
"""
    )
    body.append(",\n".join(media_lines) + ";\n\n")

    body.append(
        """-- Example: later replace placeholder URLs with S3 public URLs
-- UPDATE product_media SET url = 'https://cdn.example.com/products/tee-001/large.webp',
--   storage_provider = 's3', large_storage_key = 'products/.../large.webp'
-- WHERE product_id = '...' AND sort_order = 0;
"""
    )
    body.append(footer())
    write(out / "02_products_variants_media_inventory.sql", "".join(body))
    return products_meta, variants_meta


def gen_coupons(out: Path) -> None:
    now = datetime(2026, 7, 1, 10, 0, 0)
    rows = []
    templates = [
        ("WELCOME10", "Welcome 10% Off", "percent", "10", None),
        ("FIRSTORDER", "First Order 15%", "percent", "15", "999"),
        ("FLAT150", "Flat ₹150 Off", "fixed", "150", "799"),
        ("FREESHIP", "Free Shipping Credit", "fixed", "59", "499"),
        ("FESTIVE20", "Festival 20% Off", "percent", "20", "1299"),
    ]
    for code, name, dtype, value, minimum in templates:
        rows.append(
            f"({sql_uuid(uid(f'coupon:{code}'))}, {sql_str(code)}, {sql_str(name)}, "
            f"{sql_str(dtype)}, {money(value)}, {sql_num(money(minimum) if minimum else None)}, "
            f"500, 0, {sql_ts(now - timedelta(days=30))}, {sql_ts(now + timedelta(days=180))}, "
            f"true, {sql_ts(now)}, {sql_ts(now)})"
        )
    for i in range(1, 46):
        code = f"TEE{i:02d}"
        percent = i % 2 == 0
        dtype = "percent" if percent else "fixed"
        value = money(5 + (i % 20) if percent else 50 + (i % 10) * 10)
        rows.append(
            f"({sql_uuid(uid(f'coupon:{code}'))}, {sql_str(code)}, {sql_str(f'Tee Offer {i}')}, "
            f"{sql_str(dtype)}, {value}, {money(500 + (i % 5) * 100)}, "
            f"{100 + i}, {i % 12}, {sql_ts(now - timedelta(days=i))}, "
            f"{sql_ts(now + timedelta(days=60 + i))}, true, {sql_ts(now)}, {sql_ts(now)})"
        )

    body = [
        header("03 Coupons (50)"),
        """INSERT INTO coupons (
  id, code, name, discount_type, discount_value, min_order_amount,
  max_uses, used_count, starts_at, ends_at, is_active, created_at, updated_at
) VALUES
""",
        ",\n".join(rows),
        "\nON CONFLICT (code) DO NOTHING;\n",
        footer(),
    ]
    write(out / "03_coupons.sql", "".join(body))


def gen_customers(out: Path, products: list[dict]) -> list[dict]:
    now = datetime(2026, 7, 1, 10, 0, 0)
    customers: list[dict] = []
    cust_rows = []
    addr_rows = []
    wish_rows = []
    wli_rows = []
    cart_rows = []
    ci_rows = []

    for i in range(1, 51):
        email = f"customer{i:02d}@classicway.example"
        cid = uid(f"customer:{email}")
        city, state, pin = CITIES[(i - 1) % len(CITIES)]
        phone = f"+91 98{i:02d}00{i:04d}"[:14]
        name = f"Customer {i:02d}"
        customers.append({"id": cid, "email": email, "full_name": name, "phone": phone})

        cust_rows.append(
            f"({sql_uuid(cid)}, {sql_str(email)}, {sql_str(name)}, {sql_str(phone)}, "
            f"{sql_str(DUMMY_PASSWORD_HASH)}, true, true, "
            f"{sql_ts(now)}, {sql_ts(now)}, NULL)"
        )
        addr_rows.append(
            f"({sql_uuid(uid(f'address:{email}:ship'))}, NULL, {sql_uuid(cid)}, "
            f"{sql_str(name)}, {sql_str(phone)}, {sql_str(f'{i} Residency Road')}, "
            f"'Apartment block A', {sql_str(city)}, {sql_str(state)}, {sql_str(pin)}, "
            f"'India', true, {sql_ts(now)}, {sql_ts(now)})"
        )
        # billing copy
        addr_rows.append(
            f"({sql_uuid(uid(f'address:{email}:bill'))}, NULL, {sql_uuid(cid)}, "
            f"{sql_str(name)}, {sql_str(phone)}, {sql_str(f'{i} Billing Street')}, "
            f"NULL, {sql_str(city)}, {sql_str(state)}, {sql_str(pin)}, "
            f"'India', false, {sql_ts(now)}, {sql_ts(now)})"
        )

        wid = uid(f"wishlist:{email}")
        wish_rows.append(
            f"({sql_uuid(wid)}, {sql_uuid(cid)}, {sql_ts(now)}, {sql_ts(now)})"
        )
        # 5 wishlist items — deterministic picks
        for j in range(5):
            p = products[(i * 3 + j) % len(products)]
            pslug = p["slug"]
            wli_rows.append(
                f"({sql_uuid(uid(f'wli:{email}:{pslug}'))}, {sql_uuid(wid)}, "
                f"{sql_uuid(p['id'])}, {sql_ts(now)})"
            )

        if i <= 20:
            cart_id = uid(f"cart:{email}")
            coupon = "WELCOME10" if i % 3 == 0 else None
            cart_rows.append(
                f"({sql_uuid(cart_id)}, {sql_str(f'seed-cart-{i:02d}')}, NULL, "
                f"{sql_uuid(cid)}, {sql_str(coupon) if coupon else 'NULL'}, "
                f"{sql_ts(now)}, {sql_ts(now)})"
            )
            for j in range(3):
                p = products[(i + j * 7) % len(products)]
                v = p["variants"][0]
                qty = 1 + ((i + j) % 3)
                pslug = p["slug"]
                ci_rows.append(
                    f"({sql_uuid(uid(f'ci:{email}:{pslug}'))}, {sql_uuid(cart_id)}, "
                    f"{sql_uuid(p['id'])}, {sql_uuid(v['id'])}, {qty}, {money(v['price'])}, "
                    f"{sql_str(p['name'])}, {sql_str(v['sku'])})"
                )

    body = [
        header("04 Customers, addresses, wishlists, carts (50 customers)"),
        "-- Password hash is a placeholder. Prefer ORM seed for real Argon2 hashes.\n",
        "-- Documented demo password when using tshirt_full_seed.py: Customer123!\n\n",
        """INSERT INTO customers (
  id, email, full_name, phone, hashed_password, is_active, email_verified,
  created_at, updated_at, deleted_at
) VALUES
""",
        ",\n".join(cust_rows),
        "\nON CONFLICT (email) DO NOTHING;\n\n",
        """INSERT INTO customer_addresses (
  id, user_id, customer_id, full_name, phone, line1, line2,
  city, state, postal_code, country, is_default, created_at, updated_at
) VALUES
""",
        ",\n".join(addr_rows),
        ";\n\n",
        "INSERT INTO wishlists (id, customer_id, created_at, updated_at) VALUES\n",
        ",\n".join(wish_rows),
        ";\n\n",
        "INSERT INTO wishlist_items (id, wishlist_id, product_id, created_at) VALUES\n",
        ",\n".join(wli_rows),
        ";\n\n",
    ]
    if cart_rows:
        body.extend(
            [
                """INSERT INTO carts (
  id, session_key, user_id, customer_id, coupon_code, created_at, updated_at
) VALUES
""",
                ",\n".join(cart_rows),
                ";\n\n",
                """INSERT INTO cart_items (
  id, cart_id, product_id, variant_id, quantity, unit_price, product_name, sku
) VALUES
""",
                ",\n".join(ci_rows),
                ";\n\n",
            ]
        )
    body.append(footer())
    write(out / "04_customers_wishlist_cart.sql", "".join(body))
    return customers


def gen_orders(out: Path, customers: list[dict], products: list[dict]) -> None:
    now = datetime(2026, 7, 15, 12, 0, 0)
    plan = (
        [("paid", 70), ("delivered", 30)]
        + [("pending", 50)]
        + [("cancelled", 25)]
        + [("returned", 25)]
    )
    statuses: list[str] = []
    for status, count in plan:
        statuses.extend([status] * count)

    order_rows = []
    item_rows = []
    hist_rows = []
    pay_rows = []
    refund_rows = []
    ship_rows = []
    se_rows = []
    notif_rows = []

    for idx, status in enumerate(statuses, start=1):
        order_number = f"CW-2026-{idx:05d}"
        oid = uid(f"order:{order_number}")
        customer = customers[(idx - 1) % len(customers)]
        city, state, pin = CITIES[(idx - 1) % len(CITIES)]
        n_items = 1 + (idx % 3)
        chosen = [products[(idx * 2 + k) % len(products)] for k in range(n_items)]

        subtotal = Decimal("0.00")
        lines = []
        for k, p in enumerate(chosen):
            v = p["variants"][(idx + k) % len(p["variants"])]
            qty = 1 + ((idx + k) % 2)
            unit = Decimal(str(v["price"]))
            subtotal += unit * qty
            lines.append((p, v, qty, unit))

        shipping = Decimal("0.00") if subtotal >= 999 else Decimal("59.00")
        discount = Decimal("0.00")
        if idx % 4 == 0:
            discount = min(Decimal("150.00"), (subtotal * Decimal("0.10")).quantize(Decimal("0.01")))
        tax = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
        total = subtotal + shipping + tax - discount
        created = now - timedelta(days=1 + (idx % 90), hours=idx % 20)
        pay_method = "cod" if idx % 5 == 0 else "razorpay"
        coupon = "WELCOME10" if discount > 0 else None

        order_rows.append(
            "("
            f"{sql_uuid(oid)}, {sql_str(order_number)}, NULL, {sql_uuid(customer['id'])}, "
            f"{sql_str(status)}, {sql_str(pay_method)}, "
            f"{money(subtotal)}, {money(shipping)}, {money(tax)}, {money(discount)}, {money(total)}, "
            f"'INR', {sql_str(customer['full_name'])}, {sql_str(customer['phone'])}, "
            f"{sql_str(f'{idx} Lake View Street')}, NULL, {sql_str(city)}, {sql_str(state)}, "
            f"{sql_str(pin)}, 'India', {sql_str(coupon) if coupon else 'NULL'}, "
            f"{sql_str('Customer return — seed') if status == 'returned' else 'NULL'}, "
            f"{sql_ts(created)}, {sql_ts(created)}"
            ")"
        )

        for p, v, qty, unit in lines:
            pslug = p["slug"]
            item_rows.append(
                f"({sql_uuid(uid(f'oi:{order_number}:{pslug}'))}, {sql_uuid(oid)}, "
                f"{sql_uuid(p['id'])}, {sql_uuid(v['id'])}, {sql_str(v['sku'])}, "
                f"{sql_str(p['name'])}, {qty}, {money(unit)}, {money(unit * qty)})"
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
            hist_rows.append(
                f"({sql_uuid(uid(f'osh:{order_number}:{fr}:{to}'))}, {sql_uuid(oid)}, "
                f"{sql_str(fr)}, {sql_str(to)}, {sql_str(f'Seed transition to {to}')}, {sql_ts(created)})"
            )

        method = PAY_METHODS[(idx - 1) % len(PAY_METHODS)]
        pay_status = {
            "pending": "created",
            "cancelled": "failed",
            "paid": "paid",
            "delivered": "paid",
            "returned": "refunded",
        }[status]
        pay_id = uid(f"pay:{order_number}")
        pay_rows.append(
            f"({sql_uuid(pay_id)}, {sql_uuid(oid)}, "
            f"{sql_str('razorpay' if pay_method == 'razorpay' else 'cod')}, "
            f"{sql_str(f'order_demo_{idx:05d}')}, "
            f"{sql_str(f'pay_demo_{idx:05d}') if pay_status == 'paid' else 'NULL'}, "
            f"{money(total)}, 'INR', {sql_str(pay_status)}, {sql_str(method)}, NULL, "
            f"{sql_ts(created)}, {sql_ts(created)})"
        )

        if status == "returned":
            refund_rows.append(
                f"({sql_uuid(uid(f'refund:{order_number}'))}, {sql_uuid(pay_id)}, {sql_uuid(oid)}, "
                f"{money(total)}, 'Customer return — seed', 'processed', "
                f"{sql_str(f'rfnd_demo_{idx:05d}')}, {sql_ts(created + timedelta(days=3))})"
            )

        if status in {"paid", "delivered", "returned"}:
            ship_status = {"paid": "in_transit", "delivered": "delivered", "returned": "rto"}[status]
            sid = uid(f"ship:{order_number}")
            ship_rows.append(
                f"({sql_uuid(sid)}, {sql_uuid(oid)}, {sql_str(COURIERS[(idx - 1) % len(COURIERS)])}, "
                f"{sql_str(f'AWB{100000 + idx}')}, NULL, {sql_str(ship_status)}, "
                f"{sql_ts(created + timedelta(days=1))}, "
                f"{sql_bool(status == 'returned')}, "
                f"{sql_str('Return to origin') if status == 'returned' else 'NULL'}, "
                f"{sql_ts(created + timedelta(hours=6))}, {sql_ts(created + timedelta(days=2))})"
            )
            se_rows.append(
                f"({sql_uuid(uid(f'se:{order_number}:created'))}, {sql_uuid(sid)}, "
                f"'created', 'Shipment created', {sql_ts(created + timedelta(hours=6))}, 'seed')"
            )
            se_rows.append(
                f"({sql_uuid(uid(f'se:{order_number}:latest'))}, {sql_uuid(sid)}, "
                f"{sql_str(ship_status)}, {sql_str(f'Status {ship_status}')}, "
                f"{sql_ts(created + timedelta(days=2))}, 'seed')"
            )

        template = {
            "pending": "order_confirmation",
            "cancelled": "order_confirmation",
            "paid": "payment_received",
            "delivered": "order_delivered",
            "returned": "order_shipped",
        }[status]
        notif_rows.append(
            f"({sql_uuid(uid(f'notif:{order_number}'))}, 'email', {sql_str(template)}, "
            f"{sql_str(customer['email'])}, {sql_str(f'Order {order_number} update')}, "
            f"{sql_str(f'Your order {order_number} is now {status}.')}, 'sent', "
            f"{sql_uuid(oid)}, {sql_ts(created)})"
        )

    body = [
        header("05 Orders, items, payments, refunds, shipments (200 orders)"),
        """INSERT INTO orders (
  id, order_number, user_id, customer_id, status, payment_method,
  subtotal, shipping_amount, tax_amount, discount_amount, total, currency,
  shipping_name, shipping_phone, shipping_line1, shipping_line2,
  shipping_city, shipping_state, shipping_postal_code, shipping_country,
  coupon_code, notes, created_at, updated_at
) VALUES
""",
        ",\n".join(order_rows),
        "\nON CONFLICT (order_number) DO NOTHING;\n\n",
        """INSERT INTO order_items (
  id, order_id, product_id, variant_id, sku, name, quantity, unit_price, line_total
) VALUES
""",
        ",\n".join(item_rows),
        ";\n\n",
        """INSERT INTO order_status_history (
  id, order_id, from_status, to_status, note, created_at
) VALUES
""",
        ",\n".join(hist_rows),
        ";\n\n",
        """INSERT INTO payments (
  id, order_id, provider, provider_order_id, provider_payment_id,
  amount, currency, status, method, raw_payload, created_at, updated_at
) VALUES
""",
        ",\n".join(pay_rows),
        ";\n\n",
    ]
    if refund_rows:
        body.extend(
            [
                """INSERT INTO refunds (
  id, payment_id, order_id, amount, reason, status, provider_refund_id, created_at
) VALUES
""",
                ",\n".join(refund_rows),
                ";\n\n",
            ]
        )
    if ship_rows:
        body.extend(
            [
                """INSERT INTO shipments (
  id, order_id, courier_provider, awb, label_url, status, pickup_scheduled_at,
  exception_flag, exception_reason, created_at, updated_at
) VALUES
""",
                ",\n".join(ship_rows),
                ";\n\n",
                """INSERT INTO shipment_events (
  id, shipment_id, status, message, event_at, source
) VALUES
""",
                ",\n".join(se_rows),
                ";\n\n",
            ]
        )
    body.extend(
        [
            """INSERT INTO notifications (
  id, channel, template_key, recipient, subject, body, status, related_order_id, created_at
) VALUES
""",
            ",\n".join(notif_rows),
            ";\n\n",
            footer(),
        ]
    )
    write(out / "05_orders_payments_shipments.sql", "".join(body))


def gen_reviews_notifications(out: Path, customers: list[dict], products: list[dict]) -> None:
    now = datetime(2026, 7, 20, 9, 0, 0)
    review_rows = []
    for i in range(200):
        customer = customers[i % len(customers)]
        product = products[i % len(products)]
        key = f"review:{customer['email']}:{product['slug']}:{i}"
        rating = 1 + (i % 5)
        title = ["Okay", "Good", "Great", "Excellent", "Love it"][i % 5]
        review_rows.append(
            f"({sql_uuid(uid(key))}, {sql_uuid(product['id'])}, {sql_uuid(customer['id'])}, "
            f"{rating}, {sql_str(title)}, {sql_str(REVIEW_BODIES[i % len(REVIEW_BODIES)])}, "
            f"{sql_bool(i % 2 == 0)}, true, {sql_ts(now - timedelta(days=i % 60))}, "
            f"{sql_ts(now - timedelta(days=i % 60))})"
        )

    notif_rows = []
    templates = [
        ("email", "coupon_available", "New coupon for you", "Use WELCOME10 on your next tee."),
        ("email", "wishlist_price_drop", "Wishlist price drop", "An item on your wishlist is cheaper now."),
        ("sms", "payment_received", None, "Payment received for your Classic Way order."),
    ]
    for i, customer in enumerate(customers[:30], start=1):
        channel, key, subject, body = templates[i % len(templates)]
        recipient = customer["email"] if channel == "email" else (customer["phone"] or customer["email"])
        cemail = customer["email"]
        notif_rows.append(
            f"({sql_uuid(uid(f'notif-extra:{cemail}:{key}'))}, "
            f"{sql_str(channel)}, {sql_str(key)}, {sql_str(recipient)}, "
            f"{sql_str(subject) if subject else 'NULL'}, {sql_str(body)}, 'sent', NULL, {sql_ts(now)})"
        )

    content = [
        header("06 Reviews (200) + extra notifications"),
        """INSERT INTO reviews (
  id, product_id, customer_id, rating, title, body,
  is_verified_purchase, is_approved, created_at, updated_at
) VALUES
""",
        ",\n".join(review_rows),
        ";\n\n",
        """INSERT INTO notifications (
  id, channel, template_key, recipient, subject, body, status, related_order_id, created_at
) VALUES
""",
        ",\n".join(notif_rows),
        ";\n\n",
        footer(),
    ]
    write(out / "06_reviews_notifications.sql", "".join(content))


def gen_verify(out: Path) -> None:
    write(
        out / "99_verify_counts.sql",
        header("Verify seed row counts (dashboard readiness)")
        + """
SELECT 'brands' AS entity, count(*)::int AS rows FROM brands
UNION ALL SELECT 'categories', count(*)::int FROM categories
UNION ALL SELECT 'attribute_definitions', count(*)::int FROM attribute_definitions
UNION ALL SELECT 'products', count(*)::int FROM products
UNION ALL SELECT 'product_variants', count(*)::int FROM product_variants
UNION ALL SELECT 'product_media', count(*)::int FROM product_media
UNION ALL SELECT 'inventory_items', count(*)::int FROM inventory_items
UNION ALL SELECT 'coupons', count(*)::int FROM coupons
UNION ALL SELECT 'customers', count(*)::int FROM customers
UNION ALL SELECT 'customer_addresses', count(*)::int FROM customer_addresses
UNION ALL SELECT 'wishlists', count(*)::int FROM wishlists
UNION ALL SELECT 'wishlist_items', count(*)::int FROM wishlist_items
UNION ALL SELECT 'carts', count(*)::int FROM carts
UNION ALL SELECT 'cart_items', count(*)::int FROM cart_items
UNION ALL SELECT 'orders', count(*)::int FROM orders
UNION ALL SELECT 'order_items', count(*)::int FROM order_items
UNION ALL SELECT 'payments', count(*)::int FROM payments
UNION ALL SELECT 'refunds', count(*)::int FROM refunds
UNION ALL SELECT 'shipments', count(*)::int FROM shipments
UNION ALL SELECT 'reviews', count(*)::int FROM reviews
UNION ALL SELECT 'notifications', count(*)::int FROM notifications
ORDER BY 1;

-- Order status mix for admin dashboard
SELECT status, count(*)::int AS orders FROM orders GROUP BY status ORDER BY 1;

-- Low stock SKUs (threshold 10)
SELECT sku, quantity FROM inventory_items WHERE quantity <= 10 ORDER BY quantity ASC LIMIT 20;
"""
        + footer(),
    )


def gen_readme(out: Path) -> None:
    write(
        out / "README.md",
        """# Classic Way — T-Shirt SQL Seed Pack

Shared PostgreSQL seed for **admin-service** + **shopping-service**.

## What you get

| File | Contents |
|------|----------|
| `00_reset_seed_data.sql` | Truncate seed tables (keeps admin users/roles) |
| `01_master_catalog.sql` | Attributes, 20 brands, 12 categories, tax, store/inventory settings |
| `02_products_variants_media_inventory.sql` | 100 T-shirts, Size×Color variants, 3–6 images each, inventory |
| `03_coupons.sql` | 50 coupons |
| `04_customers_wishlist_cart.sql` | 50 customers, addresses, wishlists, sample carts |
| `05_orders_payments_shipments.sql` | 200 orders (100 paid/delivered, 50 pending, 25 cancelled, 25 returned) |
| `06_reviews_notifications.sql` | 200 reviews + marketing notifications |
| `99_verify_counts.sql` | Count + status + low-stock checks |

## Schema notes (important)

Seed matches **live columns only**:

- No `barcode` / product `gst` columns (not in schema)
- Gender / Fabric / Neck / Sleeve → `product_attributes` + `attribute_definitions`
- Size / Color sellable combos → `product_variants.options` JSON
- SEO → `products.seo_title`, `products.seo_description`
- Images stored as **public URLs** (`storage_provider = 'url'`). Replace with S3 later via `UPDATE`.

## Apply (psql)

```bash
# After alembic upgrade head
export DATABASE_URL='postgresql://classic_way:classic_way@localhost:5434/classic_way'

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/00_reset_seed_data.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/01_master_catalog.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/02_products_variants_media_inventory.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/03_coupons.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/04_customers_wishlist_cart.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/05_orders_payments_shipments.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/06_reviews_notifications.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/99_verify_counts.sql
```

## Prefer ORM seed for real password hashes

```bash
PYTHONPATH=backend python database/seeds/tshirt_full_seed.py --reset
```

Demo customer password from ORM seed: `Customer123!`

## Regenerate SQL

```bash
python database/seeds/generate_tshirt_sql.py
```

## Swap images to S3 later

```sql
UPDATE product_media
SET url = 'https://YOUR_CDN/products/tee-001/large.webp',
    storage_provider = 's3',
    large_storage_key = 'products/.../large.webp'
WHERE id = '...';
```
""",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=OUT_DEFAULT)
    args = parser.parse_args()
    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)

    gen_reset(out)
    gen_master(out)
    products, _variants = gen_products(out)
    gen_coupons(out)
    customers = gen_customers(out, products)
    gen_orders(out, customers, products)
    gen_reviews_notifications(out, customers, products)
    gen_verify(out)
    gen_readme(out)
    print(f"\nDone. SQL pack ready in {out}")


if __name__ == "__main__":
    main()
