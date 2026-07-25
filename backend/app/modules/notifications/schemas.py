from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationSendRequest(BaseModel):
    channel: str = Field(default="email", pattern=r"^(email|sms)$")
    template_key: str = Field(min_length=1, max_length=80)
    recipient: str = Field(min_length=3, max_length=255)
    related_order_id: int | None = None
    context: dict[str, str] = Field(default_factory=dict)


class NotificationResponse(BaseModel):
    id: int
    channel: str
    template_key: str
    recipient: str
    subject: str | None
    body: str | None
    status: str
    related_order_id: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
