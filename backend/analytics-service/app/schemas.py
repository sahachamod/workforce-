from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from decimal import Decimal


class DashboardStats(BaseModel):
    total_employees: int
    active_projects: int
    pending_leaves: int
    today_attendance: float
    productivity_score: float


class ProductivityTrend(BaseModel):
    date: date
    score: float
    active_hours: float


class LeaveTrend(BaseModel):
    month: str
    approved: int
    rejected: int
    pending: int


class ProjectPerformance(BaseModel):
    project_id: str
    project_name: str
    completion_rate: float
    tasks_completed: int
    tasks_total: int
    time_logged_hours: float


class AttendanceInsight(BaseModel):
    date: date
    present: int
    absent: int
    late: int
    on_leave: int


class TeamWorkload(BaseModel):
    user_id: str
    user_name: str
    tasks_assigned: int
    tasks_completed: int
    workload_percentage: float
