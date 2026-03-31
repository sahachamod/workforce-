from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class PayrollBase(BaseModel):
    user_id: str
    month: int
    year: int
    basic_salary: Decimal
    allowances: Decimal
    deductions: Optional[Decimal] = Decimal('0.0')
    notes: Optional[str] = None
    status: Optional[str] = 'draft'


class PayrollCreate(PayrollBase):
    pass


class PayrollUpdate(BaseModel):
    basic_salary: Optional[Decimal] = None
    allowances: Optional[Decimal] = None
    deductions: Optional[Decimal] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    payment_date: Optional[datetime] = None


class PayrollResponse(PayrollBase):
    id: str
    net_salary: Decimal
    user_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    payment_date: Optional[datetime] = None

    class Config:
        from_attributes = True
