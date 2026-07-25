from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.notifications.models import Notification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Notification]:
        statement = select(Notification).order_by(Notification.created_at.desc())
        return list(self.db.scalars(statement).all())

    def create(self, **fields) -> Notification:
        row = Notification(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row
