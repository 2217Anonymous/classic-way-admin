from __future__ import annotations

from app.modules.notifications.repositories import NotificationRepository
from app.modules.notifications.schemas import (
    NotificationResponse,
    NotificationSendRequest,
)

TEMPLATES: dict[str, str] = {
    "order_confirmation": (
        "Your order {order_number} has been placed. Thank you for shopping "
        "with Valaiyagam!"
    ),
    "order_shipped": (
        "Your order {order_number} has shipped. Track it with AWB {awb}."
    ),
    "order_delivered": (
        "Your order {order_number} has been delivered. We hope you love it!"
    ),
    "payment_received": "We have received your payment for order {order_number}.",
}


class NotificationService:
    """VL-027 — demo notification dispatch (no real email/SMS provider)."""

    def __init__(self, repository: NotificationRepository):
        self.repository = repository

    def list_notifications(self) -> list[NotificationResponse]:
        return [
            NotificationResponse.model_validate(row) for row in self.repository.list()
        ]

    def send(self, payload: NotificationSendRequest) -> NotificationResponse:
        template = TEMPLATES.get(payload.template_key, "Notification: {template_key}")
        try:
            body = template.format(template_key=payload.template_key, **payload.context)
        except (KeyError, IndexError):
            body = template

        row = self.repository.create(
            channel=payload.channel,
            template_key=payload.template_key,
            recipient=payload.recipient.strip(),
            subject=f"Valaiyagam — {payload.template_key.replace('_', ' ').title()}",
            body=body,
            status="sent",
            related_order_id=payload.related_order_id,
        )
        return NotificationResponse.model_validate(row)
