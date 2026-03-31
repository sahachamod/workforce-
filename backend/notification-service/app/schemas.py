from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class NotificationCreate(BaseModel):
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[Any] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[Any] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    notification_type: str
    email_enabled: bool = True
    push_enabled: bool = True
    in_app_enabled: bool = True


class EmailNotification(BaseModel):
    to: str
    subject: str
    body: str
    html: Optional[str] = None
