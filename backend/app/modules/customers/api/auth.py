from fastapi import APIRouter

from app.modules.customers.api.dependencies import CurrentCustomer, DbSession
from app.modules.customers.repositories.customer_repository import CustomerRepository
from app.modules.customers.schemas.auth import (
    CustomerResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPairResponse,
)
from app.modules.customers.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Customer Auth"])


def get_service(db: DbSession) -> AuthService:
    return AuthService(CustomerRepository(db))


@router.post("/register", response_model=TokenPairResponse)
def register(payload: RegisterRequest, db: DbSession) -> TokenPairResponse:
    return get_service(db).register(payload)


@router.post("/login", response_model=TokenPairResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenPairResponse:
    return get_service(db).login(payload)


@router.post("/logout", response_model=MessageResponse)
def logout(payload: LogoutRequest, db: DbSession) -> MessageResponse:
    return get_service(db).logout(payload.refresh_token)


@router.post("/refresh", response_model=TokenPairResponse)
def refresh(payload: RefreshRequest, db: DbSession) -> TokenPairResponse:
    return get_service(db).refresh(payload.refresh_token)


@router.get("/me", response_model=CustomerResponse)
def me(customer: CurrentCustomer) -> CustomerResponse:
    return CustomerResponse.model_validate(customer)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: DbSession) -> MessageResponse:
    return get_service(db).forgot_password(payload.email)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: DbSession) -> MessageResponse:
    return get_service(db).reset_password(payload.token, payload.new_password)
