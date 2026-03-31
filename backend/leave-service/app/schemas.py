from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))


class LeaveTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    code: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None
    max_days_per_year: int = Field(default=0, ge=0)
    requires_approval: bool = True
    is_paid: bool = True


class LeaveTypeCreate(LeaveTypeBase):
    pass


class LeaveTypeResponse(LeaveTypeBase):
    id: str
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class LeaveRequestCreate(BaseModel):
    leave_type_id: str
    start_date: date
    end_date: date
    reason: Optional[str] = None


class LeaveRequestUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None


class LeaveApprovalRequest(BaseModel):
    action: str = Field(..., pattern="^(approved|rejected)$")
    comments: Optional[str] = None


class LeaveRequestResponse(BaseModel):
    id: str
    user_id: str
    leave_type_id: str
    start_date: date
    end_date: date
    total_days: Decimal
    reason: Optional[str] = None
    status: str
    approver_id: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None
    leave_type_name: Optional[str] = None

    class Config:
        from_attributes = True


class LeaveBalanceResponse(BaseModel):
    id: str
    user_id: str
    leave_type_id: str
    year: int
    total_days: Decimal
    used_days: Decimal
    pending_days: Decimal
    carry_forward_days: Decimal
    available_days: Decimal

    class Config:
        from_attributes = True


class LeaveCalendarEvent(BaseModel):
    id: str
    title: str
    start: date
    end: date
    type: str
    status: str
    user_name: str


class LeaveStats(BaseModel):
    total_requests: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    total_days_taken: Decimal
