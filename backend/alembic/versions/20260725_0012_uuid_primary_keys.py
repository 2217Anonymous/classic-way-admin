"""Rebuild all tables with UUID primary keys and foreign keys.

Revision ID: 20260725_0012
Revises: 20260725_0011
Create Date: 2026-07-25

Destructive: drops application tables and recreates from current SQLAlchemy models
with UUID PKs/FKs. Re-seed after upgrade (fashion_seed + admin bootstrap).
"""

from __future__ import annotations

from alembic import op

from app.core.database import Base
from app.modules.catalog.models.attribute import AttributeDefinition  # noqa: F401
from app.modules.catalog.models.brand import Brand  # noqa: F401
from app.modules.catalog.models.category import Category  # noqa: F401
from app.modules.catalog.models.product import (  # noqa: F401
    Product,
    ProductAttribute,
    ProductMedia,
    ProductVariant,
)
from app.modules.customers.models import (  # noqa: F401
    CompareItem,
    CompareList,
    CouponUsage,
    Customer,
    Feedback,
    RefreshToken,
    Review,
    ReviewImage,
    Wishlist,
    WishlistItem,
)
from app.modules.fulfillment.models import (  # noqa: F401
    CourierAccount,
    Shipment,
    ShipmentEvent,
)
from app.modules.iam.models.role import Role  # noqa: F401
from app.modules.identity.models.user import User  # noqa: F401
from app.modules.inventory.models.inventory import (  # noqa: F401
    InventoryItem,
    InventorySettings,
    StockMovement,
)
from app.modules.notifications.models import Notification  # noqa: F401
from app.modules.orders.models.address import CustomerAddress  # noqa: F401
from app.modules.orders.models.cart import Cart, CartItem  # noqa: F401
from app.modules.orders.models.order import (  # noqa: F401
    Order,
    OrderItem,
    OrderStatusHistory,
)
from app.modules.payments.models.payment import Payment, PaymentEvent, Refund  # noqa: F401
from app.modules.settings.models.coupon import Coupon  # noqa: F401
from app.modules.settings.models.store import StoreSettings  # noqa: F401
from app.modules.settings.models.tax import TaxRule  # noqa: F401

revision = "20260725_0012"
down_revision = "20260725_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    # Preserve alembic_version; rebuild all app tables as UUID PKs.
    Base.metadata.drop_all(bind=bind)
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    raise NotImplementedError("UUID PK migration cannot be downgraded automatically")
