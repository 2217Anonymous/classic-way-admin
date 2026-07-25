"""Add category image_url and cascade parent deletes.

Revision ID: 20260720_0003
Revises: 20260720_0002
Create Date: 2026-07-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260720_0003"
down_revision: str | None = "20260720_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "categories" not in tables:
        return

    columns = {column["name"] for column in inspector.get_columns("categories")}
    if "image_url" not in columns:
        op.add_column(
            "categories",
            sa.Column("image_url", sa.String(length=500), nullable=True),
        )

    # Recreate parent FK with ON DELETE CASCADE for MySQL.
    existing_fks = inspector.get_foreign_keys("categories")
    for fk in existing_fks:
        if fk.get("constrained_columns") == ["parent_id"]:
            op.drop_constraint(fk["name"], "categories", type_="foreignkey")
            break

    op.create_foreign_key(
        "fk_categories_parent",
        "categories",
        "categories",
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "categories" not in tables:
        return

    existing_fks = inspector.get_foreign_keys("categories")
    for fk in existing_fks:
        if fk.get("constrained_columns") == ["parent_id"]:
            op.drop_constraint(fk["name"], "categories", type_="foreignkey")
            break

    op.create_foreign_key(
        "fk_categories_parent",
        "categories",
        "categories",
        ["parent_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    columns = {column["name"] for column in inspector.get_columns("categories")}
    if "image_url" in columns:
        op.drop_column("categories", "image_url")
