"""Extend products + create attributes/variants (VL-012).

Revision ID: 20260722_0005
Revises: 20260720_0004
Create Date: 2026-07-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260722_0005"
down_revision: str | None = "20260720_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "products" in tables:
        columns = {col["name"] for col in inspector.get_columns("products")}
        with op.batch_alter_table("products") as batch:
            if "short_description" not in columns:
                batch.add_column(sa.Column("short_description", sa.Text(), nullable=True))
            if "discount_percent" not in columns:
                batch.add_column(
                    sa.Column("discount_percent", sa.Numeric(5, 2), nullable=True)
                )
            if "manufacturer_name" not in columns:
                batch.add_column(
                    sa.Column("manufacturer_name", sa.String(160), nullable=True)
                )
            if "manufacturer_brand" not in columns:
                batch.add_column(
                    sa.Column("manufacturer_brand", sa.String(160), nullable=True)
                )
            if "stock" not in columns:
                batch.add_column(
                    sa.Column(
                        "stock",
                        sa.Integer(),
                        nullable=False,
                        server_default="0",
                    )
                )
            if "tags" not in columns:
                batch.add_column(sa.Column("tags", sa.String(500), nullable=True))
            if "visibility" not in columns:
                batch.add_column(
                    sa.Column(
                        "visibility",
                        sa.String(32),
                        nullable=False,
                        server_default="public",
                    )
                )
            if "published_at" not in columns:
                batch.add_column(sa.Column("published_at", sa.DateTime(), nullable=True))

    tables = set(inspector.get_table_names())
    if "product_attributes" not in tables:
        op.create_table(
            "product_attributes",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=80), nullable=False),
            sa.Column("values", sa.JSON(), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(
                ["product_id"],
                ["products.id"],
                name="fk_product_attributes_product",
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_product_attributes_product_id", "product_attributes", ["product_id"]
        )

    tables = set(inspector.get_table_names())
    if "product_variants" not in tables:
        op.create_table(
            "product_variants",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("sku", sa.String(length=64), nullable=False),
            sa.Column("price", sa.Numeric(12, 2), nullable=True),
            sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("options", sa.JSON(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
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
            sa.ForeignKeyConstraint(
                ["product_id"],
                ["products.id"],
                name="fk_product_variants_product",
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("sku", name="uq_product_variants_sku"),
        )
        op.create_index(
            "ix_product_variants_product_id", "product_variants", ["product_id"]
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "product_variants" in tables:
        op.drop_table("product_variants")
    if "product_attributes" in tables:
        op.drop_table("product_attributes")
    if "products" in tables:
        columns = {col["name"] for col in inspector.get_columns("products")}
        with op.batch_alter_table("products") as batch:
            for name in (
                "published_at",
                "visibility",
                "tags",
                "stock",
                "manufacturer_brand",
                "manufacturer_name",
                "discount_percent",
                "short_description",
            ):
                if name in columns:
                    batch.drop_column(name)
