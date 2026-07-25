from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.modules.customers.repositories.customer_repository import CustomerRepository
from app.modules.customers.schemas.auth import CustomerResponse
from app.modules.customers.services.admin_customer_service import (
    AdminCustomerService,
    CustomerStatusUpdate,
)
from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User

router = APIRouter(prefix="/admin/customers", tags=["Admin Customers"])


def get_service(db: DbSession) -> AdminCustomerService:
    return AdminCustomerService(CustomerRepository(db))


@router.get("", response_model=list[CustomerResponse])
def list_customers(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
    search: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
) -> list[CustomerResponse]:
    return get_service(db).list_customers(search=search, is_active=is_active)


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: UUID,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> CustomerResponse:
    return get_service(db).get_customer(customer_id)


@router.patch("/{customer_id}/status", response_model=CustomerResponse)
def update_customer_status(
    customer_id: UUID,
    payload: CustomerStatusUpdate,
    db: DbSession,
    _: AdminUser,
) -> CustomerResponse:
    return get_service(db).update_status(customer_id, payload)
