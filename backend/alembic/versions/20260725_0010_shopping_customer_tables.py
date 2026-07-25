"""Shopping customer tables, brands, and product storefront flags.

Revision ID: 20260725_0010
Revises: 20260723_0009
Create Date: 2026-07-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260725_0010"
down_revision: str | None = "20260723_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_column(inspector: sa.Inspector, table: str, column: str) -> bool:
    if table not in inspector.get_table_names():
        return False
    return any(col["name"] == column for col in inspector.get_columns(table))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "brands" not in tables:
        op.create_table(
            "brands",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("slug", sa.String(length=140), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug"),
        )
        op.create_index("ix_brands_slug", "brands", ["slug"])

    if "customers" not in tables:
        op.create_table(
            "customers",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=160), nullable=False),
            sa.Column("phone", sa.String(length=40), nullable=True),
            sa.Column("hashed_password", sa.String(length=255), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column(
                "email_verified", sa.Boolean(), nullable=False, server_default=sa.false()
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
        )
        op.create_index("ix_customers_email", "customers", ["email"])

    if "refresh_tokens" not in tables:
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("customer_id", sa.Integer(), nullable=False),
            sa.Column("token_hash", sa.String(length=255), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["customer_id"], ["customers.id"], ondelete="CASCADE"
            ),
            sa.UniqueConstraint("token_hash"),
        )
        op.create_index("ix_refresh_tokens_customer_id", "refresh_tokens", ["customer_id"])
        op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"])

    if "wishlists" not in tables:
        op.create_table(
            "wishlists",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("customer_id", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["customer_id"], ["customers.id"], ondelete="CASCADE"
            ),
            sa.UniqueConstraint("customer_id"),
        )
        op.create_index("ix_wishlists_customer_id", "wishlists", ["customer_id"])

    if "wishlist_items" not in tables:
        op.create_table(
            "wishlist_items",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("wishlist_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["wishlist_id"], ["wishlists.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["product_id"], ["products.id"], ondelete="CASCADE"
            ),
            sa.UniqueConstraint("wishlist_id", "product_id", name="uq_wishlist_product"),
        )
        op.create_index("ix_wishlist_items_wishlist_id", "wishlist_items", ["wishlist_id"])
        op.create_index("ix_wishlist_items_product_id", "wishlist_items", ["product_id"])

    if "compare_lists" not in tables:
        op.create_table(
            "compare_lists",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("customer_id", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["customer_id"], ["customers.id"], ondelete="CASCADE"
            ),
            sa.UniqueConstraint("customer_id"),
        )
        op.create_index("ix_compare_lists_customer_id", "compare_lists", ["customer_id"])

    if "compare_items" not in tables:
        op.create_table(
            "compare_items",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("compare_list_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["compare_list_id"], ["compare_lists.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["product_id"], ["products.id"], ondelete="CASCADE"
            ),
            sa.UniqueConstraint(
                "compare_list_id", "product_id", name="uq_compare_product"
            ),
        )
        op.create_index(
            "ix_compare_items_compare_list_id", "compare_items", ["compare_list_id"]
        )
        op.create_index("ix_compare_items_product_id", "compare_items", ["product_id"])

    if "reviews" not in tables:
        op.create_table(
            "reviews",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("customer_id", sa.Integer(), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=True),
            sa.Column("body", sa.Text(), nullable=True),
            sa.Column(
                "is_verified_purchase",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
            sa.Column(
                "is_approved", sa.Boolean(), nullable=False, server_default=sa.false()
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["product_id"], ["products.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["customer_id"], ["customers.id"], ondelete="CASCADE"
            ),
        )
        op.create_index("ix_reviews_product_id", "reviews", ["product_id"])
        op.create_index("ix_reviews_customer_id", "reviews", ["customer_id"])

    if "review_images" not in tables:
        op.create_table(
            "review_images",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("review_id", sa.Integer(), nullable=False),
            sa.Column("url", sa.String(length=500), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["review_id"], ["reviews.id"], ondelete="CASCADE"),
        )
        op.create_index("ix_review_images_review_id", "review_images", ["review_id"])

    if "coupon_usages" not in tables:
        op.create_table(
            "coupon_usages",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("coupon_id", sa.Integer(), nullable=False),
            sa.Column("customer_id", sa.Integer(), nullable=False),
            sa.Column("order_id", sa.Integer(), nullable=True),
            sa.Column(
                "used_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column("discount_amount", sa.Numeric(12, 2), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["coupon_id"], ["coupons.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["customer_id"], ["customers.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        )
        op.create_index("ix_coupon_usages_coupon_id", "coupon_usages", ["coupon_id"])
        op.create_index(
            "ix_coupon_usages_customer_id", "coupon_usages", ["customer_id"]
        )
        op.create_index("ix_coupon_usages_order_id", "coupon_usages", ["order_id"])

    # Refresh inspector after creates
    inspector = sa.inspect(bind)

    if "products" in tables:
        if not _has_column(inspector, "products", "brand_id"):
            op.add_column("products", sa.Column("brand_id", sa.Integer(), nullable=True))
            op.create_foreign_key(
                "fk_products_brand_id",
                "products",
                "brands",
                ["brand_id"],
                ["id"],
                ondelete="SET NULL",
            )
            op.create_index("ix_products_brand_id", "products", ["brand_id"])
        if not _has_column(inspector, "products", "is_featured"):
            op.add_column(
                "products",
                sa.Column(
                    "is_featured", sa.Boolean(), nullable=False, server_default=sa.false()
                ),
            )
        if not _has_column(inspector, "products", "is_trending"):
            op.add_column(
                "products",
                sa.Column(
                    "is_trending", sa.Boolean(), nullable=False, server_default=sa.false()
                ),
            )
        if not _has_column(inspector, "products", "is_best_seller"):
            op.add_column(
                "products",
                sa.Column(
                    "is_best_seller",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                ),
            )
        if not _has_column(inspector, "products", "seo_title"):
            op.add_column(
                "products", sa.Column("seo_title", sa.String(length=200), nullable=True)
            )
        if not _has_column(inspector, "products", "seo_description"):
            op.add_column(
                "products",
                sa.Column("seo_description", sa.String(length=500), nullable=True),
            )
        if not _has_column(inspector, "products", "deleted_at"):
            op.add_column("products", sa.Column("deleted_at", sa.DateTime(), nullable=True))

    if "customer_addresses" in tables and not _has_column(
        inspector, "customer_addresses", "customer_id"
    ):
        op.add_column(
            "customer_addresses",
            sa.Column("customer_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_customer_addresses_customer_id",
            "customer_addresses",
            "customers",
            ["customer_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.create_index(
            "ix_customer_addresses_customer_id", "customer_addresses", ["customer_id"]
        )

    if "carts" in tables and not _has_column(inspector, "carts", "customer_id"):
        op.add_column("carts", sa.Column("customer_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_carts_customer_id",
            "carts",
            "customers",
            ["customer_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index("ix_carts_customer_id", "carts", ["customer_id"])

    if "carts" in tables and not _has_column(inspector, "carts", "coupon_code"):
        op.add_column(
            "carts", sa.Column("coupon_code", sa.String(length=40), nullable=True)
        )

    if "orders" in tables and not _has_column(inspector, "orders", "customer_id"):
        op.add_column("orders", sa.Column("customer_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_orders_customer_id",
            "orders",
            "customers",
            ["customer_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index("ix_orders_customer_id", "orders", ["customer_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "orders" in tables and _has_column(inspector, "orders", "customer_id"):
        op.drop_constraint("fk_orders_customer_id", "orders", type_="foreignkey")
        op.drop_index("ix_orders_customer_id", table_name="orders")
        op.drop_column("orders", "customer_id")

    if "carts" in tables and _has_column(inspector, "carts", "customer_id"):
        op.drop_constraint("fk_carts_customer_id", "carts", type_="foreignkey")
        op.drop_index("ix_carts_customer_id", table_name="carts")
        op.drop_column("carts", "customer_id")

    if "customer_addresses" in tables and _has_column(
        inspector, "customer_addresses", "customer_id"
    ):
        op.drop_constraint(
            "fk_customer_addresses_customer_id",
            "customer_addresses",
            type_="foreignkey",
        )
        op.drop_index(
            "ix_customer_addresses_customer_id", table_name="customer_addresses"
        )
        op.drop_column("customer_addresses", "customer_id")

    if "products" in tables:
        if _has_column(inspector, "products", "deleted_at"):
            op.drop_column("products", "deleted_at")
        if _has_column(inspector, "products", "seo_description"):
            op.drop_column("products", "seo_description")
        if _has_column(inspector, "products", "seo_title"):
            op.drop_column("products", "seo_title")
        if _has_column(inspector, "products", "is_best_seller"):
            op.drop_column("products", "is_best_seller")
        if _has_column(inspector, "products", "is_trending"):
            op.drop_column("products", "is_trending")
        if _has_column(inspector, "products", "is_featured"):
            op.drop_column("products", "is_featured")
        if _has_column(inspector, "products", "brand_id"):
            op.drop_constraint("fk_products_brand_id", "products", type_="foreignkey")
            op.drop_index("ix_products_brand_id", table_name="products")
            op.drop_column("products", "brand_id")

    for table in (
        "coupon_usages",
        "review_images",
        "reviews",
        "compare_items",
        "compare_lists",
        "wishlist_items",
        "wishlists",
        "refresh_tokens",
        "customers",
        "brands",
    ):
        if table in tables:
            op.drop_table(table)
