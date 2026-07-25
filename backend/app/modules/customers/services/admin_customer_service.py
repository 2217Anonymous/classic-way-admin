from __future__ import annotations

from uuid import UUID
from app.modules.customers.models import Customer
from app.modules.customers.repositories.customer_repository import CustomerRepository
from app.modules.customers.schemas.auth import CustomerResponse
from app.utils.exceptions import NotFoundError
from pydantic import BaseModel


class CustomerStatusUpdate(BaseModel):
    is_active: bool


class AdminCustomerService:
    def __init__(self, repository: CustomerRepository):
        self.repository = repository

    def list_customers(
        self,
        *,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> list[CustomerResponse]:
        return [
            CustomerResponse.model_validate(c)
            for c in self.repository.list(search=search, is_active=is_active)
        ]

    def get_customer(self, customer_id: UUID) -> CustomerResponse:
        customer = self._get_or_404(customer_id)
        return CustomerResponse.model_validate(customer)

    def update_status(
        self, customer_id: UUID, payload: CustomerStatusUpdate
    ) -> CustomerResponse:
        customer = self._get_or_404(customer_id)
        customer.is_active = payload.is_active
        return CustomerResponse.model_validate(self.repository.save(customer))

    def _get_or_404(self, customer_id: UUID) -> Customer:
        customer = self.repository.get(customer_id)
        if not customer:
            raise NotFoundError("Customer not found")
        return customer
