from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))


class ActivityLogCreate(BaseModel):
    activity_type: str = "active"
    app_name: Optional[str] = None
    window_title: Optional[str] = None
    url: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    is_productive: Optional[bool] = True


class ActivityLogResponse(BaseModel):
    id: str
    user_id: str
    activity_type: str
    app_name: Optional[str] = None
    window_title: Optional[str] = None
    url: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: int
    is_productive: bool = True

    class Config:
        from_attributes = True


class ActivityLogUpdate(BaseModel):
    is_productive: bool


class ProductivityRuleCreate(BaseModel):
    app_name: str
    app_category: str = Field(..., pattern="^(productive|neutral|unproductive)$")


class ProductivityRuleResponse(BaseModel):
    id: str
    app_name: str
    app_category: str
    is_active: bool

    class Config:
        from_attributes = True


class ActivitySummary(BaseModel):
    user_id: str
    date: str
    active_minutes: int
    idle_minutes: int
    offline_minutes: int
    total_minutes: int
    productivity_score: float


class AppUsageStats(BaseModel):
    app_name: str
    category: str
    total_minutes: int
    usage_count: int
    percentage: float


class ScreenshotResponse(BaseModel):
    id: int
    user_id: str
    filename: Optional[str] = None
    taken_at: datetime
    user_name: Optional[str] = None
    department_name: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class ScreenshotCreate(BaseModel):
    user_id: str
    filename: Optional[str] = None
    taken_at: datetime
