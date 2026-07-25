from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class CustomerResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: str | None
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
