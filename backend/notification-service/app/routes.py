from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import get_db
from common.security import decode_token
from .models import Notification, NotificationPreference
from .schemas import NotificationCreate, NotificationResponse, NotificationPreferenceUpdate

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])
security = HTTPBearer()


async def get_current_user_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return decode_token(credentials.credentials)


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = Query(default=50, le=100),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    query = select(Notification).where(Notification.user_id == token_data.user_id)

    if unread_only:
        query = query.where(Notification.is_read == '0')

    query = query.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(query)

    return result.scalars().all()


@router.post("", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    notification = Notification(**notification_data.model_dump())
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    notification = await db.execute(
        select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == token_data.user_id)
        )
    )
    notification = notification.scalar_one_or_none()

    if not notification:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = '1'
    notification.read_at = datetime.utcnow()
    await db.commit()

    return {"message": "Marked as read"}


@router.put("/read-all")
async def mark_all_as_read(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    result = await db.execute(
        select(Notification).where(
            and_(Notification.user_id == token_data.user_id, Notification.is_read == '0')
        )
    )
    notifications = result.scalars().all()

    for n in notifications:
        n.is_read = '1'
        n.read_at = datetime.utcnow()

    await db.commit()
    return {"message": f"Marked {len(notifications)} as read"}


@router.get("/unread-count")
async def get_unread_count(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    from sqlalchemy import func
    result = await db.execute(
        select(func.count(Notification.id)).where(
            and_(Notification.user_id == token_data.user_id, Notification.is_read == '0')
        )
    )
    count = result.scalar() or 0

    return {"unread_count": count}
