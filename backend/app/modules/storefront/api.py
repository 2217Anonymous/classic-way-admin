from fastapi import APIRouter

from app.modules.catalog.repositories.category_repository import CategoryRepository
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.catalog.schemas.product import ProductResponse
from app.modules.identity.api.dependencies import DbSession
from app.modules.storefront.services import StorefrontService

router = APIRouter(prefix="/store", tags=["Storefront"])


def get_service(db: DbSession) -> StorefrontService:
    return StorefrontService(ProductRepository(db), CategoryRepository(db))


@router.get("/products", response_model=list[ProductResponse])
def list_public_products(db: DbSession) -> list[ProductResponse]:
    return get_service(db).list_products()


@router.get("/products/{slug}", response_model=ProductResponse)
def get_public_product(slug: str, db: DbSession) -> ProductResponse:
    return get_service(db).get_product(slug)
