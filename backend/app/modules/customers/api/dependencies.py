from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.modules.customers.models import Customer
from app.modules.customers.repositories.customer_repository import CustomerRepository
from app.utils.exceptions import AuthenticationError

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_v1_prefix}/auth/login"
)
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_v1_prefix}/auth/login",
    auto_error=False,
)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_customer(
    db: DbSession,
    token: Annotated[str, Depends(oauth2_scheme)],
) -> Customer:
    payload = decode_token(token, expected_type="access")
    if payload.get("scope") != "customer":
        raise AuthenticationError("Customer token required")
    try:
        customer_id = UUID(payload.get("sub", ""))
    except (TypeError, ValueError) as exc:
        raise AuthenticationError() from exc

    customer = CustomerRepository(db).get(customer_id)
    if not customer or not customer.is_active:
        raise AuthenticationError()
    return customer


def get_optional_customer(
    db: DbSession,
    token: Annotated[str | None, Depends(optional_oauth2_scheme)],
) -> Customer | None:
    if not token:
        return None
    try:
        return get_current_customer(db, token)
    except AuthenticationError:
        return None


CurrentCustomer = Annotated[Customer, Depends(get_current_customer)]
OptionalCustomer = Annotated[Customer | None, Depends(get_optional_customer)]
