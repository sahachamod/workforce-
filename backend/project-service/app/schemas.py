from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: str = "planning"
    priority: str = "medium"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    client_name: Optional[str] = None


class ProjectCreate(ProjectBase):
    member_ids: Optional[List[str]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None


class ProjectResponse(ProjectBase):
    id: str
    owner_id: str
    owner_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    task_count: int = 0
    member_count: int = 0

    class Config:
        from_attributes = True


class ProjectMemberBase(BaseModel):
    user_id: str
    role: str = "developer"
    hourly_rate: Optional[Decimal] = None


class ProjectMemberAdd(BaseModel):
    user_id: str
    role: str = Field(default="developer", pattern="^(owner|manager|developer|qa|viewer)$")


class ProjectMemberResponse(BaseModel):
    id: str
    user_id: str
    role: str
    hourly_rate: Optional[Decimal] = None
    joined_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    priority: str = "medium"
    story_points: Optional[int] = None
    estimated_hours: Optional[Decimal] = None
    due_date: Optional[date] = None
    parent_task_id: Optional[str] = None
    evidence_file: Optional[str] = None


class TaskCreate(TaskBase):
    project_id: str
    assignee_ids: Optional[List[str]] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    story_points: Optional[int] = None
    estimated_hours: Optional[Decimal] = None
    due_date: Optional[date] = None
    position: Optional[int] = None
    evidence_file: Optional[str] = None


class TaskResponse(TaskBase):
    id: str
    project_id: str
    status: str
    position: int
    created_by: str
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    assignee_names: List[str] = []
    total_time_logged: int = 0

    class Config:
        from_attributes = True


class TaskAssignmentResponse(BaseModel):
    id: str
    user_id: str
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class TimeLogCreate(BaseModel):
    task_id: Optional[str] = None
    project_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    description: Optional[str] = None
    is_billable: bool = True


class TimeLogUpdate(BaseModel):
    end_time: Optional[datetime] = None
    description: Optional[str] = None
    is_billable: Optional[bool] = None


class TimeLogResponse(BaseModel):
    id: str
    user_id: str
    task_id: Optional[str] = None
    project_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: int
    description: Optional[str] = None
    is_billable: bool
    created_at: datetime
    user_name: Optional[str] = None
    task_title: Optional[str] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectAnalytics(BaseModel):
    project_id: str
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    blocked_tasks: int
    total_time_logged: int
    total_budget: Optional[Decimal] = None
    time_logged_hours: Decimal
    budget_utilization: Optional[float] = None
    team_velocity: float
    estimated_vs_actual: Decimal
class UserProjectStats(BaseModel):
    active_projects_count: int
    completed_tasks_count: int
    pending_tasks_count: int
