from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
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
from app.modules.inventory.models import (  # noqa: F401
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
from app.modules.payments.models import Payment, PaymentEvent, Refund  # noqa: F401
from app.modules.settings.models import Coupon, StoreSettings, TaxRule  # noqa: F401

config = context.config
config.set_main_option(
    "sqlalchemy.url", settings.sqlalchemy_database_url().replace("%", "%%")
)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.sqlalchemy_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
