from fastapi import APIRouter

from app.modules.settings.api.coupons import router as coupons_router
from app.modules.settings.api.store import router as store_router
from app.modules.settings.api.tax_rules import router as tax_rules_router
from app.modules.settings.api.theme import router as theme_router

router = APIRouter(tags=["Settings"])
router.include_router(store_router)
router.include_router(tax_rules_router)
router.include_router(coupons_router)
router.include_router(theme_router)

__all__ = ["router"]
