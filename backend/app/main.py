from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.init_db import seed_database
from app.modules.catalog.api import attributes, brands, categories, products
from app.modules.catalog.services.category_service import CATEGORY_UPLOAD_DIR, UPLOAD_ROOT
from app.modules.catalog.services.product_service import PRODUCT_UPLOAD_DIR
from app.modules.customers.api import (
    admin_coupon_usages,
    admin_customers,
    admin_feedback,
    admin_reviews,
)
from app.modules.fulfillment.api import router as shipments_router
from app.modules.fulfillment.api import track_router
from app.modules.iam.api import roles
from app.modules.identity.api import auth, users
from app.modules.inventory.api import router as inventory_router
from app.modules.notifications.api import router as notifications_router
from app.modules.orders.api import addresses, cart, orders, shipping
from app.modules.payments.api import router as payments_router
from app.modules.reporting.api import router as reports_router
from app.modules.settings.api import router as settings_router
from app.modules.storefront.api import router as store_router
from app.utils.exceptions import AppError


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    CATEGORY_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    PRODUCT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with SessionLocal() as db:
        seed_database(db)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=(
        r"^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$"
        if settings.app_env == "development"
        else None
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(Path(UPLOAD_ROOT))), name="uploads")

app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(users.router, prefix=settings.api_v1_prefix)
app.include_router(roles.router, prefix=settings.api_v1_prefix)
app.include_router(categories.router, prefix=settings.api_v1_prefix)
app.include_router(products.router, prefix=settings.api_v1_prefix)
app.include_router(brands.router, prefix=settings.api_v1_prefix)
app.include_router(attributes.router, prefix=settings.api_v1_prefix)
app.include_router(settings_router, prefix=settings.api_v1_prefix)
app.include_router(inventory_router, prefix=settings.api_v1_prefix)
app.include_router(store_router, prefix=settings.api_v1_prefix)
app.include_router(cart.router, prefix=settings.api_v1_prefix)
app.include_router(addresses.router, prefix=settings.api_v1_prefix)
app.include_router(shipping.router, prefix=settings.api_v1_prefix)
app.include_router(orders.router, prefix=settings.api_v1_prefix)
app.include_router(payments_router, prefix=settings.api_v1_prefix)
app.include_router(shipments_router, prefix=settings.api_v1_prefix)
app.include_router(track_router, prefix=settings.api_v1_prefix)
app.include_router(notifications_router, prefix=settings.api_v1_prefix)
app.include_router(reports_router, prefix=settings.api_v1_prefix)
app.include_router(admin_customers.router, prefix=settings.api_v1_prefix)
app.include_router(admin_reviews.router, prefix=settings.api_v1_prefix)
app.include_router(admin_feedback.router, prefix=settings.api_v1_prefix)
app.include_router(admin_coupon_usages.router, prefix=settings.api_v1_prefix)
