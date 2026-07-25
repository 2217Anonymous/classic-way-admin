"""Create inventory, orders/cart/address, payments, fulfillment,
notifications tables for the commerce backend (VL-013 to VL-029).

Revision ID: 20260723_0009
Revises: 20260722_0008
Create Date: 2026-07-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260723_0009"
down_revision: str | None = "20260722_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "inventory_settings" not in tables:
        op.create_table(
            "inventory_settings",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column(
                "low_stock_threshold",
                sa.Integer(),
                nullable=False,
                server_default="10",
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
        )

    if "inventory_items" not in tables:
        op.create_table(
            "inventory_items",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=True),
            sa.Column("variant_id", sa.Integer(), nullable=True),
            sa.Column("sku", sa.String(length=64), nullable=True),
            sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("reserved", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["product_id"], ["products.id"], name="fk_inventory_items_product",
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(
                ["variant_id"],
                ["product_variants.id"],
                name="fk_inventory_items_variant",
                ondelete="SET NULL",
            ),
        )
        op.create_index(
            "ix_inventory_items_product_id", "inventory_items", ["product_id"]
        )
        op.create_index(
            "ix_inventory_items_variant_id", "inventory_items", ["variant_id"]
        )
        op.create_index("ix_inventory_items_sku", "inventory_items", ["sku"])

    if "stock_movements" not in tables:
        op.create_table(
            "stock_movements",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("inventory_item_id", sa.Integer(), nullable=False),
            sa.Column("delta", sa.Integer(), nullable=False),
            sa.Column("reason", sa.String(length=160), nullable=False),
            sa.Column("reference", sa.String(length=160), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["inventory_item_id"],
                ["inventory_items.id"],
                name="fk_stock_movements_inventory_item",
                ondelete="CASCADE",
            ),
        )
        op.create_index(
            "ix_stock_movements_inventory_item_id",
            "stock_movements",
            ["inventory_item_id"],
        )

    if "carts" not in tables:
        op.create_table(
            "carts",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("session_key", sa.String(length=120), nullable=True),
            sa.Column("user_id", sa.Integer(), nullable=True),
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
                ["user_id"], ["users.id"], name="fk_carts_user", ondelete="SET NULL"
            ),
        )
        op.create_index("ix_carts_session_key", "carts", ["session_key"])
        op.create_index("ix_carts_user_id", "carts", ["user_id"])

    if "cart_items" not in tables:
        op.create_table(
            "cart_items",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("cart_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("variant_id", sa.Integer(), nullable=True),
            sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
            sa.Column("product_name", sa.String(length=160), nullable=False),
            sa.Column("sku", sa.String(length=64), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["cart_id"], ["carts.id"], name="fk_cart_items_cart", ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["product_id"],
                ["products.id"],
                name="fk_cart_items_product",
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["variant_id"],
                ["product_variants.id"],
                name="fk_cart_items_variant",
                ondelete="SET NULL",
            ),
        )
        op.create_index("ix_cart_items_cart_id", "cart_items", ["cart_id"])
        op.create_index("ix_cart_items_product_id", "cart_items", ["product_id"])
        op.create_index("ix_cart_items_variant_id", "cart_items", ["variant_id"])

    if "customer_addresses" not in tables:
        op.create_table(
            "customer_addresses",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("full_name", sa.String(length=160), nullable=False),
            sa.Column("phone", sa.String(length=40), nullable=False),
            sa.Column("line1", sa.String(length=255), nullable=False),
            sa.Column("line2", sa.String(length=255), nullable=True),
            sa.Column("city", sa.String(length=100), nullable=False),
            sa.Column("state", sa.String(length=100), nullable=False),
            sa.Column("postal_code", sa.String(length=20), nullable=False),
            sa.Column(
                "country", sa.String(length=100), nullable=False, server_default="India"
            ),
            sa.Column(
                "is_default", sa.Boolean(), nullable=False, server_default=sa.false()
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
                ["user_id"],
                ["users.id"],
                name="fk_customer_addresses_user",
                ondelete="SET NULL",
            ),
        )
        op.create_index(
            "ix_customer_addresses_user_id", "customer_addresses", ["user_id"]
        )

    if "orders" not in tables:
        op.create_table(
            "orders",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("order_number", sa.String(length=40), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column(
                "status", sa.String(length=20), nullable=False, server_default="draft"
            ),
            sa.Column(
                "payment_method",
                sa.String(length=20),
                nullable=False,
                server_default="cod",
            ),
            sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
            sa.Column(
                "shipping_amount", sa.Numeric(12, 2), nullable=False, server_default="0"
            ),
            sa.Column(
                "tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"
            ),
            sa.Column(
                "discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"
            ),
            sa.Column("total", sa.Numeric(12, 2), nullable=False, server_default="0"),
            sa.Column(
                "currency", sa.String(length=8), nullable=False, server_default="INR"
            ),
            sa.Column("shipping_name", sa.String(length=160), nullable=True),
            sa.Column("shipping_phone", sa.String(length=40), nullable=True),
            sa.Column("shipping_line1", sa.String(length=255), nullable=True),
            sa.Column("shipping_line2", sa.String(length=255), nullable=True),
            sa.Column("shipping_city", sa.String(length=100), nullable=True),
            sa.Column("shipping_state", sa.String(length=100), nullable=True),
            sa.Column("shipping_postal_code", sa.String(length=20), nullable=True),
            sa.Column("shipping_country", sa.String(length=100), nullable=True),
            sa.Column("coupon_code", sa.String(length=40), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
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
            sa.UniqueConstraint("order_number", name="uq_orders_order_number"),
            sa.ForeignKeyConstraint(
                ["user_id"], ["users.id"], name="fk_orders_user", ondelete="SET NULL"
            ),
        )
        op.create_index("ix_orders_user_id", "orders", ["user_id"])
        op.create_index("ix_orders_status", "orders", ["status"])

    if "order_items" not in tables:
        op.create_table(
            "order_items",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("order_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=True),
            sa.Column("variant_id", sa.Integer(), nullable=True),
            sa.Column("sku", sa.String(length=64), nullable=True),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
            sa.Column("line_total", sa.Numeric(12, 2), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["order_id"],
                ["orders.id"],
                name="fk_order_items_order",
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["product_id"],
                ["products.id"],
                name="fk_order_items_product",
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(
                ["variant_id"],
                ["product_variants.id"],
                name="fk_order_items_variant",
                ondelete="SET NULL",
            ),
        )
        op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
        op.create_index("ix_order_items_product_id", "order_items", ["product_id"])
        op.create_index("ix_order_items_variant_id", "order_items", ["variant_id"])

    if "order_status_history" not in tables:
        op.create_table(
            "order_status_history",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("order_id", sa.Integer(), nullable=False),
            sa.Column("from_status", sa.String(length=20), nullable=True),
            sa.Column("to_status", sa.String(length=20), nullable=False),
            sa.Column("note", sa.String(length=255), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["order_id"],
                ["orders.id"],
                name="fk_order_status_history_order",
                ondelete="CASCADE",
            ),
        )
        op.create_index(
            "ix_order_status_history_order_id", "order_status_history", ["order_id"]
        )

    if "payments" not in tables:
        op.create_table(
            "payments",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("order_id", sa.Integer(), nullable=False),
            sa.Column(
                "provider",
                sa.String(length=30),
                nullable=False,
                server_default="razorpay",
            ),
            sa.Column("provider_order_id", sa.String(length=80), nullable=True),
            sa.Column("provider_payment_id", sa.String(length=80), nullable=True),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column(
                "currency", sa.String(length=8), nullable=False, server_default="INR"
            ),
            sa.Column(
                "status", sa.String(length=20), nullable=False, server_default="created"
            ),
            sa.Column("method", sa.String(length=30), nullable=True),
            sa.Column("raw_payload", sa.Text(), nullable=True),
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
                ["order_id"],
                ["orders.id"],
                name="fk_payments_order",
                ondelete="CASCADE",
            ),
        )
        op.create_index("ix_payments_order_id", "payments", ["order_id"])
        op.create_index(
            "ix_payments_provider_order_id", "payments", ["provider_order_id"]
        )
        op.create_index(
            "ix_payments_provider_payment_id", "payments", ["provider_payment_id"]
        )

    if "payment_events" not in tables:
        op.create_table(
            "payment_events",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("payment_id", sa.Integer(), nullable=True),
            sa.Column("event_id", sa.String(length=120), nullable=False),
            sa.Column("event_type", sa.String(length=60), nullable=False),
            sa.Column(
                "signature_valid",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
            sa.Column("payload", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("event_id", name="uq_payment_events_event_id"),
            sa.ForeignKeyConstraint(
                ["payment_id"],
                ["payments.id"],
                name="fk_payment_events_payment",
                ondelete="SET NULL",
            ),
        )
        op.create_index("ix_payment_events_payment_id", "payment_events", ["payment_id"])

    if "refunds" not in tables:
        op.create_table(
            "refunds",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("payment_id", sa.Integer(), nullable=False),
            sa.Column("order_id", sa.Integer(), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("reason", sa.String(length=255), nullable=True),
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=False,
                server_default="initiated",
            ),
            sa.Column("provider_refund_id", sa.String(length=80), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["payment_id"],
                ["payments.id"],
                name="fk_refunds_payment",
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["order_id"], ["orders.id"], name="fk_refunds_order", ondelete="CASCADE"
            ),
        )
        op.create_index("ix_refunds_payment_id", "refunds", ["payment_id"])
        op.create_index("ix_refunds_order_id", "refunds", ["order_id"])

    if "courier_accounts" not in tables:
        op.create_table(
            "courier_accounts",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column(
                "provider", sa.String(length=30), nullable=False, server_default="manual"
            ),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column(
                "is_active", sa.Boolean(), nullable=False, server_default=sa.true()
            ),
            sa.Column("config_json", sa.Text(), nullable=True),
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
        )

    if "shipments" not in tables:
        op.create_table(
            "shipments",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("order_id", sa.Integer(), nullable=False),
            sa.Column(
                "courier_provider",
                sa.String(length=30),
                nullable=False,
                server_default="manual",
            ),
            sa.Column("awb", sa.String(length=80), nullable=True),
            sa.Column("label_url", sa.String(length=500), nullable=True),
            sa.Column(
                "status", sa.String(length=30), nullable=False, server_default="created"
            ),
            sa.Column("pickup_scheduled_at", sa.DateTime(), nullable=True),
            sa.Column(
                "exception_flag",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
            sa.Column("exception_reason", sa.String(length=255), nullable=True),
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
                ["order_id"],
                ["orders.id"],
                name="fk_shipments_order",
                ondelete="CASCADE",
            ),
        )
        op.create_index("ix_shipments_order_id", "shipments", ["order_id"])
        op.create_index("ix_shipments_awb", "shipments", ["awb"])

    if "shipment_events" not in tables:
        op.create_table(
            "shipment_events",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("shipment_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False),
            sa.Column("message", sa.String(length=255), nullable=True),
            sa.Column(
                "event_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "source", sa.String(length=20), nullable=False, server_default="manual"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["shipment_id"],
                ["shipments.id"],
                name="fk_shipment_events_shipment",
                ondelete="CASCADE",
            ),
        )
        op.create_index(
            "ix_shipment_events_shipment_id", "shipment_events", ["shipment_id"]
        )

    if "notifications" not in tables:
        op.create_table(
            "notifications",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column(
                "channel", sa.String(length=16), nullable=False, server_default="email"
            ),
            sa.Column("template_key", sa.String(length=80), nullable=False),
            sa.Column("recipient", sa.String(length=255), nullable=False),
            sa.Column("subject", sa.String(length=255), nullable=True),
            sa.Column("body", sa.Text(), nullable=True),
            sa.Column(
                "status", sa.String(length=16), nullable=False, server_default="queued"
            ),
            sa.Column("related_order_id", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(
                ["related_order_id"],
                ["orders.id"],
                name="fk_notifications_order",
                ondelete="SET NULL",
            ),
        )
        op.create_index(
            "ix_notifications_related_order_id", "notifications", ["related_order_id"]
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    for table in (
        "notifications",
        "shipment_events",
        "shipments",
        "courier_accounts",
        "refunds",
        "payment_events",
        "payments",
        "order_status_history",
        "order_items",
        "orders",
        "customer_addresses",
        "cart_items",
        "carts",
        "stock_movements",
        "inventory_items",
        "inventory_settings",
    ):
        if table in tables:
            op.drop_table(table)
