from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))


class ShiftCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    start_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    end_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    break_duration_minutes: int = Field(default=0, ge=0)
    location: Optional[str] = None
    color: str = "#3B82F6"
    is_night_shift: bool = False


class ShiftResponse(BaseModel):
    id: str
    name: str
    start_time: str
    end_time: str
    break_duration_minutes: int
    location: Optional[str] = None
    color: str
    is_night_shift: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ShiftAssignmentCreate(BaseModel):
    shift_id: str
    user_id: str
    date: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$")
    work_mode: Optional[str] = "office"


class ShiftAssignmentResponse(BaseModel):
    id: str
    shift_id: str
    user_id: str
    date: str
    status: str
    work_mode: str
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    notes: Optional[str] = None
    shift_name: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class ShiftSwapCreate(BaseModel):
    target_id: str
    requester_assignment_id: str
    target_assignment_id: str
    reason: Optional[str] = None


class ShiftSwapResponse(BaseModel):
    id: str
    requester_id: str
    target_id: str
    requester_assignment_id: str
    target_assignment_id: str
    status: str
    approver_id: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceLogCreate(BaseModel):
    user_id: str
    date: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$")
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: str = "present"


class AttendanceLogResponse(BaseModel):
    id: str
    user_id: str
    date: str
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    total_hours: str
    overtime_hours: str
    status: str
    remarks: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class RosterCalendarEvent(BaseModel):
    id: str
    title: str
    date: str
    shift_name: str
    color: str
    user_name: str
    status: str
    work_mode: Optional[str] = "office"
class UserDashboardStats(BaseModel):
    today_check_in: Optional[datetime] = None
    today_check_out: Optional[datetime] = None
    today_hours: float = 0.0
    weekly_hours: float = 0.0
    monthly_hours: float = 0.0
