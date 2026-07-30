from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.settings.repositories.tax_repository import TaxRuleRepository
from app.modules.settings.schemas.tax import TaxRuleCreate, TaxRuleResponse, TaxRuleUpdate
from app.modules.settings.services.tax_service import TaxRuleService

router = APIRouter(tags=["Settings"])


def get_tax_service(db: DbSession) -> TaxRuleService:
    return TaxRuleService(TaxRuleRepository(db))


@router.get("/tax-rules", response_model=list[TaxRuleResponse])
def list_tax_rules(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[TaxRuleResponse]:
    return get_tax_service(db).list_rules()


@router.post(
    "/tax-rules",
    response_model=TaxRuleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_tax_rule(
    payload: TaxRuleCreate, db: DbSession, _: AdminUser
) -> TaxRuleResponse:
    return get_tax_service(db).create_rule(payload)


@router.patch("/tax-rules/{tax_id}", response_model=TaxRuleResponse)
def update_tax_rule(
    tax_id: UUID, payload: TaxRuleUpdate, db: DbSession, _: AdminUser
) -> TaxRuleResponse:
    return get_tax_service(db).update_rule(tax_id, payload)


@router.delete("/tax-rules/{tax_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tax_rule(tax_id: UUID, db: DbSession, _: AdminUser) -> None:
    get_tax_service(db).delete_rule(tax_id)
