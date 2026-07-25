"""Add exchangeable and refundable flags to products.

Revision ID: 20260722_0007
Revises: 20260722_0006
Create Date: 2026-07-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260722_0007"
down_revision: str | None = "20260722_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "products" not in tables:
        return

    columns = {col["name"] for col in inspector.get_columns("products")}
    if "exchangeable" not in columns:
        op.add_column(
            "products",
            sa.Column(
                "exchangeable",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )
    if "refundable" not in columns:
        op.add_column(
            "products",
            sa.Column(
                "refundable",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "products" not in tables:
        return

    columns = {col["name"] for col in inspector.get_columns("products")}
    if "refundable" in columns:
        op.drop_column("products", "refundable")
    if "exchangeable" in columns:
        op.drop_column("products", "exchangeable")
