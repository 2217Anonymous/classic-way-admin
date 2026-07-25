from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.modules.customers.models import Customer, RefreshToken


class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(
        self,
        *,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> list[Customer]:
        statement = select(Customer).where(Customer.deleted_at.is_(None))
        if is_active is not None:
            statement = statement.where(Customer.is_active.is_(is_active))
        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(
                    Customer.email.ilike(term),
                    Customer.full_name.ilike(term),
                )
            )
        statement = statement.order_by(Customer.created_at.desc())
        return list(self.db.scalars(statement).all())

    def get(self, customer_id: UUID) -> Customer | None:
        customer = self.db.get(Customer, customer_id)
        if customer and customer.deleted_at is None:
            return customer
        return None

    def get_by_email(self, email: str) -> Customer | None:
        statement = select(Customer).where(
            Customer.email == email.strip().lower(),
            Customer.deleted_at.is_(None),
        )
        return self.db.scalars(statement).first()

    def create(
        self,
        *,
        email: str,
        full_name: str,
        hashed_password: str,
        phone: str | None = None,
    ) -> Customer:
        customer = Customer(
            email=email.strip().lower(),
            full_name=full_name.strip(),
            phone=phone.strip() if phone else None,
            hashed_password=hashed_password,
            is_active=True,
            email_verified=False,
        )
        return self.save(customer)

    def save(self, customer: Customer) -> Customer:
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def create_refresh_token(
        self,
        *,
        customer_id: UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> RefreshToken:
        row = RefreshToken(
            customer_id=customer_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def get_refresh_token_by_hash(self, token_hash: str) -> RefreshToken | None:
        statement = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        return self.db.scalars(statement).first()

    def revoke_refresh_token(self, token: RefreshToken) -> None:
        token.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
        self.db.add(token)
        self.db.commit()

    def revoke_all_refresh_tokens(self, customer_id: UUID) -> None:
        statement = select(RefreshToken).where(
            RefreshToken.customer_id == customer_id,
            RefreshToken.revoked_at.is_(None),
        )
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for token in self.db.scalars(statement).all():
            token.revoked_at = now
        self.db.commit()
