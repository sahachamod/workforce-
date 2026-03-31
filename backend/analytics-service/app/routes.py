from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import List
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import get_db
from common.security import decode_token
from common.schemas import UserRole
from .schemas import (
    DashboardStats, ProductivityTrend, LeaveTrend, ProjectPerformance,
    AttendanceInsight, TeamWorkload
)

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])
security = HTTPBearer()


async def get_current_user_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return decode_token(credentials.credentials)


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    total_employees = await db.execute(select(func.count()).select_from("users"))
    employees = total_employees.scalar() or 0

    return DashboardStats(
        total_employees=employees,
        active_projects=12,
        pending_leaves=5,
        today_attendance=85.5,
        productivity_score=78.3
    )


@router.get("/productivity-trend", response_model=List[ProductivityTrend])
async def get_productivity_trend(
    days: int = Query(default=30, ge=1, le=90),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    trends = []
    for i in range(days):
        date = datetime.now() - timedelta(days=i)
        trends.append(ProductivityTrend(
            date=date.date(),
            score=70 + (i % 20),
            active_hours=6 + (i % 3)
        ))
    return trends


@router.get("/leave-trends", response_model=List[LeaveTrend])
async def get_leave_trends(
    months: int = Query(default=6, ge=1, le=12),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    trends = []
    for i in range(months):
        trends.append(LeaveTrend(
            month=f"2024-{(i % 12) + 1:02d}",
            approved=15 + i,
            rejected=2 + (i % 3),
            pending=5 + (i % 4)
        ))
    return trends


@router.get("/project-performance", response_model=List[ProjectPerformance])
async def get_project_performance(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    return [
        ProjectPerformance(project_id="1", project_name="Website Redesign", completion_rate=75.5, tasks_completed=45, tasks_total=60, time_logged_hours=320.5),
        ProjectPerformance(project_id="2", project_name="Mobile App", completion_rate=45.2, tasks_completed=22, tasks_total=50, time_logged_hours=180.0),
        ProjectPerformance(project_id="3", project_name="API Integration", completion_rate=90.0, tasks_completed=18, tasks_total=20, time_logged_hours=85.5),
    ]


@router.get("/attendance-insights", response_model=List[AttendanceInsight])
async def get_attendance_insights(
    days: int = Query(default=7, ge=1, le=30),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    insights = []
    for i in range(days):
        date = datetime.now() - timedelta(days=i)
        insights.append(AttendanceInsight(
            date=date.date(),
            present=85,
            absent=5,
            late=8,
            on_leave=2
        ))
    return insights


@router.get("/team-workload", response_model=List[TeamWorkload])
async def get_team_workload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    return [
        TeamWorkload(user_id="1", user_name="John Smith", tasks_assigned=10, tasks_completed=7, workload_percentage=70.0),
        TeamWorkload(user_id="2", user_name="Jane Doe", tasks_assigned=8, tasks_completed=8, workload_percentage=100.0),
        TeamWorkload(user_id="3", user_name="Bob Wilson", tasks_assigned=12, tasks_completed=5, workload_percentage=41.7),
    ]
