from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.modules.customers.models import Customer
from app.modules.customers.repositories.customer_repository import CustomerRepository
from app.modules.customers.schemas.auth import (
    CustomerResponse,
    LoginRequest,
    MessageResponse,
    PasswordChange,
    ProfileUpdate,
    RegisterRequest,
    TokenPairResponse,
)
from app.utils.exceptions import AuthenticationError, ConflictError, NotFoundError


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthService:
    def __init__(self, repository: CustomerRepository):
        self.repository = repository

    def register(self, payload: RegisterRequest) -> TokenPairResponse:
        if self.repository.get_by_email(payload.email):
            raise ConflictError("An account with this email already exists")
        customer = self.repository.create(
            email=payload.email,
            full_name=payload.full_name,
            phone=payload.phone,
            hashed_password=hash_password(payload.password),
        )
        return self._issue_tokens(customer)

    def login(self, payload: LoginRequest) -> TokenPairResponse:
        customer = self.repository.get_by_email(payload.email)
        if (
            not customer
            or not customer.is_active
            or not verify_password(payload.password, customer.hashed_password)
        ):
            raise AuthenticationError("Invalid email or password")
        return self._issue_tokens(customer)

    def logout(self, refresh_token: str | None) -> MessageResponse:
        if refresh_token:
            token = self.repository.get_refresh_token_by_hash(_hash_token(refresh_token))
            if token and token.revoked_at is None:
                self.repository.revoke_refresh_token(token)
        return MessageResponse(message="Logged out")

    def refresh(self, refresh_token: str) -> TokenPairResponse:
        payload = decode_token(refresh_token, expected_type="refresh")
        if payload.get("scope") != "customer":
            raise AuthenticationError("Customer token required")

        stored = self.repository.get_refresh_token_by_hash(_hash_token(refresh_token))
        if not stored or stored.revoked_at is not None:
            raise AuthenticationError("Refresh token revoked")
        expires_at = stored.expires_at
        if expires_at.tzinfo is None:
            if expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
                raise AuthenticationError("Refresh token expired")
        elif expires_at < datetime.now(timezone.utc):
            raise AuthenticationError("Refresh token expired")

        try:
            customer_id = UUID(payload.get("sub", ""))
        except (TypeError, ValueError) as exc:
            raise AuthenticationError() from exc

        customer = self.repository.get(customer_id)
        if not customer or not customer.is_active:
            raise AuthenticationError()

        self.repository.revoke_refresh_token(stored)
        return self._issue_tokens(customer)

    def me(self, customer: Customer) -> CustomerResponse:
        return CustomerResponse.model_validate(customer)

    def update_profile(
        self, customer: Customer, payload: ProfileUpdate
    ) -> CustomerResponse:
        data = payload.model_dump(exclude_unset=True)
        if "full_name" in data and data["full_name"] is not None:
            customer.full_name = data["full_name"].strip()
        if "phone" in data:
            phone = data["phone"]
            customer.phone = phone.strip() if phone else None
        return CustomerResponse.model_validate(self.repository.save(customer))

    def change_password(
        self, customer: Customer, payload: PasswordChange
    ) -> MessageResponse:
        if not verify_password(payload.current_password, customer.hashed_password):
            raise AuthenticationError("Current password is incorrect")
        customer.hashed_password = hash_password(payload.new_password)
        self.repository.save(customer)
        self.repository.revoke_all_refresh_tokens(customer.id)
        return MessageResponse(message="Password updated")

    def forgot_password(self, email: str) -> MessageResponse:
        # Stub — avoid revealing whether the email exists.
        _ = self.repository.get_by_email(email)
        return MessageResponse(message="If that email exists, a reset link was sent")

    def reset_password(self, token: str, new_password: str) -> MessageResponse:
        _ = token, new_password
        raise NotFoundError("Password reset is not configured yet")

    def _issue_tokens(self, customer: Customer) -> TokenPairResponse:
        access = create_access_token(str(customer.id), scope="customer")
        refresh = create_refresh_token(str(customer.id), scope="customer")
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.refresh_token_expire_days
        )
        self.repository.create_refresh_token(
            customer_id=customer.id,
            token_hash=_hash_token(refresh),
            expires_at=expires_at.replace(tzinfo=None),
        )
        return TokenPairResponse(
            access_token=access,
            refresh_token=refresh,
            token_type="bearer",
            customer=CustomerResponse.model_validate(customer),
        )
