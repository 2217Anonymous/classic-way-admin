from __future__ import annotations

from sqlalchemy.exc import IntegrityError

from app.modules.catalog.repositories.attribute_repository import AttributeRepository
from app.modules.catalog.schemas.attribute import (
    AttributeDefinitionCreate,
    AttributeDefinitionResponse,
    AttributeDefinitionUpdate,
)
from app.utils.exceptions import AppError, ConflictError, NotFoundError


class AttributeService:
    def __init__(self, repository: AttributeRepository):
        self.repository = repository

    def list_attributes(self) -> list[AttributeDefinitionResponse]:
        return [
            AttributeDefinitionResponse.model_validate(item)
            for item in self.repository.list()
        ]

    def get_attribute(self, attribute_id: int) -> AttributeDefinitionResponse:
        row = self.repository.get(attribute_id)
        if not row:
            raise NotFoundError("Attribute not found")
        return AttributeDefinitionResponse.model_validate(row)

    def create_attribute(
        self, payload: AttributeDefinitionCreate
    ) -> AttributeDefinitionResponse:
        name = payload.name.strip()
        values = [value.strip() for value in payload.values if value.strip()]
        if not values:
            raise AppError("Attribute needs at least one value", 400)
        if self.repository.get_by_name(name):
            raise ConflictError("An attribute with this name already exists")
        try:
            row = self.repository.create(
                name=name,
                values=values,
                sort_order=payload.sort_order,
                is_active=payload.is_active,
            )
            return AttributeDefinitionResponse.model_validate(row)
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("An attribute with this name already exists") from exc

    def update_attribute(
        self, attribute_id: int, payload: AttributeDefinitionUpdate
    ) -> AttributeDefinitionResponse:
        row = self.repository.get(attribute_id)
        if not row:
            raise NotFoundError("Attribute not found")

        changes = payload.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] is not None:
            name = changes["name"].strip()
            existing = self.repository.get_by_name(name)
            if existing and existing.id != attribute_id:
                raise ConflictError("An attribute with this name already exists")
            row.name = name
        if "values" in changes and changes["values"] is not None:
            values = [value.strip() for value in changes["values"] if value.strip()]
            if not values:
                raise AppError("Attribute needs at least one value", 400)
            row.values = values
        if "sort_order" in changes and changes["sort_order"] is not None:
            row.sort_order = changes["sort_order"]
        if "is_active" in changes and changes["is_active"] is not None:
            row.is_active = changes["is_active"]

        try:
            saved = self.repository.save(row)
            return AttributeDefinitionResponse.model_validate(saved)
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("An attribute with this name already exists") from exc

    def delete_attribute(self, attribute_id: int) -> None:
        row = self.repository.get(attribute_id)
        if not row:
            raise NotFoundError("Attribute not found")
        self.repository.delete(row)
