from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, join, delete
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
from typing import List, Optional
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import get_db
from common.security import decode_token
from common.schemas import UserRole
from .models import ActivityLog, ProductivityRule, Screenshot, User, Department
from .schemas import (
    ActivityLogCreate, ActivityLogResponse, ProductivityRuleCreate,
    ProductivityRuleResponse, ActivitySummary, AppUsageStats,
    ScreenshotResponse, ActivityLogUpdate
)

router = APIRouter(prefix="/api/v1/monitoring", tags=["Monitoring"])
security = HTTPBearer()


async def get_current_user_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = decode_token(credentials.credentials)
    return token_data


@router.post("/activities", response_model=ActivityLogResponse)
async def log_activity(
    activity_data: ActivityLogCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    duration = 0
    if activity_data.end_time:
        duration = int((activity_data.end_time - activity_data.start_time).total_seconds())

    activity = ActivityLog(
        user_id=token_data.user_id,
        activity_type=activity_data.activity_type,
        app_name=activity_data.app_name,
        window_title=activity_data.window_title,
        url=activity_data.url,
        start_time=activity_data.start_time,
        end_time=activity_data.end_time,
        duration_seconds=duration
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return activity


@router.get("/activities", response_model=List[ActivityLogResponse])
async def get_activities(
    date: str = Query(..., pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    if token_data.role == UserRole.EMPLOYEE.value:
        result = await db.execute(
            select(ActivityLog).where(
                and_(
                    ActivityLog.user_id == token_data.user_id,
                    func.date(ActivityLog.start_time) == date
                )
            ).order_by(ActivityLog.start_time.desc())
        )
    else:
        user_id = Query(None)
        result = await db.execute(
            select(ActivityLog).where(func.date(ActivityLog.start_time) == date)
            .order_by(ActivityLog.start_time.desc())
        )

    return result.scalars().all()


@router.get("/summary", response_model=ActivitySummary)
async def get_activity_summary(
    date: str = Query(..., pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    user_id = token_data.user_id if token_data.role == UserRole.EMPLOYEE.value else None

    query = select(ActivityLog).where(func.date(ActivityLog.start_time) == date)
    if user_id:
        query = query.where(ActivityLog.user_id == user_id)

    result = await db.execute(query)
    activities = result.scalars().all()

    active_minutes = sum(a.duration_seconds for a in activities if a.activity_type == 'active') // 60
    idle_minutes = sum(a.duration_seconds for a in activities if a.activity_type == 'idle') // 60

    productive_apps = await db.execute(
        select(ProductivityRule.app_name).where(ProductivityRule.app_category == 'productive', ProductivityRule.is_active == '1')
    )
    productive_list = [r[0].lower() for r in productive_apps.all()]

    productive_time = sum(
        a.duration_seconds for a in activities
        if a.app_name and a.app_name.lower() in productive_list
    ) // 60

    total_minutes = 480
    productivity_score = (productive_time / total_minutes * 100) if total_minutes > 0 else 0

    return ActivitySummary(
        user_id=user_id or "all",
        date=date,
        active_minutes=active_minutes,
        idle_minutes=idle_minutes,
        offline_minutes=max(0, total_minutes - active_minutes - idle_minutes),
        total_minutes=total_minutes,
        productivity_score=round(productivity_score, 2)
    )


@router.get("/app-usage", response_model=List[AppUsageStats])
async def get_app_usage(
    date: str = Query(..., pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    user_id = token_data.user_id if token_data.role == UserRole.EMPLOYEE.value else None

    query = select(
        ActivityLog.app_name,
        func.sum(ActivityLog.duration_seconds).label('total_duration'),
        func.count(ActivityLog.id).label('usage_count')
    ).where(
        and_(
            func.date(ActivityLog.start_time) == date,
            ActivityLog.app_name.isnot(None)
        )
    )

    if user_id:
        query = query.where(ActivityLog.user_id == user_id)

    query = query.group_by(ActivityLog.app_name).order_by(func.sum(ActivityLog.duration_seconds).desc())
    result = await db.execute(query)
    rows = result.all()

    total_duration = sum(r.total_duration for r in rows) if rows else 1

    rules_result = await db.execute(select(ProductivityRule).where(ProductivityRule.is_active == '1'))
    rules = {r.app_name.lower(): r.app_category for r in rules_result.scalars().all()}

    return [
        AppUsageStats(
            app_name=row.app_name,
            category=rules.get(row.app_name.lower(), 'neutral'),
            total_minutes=row.total_duration // 60,
            usage_count=row.usage_count,
            percentage=round((row.total_duration / total_duration) * 100, 2)
        )
        for row in rows
    ]


@router.get("/rules", response_model=List[ProductivityRuleResponse])
async def get_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductivityRule).where(ProductivityRule.is_active == '1'))
    return result.scalars().all()


@router.post("/rules", response_model=ProductivityRuleResponse)
async def create_rule(
    rule_data: ProductivityRuleCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    rule = ProductivityRule(**rule_data.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


from fastapi import UploadFile, File, Form
from fastapi.responses import Response
import uuid
import shutil

@router.post("/screenshots")
async def upload_screenshot(
    file: UploadFile = File(...),
    taken_at: str = Form(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    image_bytes = await file.read()
    ts = datetime.fromisoformat(taken_at) if taken_at else datetime.utcnow()

    screenshot = Screenshot(
        user_id=token_data.user_id,
        image_data=image_bytes,
        filename=file.filename or f"screenshot_{token_data.user_id}.png",
        filepath="",
        taken_at=ts,
    )

    db.add(screenshot)
    await db.commit()
    await db.refresh(screenshot)

    return {"message": "Screenshot uploaded successfully", "id": screenshot.id}


@router.get("/screenshots", response_model=List[ScreenshotResponse])
async def get_screenshots(
    date: Optional[str] = Query(None, pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    user_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    # Employees can only see their own screenshots
    if token_data.role == UserRole.EMPLOYEE.value:
        user_id = token_data.user_id

    query = select(Screenshot).options(
        joinedload(Screenshot.user).joinedload(User.department)
    )

    if date:
        query = query.where(func.date(Screenshot.taken_at) == date)

    if user_id:
        query = query.where(Screenshot.user_id == user_id)

    if department_id:
        query = query.join(User).where(User.department_id == department_id)

    query = query.order_by(Screenshot.taken_at.desc())

    result = await db.execute(query)
    screenshots = result.scalars().unique().all()

    response = []
    for s in screenshots:
        user = s.user
        dept_name = "Unknown"
        if user and hasattr(user, 'department') and user.department:
            dept_name = user.department.name

        response.append(ScreenshotResponse(
            id=s.id,
            user_id=s.user_id,
            filename=s.filename,
            taken_at=s.taken_at,
            user_name=f"{user.first_name} {user.last_name}" if user else "Unknown",
            department_name=dept_name,
            image_url=f"/api/v1/monitoring/screenshots/{s.id}/image"
        ))

    return response


@router.delete("/screenshots", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_screenshots(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = decode_token(credentials.credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    await db.execute(delete(Screenshot))
    await db.commit()
    return None


@router.delete("/activities", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_activities(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = decode_token(credentials.credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    await db.execute(delete(ActivityLog))
    await db.commit()
    return None


@router.delete("/all", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_tracking_data(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = decode_token(credentials.credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    await db.execute(delete(Screenshot))
    await db.execute(delete(ActivityLog))
    await db.commit()
    return None


@router.get("/screenshots/{screenshot_id}/image")
async def get_screenshot_image(
    screenshot_id: int,
    token: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db)
):
    # Accept token from query param (for <img> tags) or Authorization header
    raw_token = None
    if token:
        raw_token = token
    elif credentials:
        raw_token = credentials.credentials

    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication required")

    token_data = decode_token(raw_token)

    result = await db.execute(select(Screenshot).where(Screenshot.id == screenshot_id))
    screenshot = result.scalar_one_or_none()

    if not screenshot:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    # Employees can only view their own screenshots
    if token_data.role == UserRole.EMPLOYEE.value and screenshot.user_id != token_data.user_id:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Serve binary image blob directly
    # Detect content type from filename if possible
    media_type = "image/png"
    if screenshot.filename:
        ext = os.path.splitext(screenshot.filename)[1].lower()
        if ext in (".jpg", ".jpeg"):
            media_type = "image/jpeg"
        elif ext == ".webp":
            media_type = "image/webp"

    return Response(
        content=screenshot.image_data,
        media_type=media_type,
        headers={"Cache-Control": "private, max-age=3600"}
    )


@router.patch("/activities/bulk-by-app", status_code=status.HTTP_200_OK)
async def update_activities_by_app(
    app_name: str,
    activity_update: ActivityLogUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    from sqlalchemy import update
    await db.execute(
        update(ActivityLog)
        .where(ActivityLog.app_name == app_name)
        .values(is_productive=activity_update.is_productive)
    )
    await db.commit()
    return {"message": f"All activities for {app_name} updated successfully"}


@router.patch("/activities/{activity_id}", response_model=ActivityLogResponse)
async def update_activity(
    activity_id: str,
    activity_update: ActivityLogUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    result = await db.execute(select(ActivityLog).where(ActivityLog.id == activity_id))
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity log not found")

    activity.is_productive = activity_update.is_productive
    await db.commit()
    await db.refresh(activity)
    return activity
