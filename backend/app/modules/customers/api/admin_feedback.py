from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.modules.customers.repositories.engagement_repository import FeedbackRepository
from app.modules.customers.schemas.engagement import FeedbackResponse
from app.modules.iam.api.dependencies import require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User

router = APIRouter(prefix="/admin/feedback", tags=["Admin Feedback"])


@router.get("", response_model=list[FeedbackResponse])
def list_feedback(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> list[FeedbackResponse]:
    rows = FeedbackRepository(db).list_all()
    if status_filter:
        rows = [row for row in rows if row.status == status_filter]
    return [
        FeedbackResponse(
            id=row.id,
            customer_id=row.customer_id,
            name=row.name,
            email=row.email,
            subject=row.subject,
            message=row.message,
            status=row.status,
            created_at=row.created_at,
        )
        for row in rows
    ]
