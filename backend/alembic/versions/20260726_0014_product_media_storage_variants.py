"""Add product_media storage variant columns.

Revision ID: 20260726_0014
Revises: 20260725_0013
Create Date: 2026-07-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260726_0014"
down_revision: Union[str, None] = "20260725_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Revision 0012 rebuilds from current model metadata, which can already
    # include these later columns on a fresh installation.
    existing_columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("product_media")
    }
    columns = [
        sa.Column("storage_provider", sa.String(length=32), nullable=True),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("original_mime_type", sa.String(length=100), nullable=True),
        sa.Column("original_file_size", sa.Integer(), nullable=True),
        sa.Column("original_width", sa.Integer(), nullable=True),
        sa.Column("original_height", sa.Integer(), nullable=True),
        sa.Column("large_storage_key", sa.String(length=500), nullable=True),
        sa.Column("medium_storage_key", sa.String(length=500), nullable=True),
        sa.Column("thumbnail_storage_key", sa.String(length=500), nullable=True),
        sa.Column("large_file_size", sa.Integer(), nullable=True),
        sa.Column("medium_file_size", sa.Integer(), nullable=True),
        sa.Column("thumbnail_file_size", sa.Integer(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    ]
    for column in columns:
        if column.name not in existing_columns:
            op.add_column("product_media", column)


def downgrade() -> None:
    op.drop_column("product_media", "updated_at")
    op.drop_column("product_media", "height")
    op.drop_column("product_media", "width")
    op.drop_column("product_media", "thumbnail_file_size")
    op.drop_column("product_media", "medium_file_size")
    op.drop_column("product_media", "large_file_size")
    op.drop_column("product_media", "thumbnail_storage_key")
    op.drop_column("product_media", "medium_storage_key")
    op.drop_column("product_media", "large_storage_key")
    op.drop_column("product_media", "original_height")
    op.drop_column("product_media", "original_width")
    op.drop_column("product_media", "original_file_size")
    op.drop_column("product_media", "original_mime_type")
    op.drop_column("product_media", "original_filename")
    op.drop_column("product_media", "storage_provider")
