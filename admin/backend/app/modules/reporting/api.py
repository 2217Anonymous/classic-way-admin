from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse

from app.modules.iam.api.dependencies import require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.reporting.schemas import ReportSummaryResponse
from app.modules.reporting.services import ReportingService

router = APIRouter(prefix="/reports", tags=["Reports"])


def get_service(db: DbSession) -> ReportingService:
    return ReportingService(db)


@router.get("/summary", response_model=ReportSummaryResponse)
def get_summary(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> ReportSummaryResponse:
    return get_service(db).summary()


@router.get("/sales.csv", response_class=PlainTextResponse)
def get_sales_csv(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> PlainTextResponse:
    csv_data = get_service(db).sales_csv()
    return PlainTextResponse(content=csv_data, media_type="text/csv")
