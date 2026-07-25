"""Create products and product_media tables.

Revision ID: 20260720_0004
Revises: 20260720_0003
Create Date: 2026-07-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260720_0004"
down_revision: str | None = "20260720_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "products" not in tables:
        op.create_table(
            "products",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("slug", sa.String(length=180), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("price", sa.Numeric(12, 2), nullable=False),
            sa.Column("compare_at_price", sa.Numeric(12, 2), nullable=True),
            sa.Column("sku", sa.String(length=64), nullable=True),
            sa.Column("category_id", sa.Integer(), nullable=True),
            sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(
                ["category_id"],
                ["categories.id"],
                name="fk_products_category",
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug", name="uq_products_slug"),
            sa.UniqueConstraint("sku", name="uq_products_sku"),
        )
        op.create_index("ix_products_slug", "products", ["slug"])
        op.create_index("ix_products_category_id", "products", ["category_id"])

    tables = set(inspector.get_table_names())
    if "product_media" not in tables:
        op.create_table(
            "product_media",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("url", sa.String(length=500), nullable=False),
            sa.Column("alt_text", sa.String(length=200), nullable=True),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(
                ["product_id"],
                ["products.id"],
                name="fk_product_media_product",
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_product_media_product_id", "product_media", ["product_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "product_media" in tables:
        op.drop_table("product_media")
    if "products" in tables:
        op.drop_table("products")
