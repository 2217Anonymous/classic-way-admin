from fastapi import APIRouter

from app.modules.customers.api.dependencies import CurrentCustomer, DbSession
from app.modules.customers.repositories.customer_repository import CustomerRepository
from app.modules.customers.schemas.auth import (
    CustomerResponse,
    MessageResponse,
    PasswordChange,
    ProfileUpdate,
)
from app.modules.customers.services.auth_service import AuthService

router = APIRouter(prefix="/customers", tags=["Customers"])


def get_service(db: DbSession) -> AuthService:
    return AuthService(CustomerRepository(db))


@router.get("/me", response_model=CustomerResponse)
def get_me(customer: CurrentCustomer) -> CustomerResponse:
    return CustomerResponse.model_validate(customer)


@router.put("/me", response_model=CustomerResponse)
def update_me(
    payload: ProfileUpdate, customer: CurrentCustomer, db: DbSession
) -> CustomerResponse:
    return get_service(db).update_profile(customer, payload)


@router.put("/me/password", response_model=MessageResponse)
def change_password(
    payload: PasswordChange, customer: CurrentCustomer, db: DbSession
) -> MessageResponse:
    return get_service(db).change_password(customer, payload)
