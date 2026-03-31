from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, delete
from sqlalchemy.orm import joinedload
from datetime import datetime
from typing import List, Optional
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import get_db
from common.security import decode_token
from common.schemas import UserRole
from .models import Payroll, User
from .schemas import PayrollCreate, PayrollUpdate, PayrollResponse

router = APIRouter(prefix="/api/v1/payroll", tags=["Payroll"])
security = HTTPBearer()


async def get_current_user_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = decode_token(credentials.credentials)
    return token_data


@router.post("", response_model=PayrollResponse)
async def create_payroll(
    payroll_data: PayrollCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Check if payroll already exists for the user in the given month/year
    existing = await db.execute(select(Payroll).where(and_(
        Payroll.user_id == payroll_data.user_id,
        Payroll.month == payroll_data.month,
        Payroll.year == payroll_data.year
    )))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Payroll record already exists for this period")

    net_salary = payroll_data.basic_salary + payroll_data.allowances - (payroll_data.deductions or 0)

    new_payroll = Payroll(
        user_id=payroll_data.user_id,
        month=payroll_data.month,
        year=payroll_data.year,
        basic_salary=payroll_data.basic_salary,
        allowances=payroll_data.allowances,
        deductions=payroll_data.deductions or 0,
        net_salary=net_salary,
        status=payroll_data.status,
        notes=payroll_data.notes
    )

    db.add(new_payroll)
    await db.commit()
    await db.refresh(new_payroll)
    
    # Get user name for response
    user_res = await db.execute(select(User).where(User.id == new_payroll.user_id))
    user = user_res.scalar_one_or_none()
    
    response = PayrollResponse.model_validate(new_payroll)
    if user:
        response.user_name = f"{user.first_name} {user.last_name}"
    
    return response


@router.get("", response_model=List[PayrollResponse])
async def get_payrolls(
    month: Optional[int] = None,
    year: Optional[int] = None,
    user_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    query = select(Payroll).options(joinedload(Payroll.user))

    if token_data.role == UserRole.EMPLOYEE.value:
        query = query.where(Payroll.user_id == token_data.user_id)
    else:
        if user_id:
            query = query.where(Payroll.user_id == user_id)
    
    if month:
        query = query.where(Payroll.month == month)
    if year:
        query = query.where(Payroll.year == year)

    query = query.order_by(Payroll.year.desc(), Payroll.month.desc())
    result = await db.execute(query)
    payrolls = result.scalars().unique().all()

    response = []
    for p in payrolls:
        item = PayrollResponse.model_validate(p)
        if p.user:
            item.user_name = f"{p.user.first_name} {p.user.last_name}"
        response.append(item)

    return response


@router.get("/{payroll_id}", response_model=PayrollResponse)
async def get_payroll(
    payroll_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    
    query = select(Payroll).where(Payroll.id == payroll_id).options(joinedload(Payroll.user))
    result = await db.execute(query)
    p = result.scalar_one_or_none()

    if not p:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    if token_data.role == UserRole.EMPLOYEE.value and p.user_id != token_data.user_id:
        raise HTTPException(status_code=403, detail="Permission denied")

    item = PayrollResponse.model_validate(p)
    if p.user:
        item.user_name = f"{p.user.first_name} {p.user.last_name}"
    return item


@router.put("/{payroll_id}", response_model=PayrollResponse)
async def update_payroll(
    payroll_id: str,
    payroll_update: PayrollUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(select(Payroll).where(Payroll.id == payroll_id))
    p = result.scalar_one_or_none()

    if not p:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    update_dict = payroll_update.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(p, key, value)

    # Re-calculate net salary
    p.net_salary = p.basic_salary + p.allowances - p.deductions

    if p.status == 'paid' and not p.payment_date:
        p.payment_date = datetime.utcnow()

    await db.commit()
    await db.refresh(p)
    
    # Get user name for response
    user_res = await db.execute(select(User).where(User.id == p.user_id))
    user = user_res.scalar_one_or_none()
    
    response = PayrollResponse.model_validate(p)
    if user:
        response.user_name = f"{user.first_name} {user.last_name}"
    
    return response


@router.delete("/{payroll_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payroll(
    payroll_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admins can delete payroll records")

    result = await db.execute(select(Payroll).where(Payroll.id == payroll_id))
    p = result.scalar_one_or_none()

    if not p:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    await db.delete(p)
    await db.commit()
    return None
