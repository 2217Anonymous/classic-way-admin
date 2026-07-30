"""Create theme table and seed default theme configuration.

Revision ID: 20260725_0013
Revises: 20260725_0012
Create Date: 2026-07-25
"""

from __future__ import annotations

import json
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260725_0013"
down_revision: Union[str, None] = "20260725_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_PAGES = {
    "about_us": True,
    "contact_us": True,
    "cart": True,
    "checkout": True,
    "compare": True,
    "faq": True,
    "login": True,
    "register": True,
    "wishlist": True,
    "terms": True,
    "track_order": True,
}


def _seed_default_theme(conn: sa.Connection) -> None:
    existing = conn.execute(
        sa.text(
            "SELECT id FROM theme WHERE is_default IS TRUE AND customer_id IS NULL LIMIT 1"
        )
    ).first()
    if not existing:
        conn.execute(
            sa.text(
                """
                INSERT INTO theme (
                    id, customer_id, home_theme, shop_category, shop_layout,
                    product_layout, blog_layout, page_visibility, theme_config,
                    is_default, is_active
                ) VALUES (
                    CAST(:id AS uuid), NULL, 'fashion', 'classic', 'full-width',
                    'full-width', 'full-width', CAST(:pages AS json), NULL,
                    TRUE, TRUE
                )
                """
            ),
            {"id": str(uuid.uuid4()), "pages": json.dumps(DEFAULT_PAGES)},
        )


def upgrade() -> None:
    conn = op.get_bind()
    # Revision 0012 rebuilds from current model metadata. On fresh installs that
    # metadata can already contain Theme, so do not create the table twice.
    if sa.inspect(conn).has_table("theme"):
        _seed_default_theme(conn)
        return

    op.create_table(
        "theme",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=True),
        sa.Column(
            "home_theme",
            sa.String(length=100),
            nullable=False,
            server_default="fashion",
        ),
        sa.Column(
            "shop_category",
            sa.String(length=50),
            nullable=False,
            server_default="classic",
        ),
        sa.Column(
            "shop_layout",
            sa.String(length=100),
            nullable=False,
            server_default="full-width",
        ),
        sa.Column(
            "product_layout",
            sa.String(length=100),
            nullable=False,
            server_default="full-width",
        ),
        sa.Column(
            "blog_layout",
            sa.String(length=100),
            nullable=False,
            server_default="full-width",
        ),
        sa.Column("page_visibility", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("theme_config", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "is_default",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
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
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("customer_id"),
    )
    op.create_index("ix_theme_customer_id", "theme", ["customer_id"])
    op.create_index("ix_theme_is_default", "theme", ["is_default"])

    _seed_default_theme(conn)


def downgrade() -> None:
    op.drop_index("ix_theme_is_default", table_name="theme")
    op.drop_index("ix_theme_customer_id", table_name="theme")
    op.drop_table("theme")
