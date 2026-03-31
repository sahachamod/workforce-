from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from datetime import datetime, date, timedelta
from typing import List, Optional
from decimal import Decimal
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import get_db
from common.security import decode_token, get_current_user
from common.schemas import UserRole
from .models import LeaveType, LeaveRequest, LeaveBalance, LeaveApproval, User
from .schemas import (
    LeaveTypeCreate, LeaveTypeResponse, LeaveRequestCreate, LeaveRequestUpdate,
    LeaveApprovalRequest, LeaveRequestResponse, LeaveBalanceResponse,
    LeaveCalendarEvent, LeaveStats
)

router = APIRouter(prefix="/api/v1/leaves", tags=["Leave Management"])
security = HTTPBearer()


async def get_current_user_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = decode_token(credentials.credentials)
    return token_data


def calculate_working_days(start_date: date, end_date: date) -> Decimal:
    days = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:
            days += 1
        current += timedelta(days=1)
    return Decimal(days)


@router.get("/types", response_model=List[LeaveTypeResponse])
async def get_leave_types(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(LeaveType).where(LeaveType.is_active == True)
    )
    return result.scalars().all()


@router.post("/types", response_model=LeaveTypeResponse)
async def create_leave_type(
    leave_type_data: LeaveTypeCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    existing = await db.execute(
        select(LeaveType).where(LeaveType.code == leave_type_data.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Leave type code already exists")

    leave_type = LeaveType(**leave_type_data.model_dump())
    db.add(leave_type)
    await db.commit()
    await db.refresh(leave_type)
    return leave_type


@router.post("/apply", response_model=LeaveRequestResponse)
async def apply_for_leave(
    request_data: LeaveRequestCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    user_id = token_data.user_id

    if request_data.end_date < request_data.start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date must be after start date")

    leave_type = await db.execute(
        select(LeaveType).where(LeaveType.id == request_data.leave_type_id, LeaveType.is_active == True)
    )
    leave_type = leave_type.scalar_one_or_none()
    if not leave_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found")

    total_days = calculate_working_days(request_data.start_date, request_data.end_date)

    current_year = date.today().year
    balance = await db.execute(
        select(LeaveBalance).where(
            and_(
                LeaveBalance.user_id == user_id,
                LeaveBalance.leave_type_id == request_data.leave_type_id,
                LeaveBalance.year == current_year
            )
        )
    )
    balance = balance.scalar_one_or_none()

    if balance:
        available = float(balance.total_days) - float(balance.used_days) - float(balance.pending_days)
        if total_days > Decimal(available):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient leave balance. Available: {available} days"
            )
        balance.pending_days += total_days
    else:
        balance = LeaveBalance(
            user_id=user_id,
            leave_type_id=request_data.leave_type_id,
            year=current_year,
            total_days=Decimal(leave_type.max_days_per_year),
            pending_days=total_days
        )
        db.add(balance)

    leave_request = LeaveRequest(
        user_id=user_id,
        leave_type_id=request_data.leave_type_id,
        start_date=datetime.combine(request_data.start_date, datetime.min.time()),
        end_date=datetime.combine(request_data.end_date, datetime.min.time()),
        total_days=total_days,
        reason=request_data.reason,
        status='pending'
    )
    db.add(leave_request)
    await db.commit()
    await db.refresh(leave_request)

    return LeaveRequestResponse(
        id=leave_request.id,
        user_id=leave_request.user_id,
        leave_type_id=leave_request.leave_type_id,
        start_date=request_data.start_date,
        end_date=request_data.end_date,
        total_days=leave_request.total_days,
        reason=leave_request.reason,
        status=leave_request.status,
        created_at=leave_request.created_at,
        updated_at=leave_request.updated_at,
        leave_type_name=leave_type.name
    )


@router.get("/my", response_model=List[LeaveRequestResponse])
async def get_my_leaves(
    status_filter: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    user_id = token_data.user_id

    query = select(LeaveRequest, LeaveType.name.label('leave_type_name')).join(
        LeaveType, LeaveRequest.leave_type_id == LeaveType.id
    ).where(LeaveRequest.user_id == user_id)

    if status_filter:
        query = query.where(LeaveRequest.status == status_filter)
    if year:
        query = query.where(func.year(LeaveRequest.start_date) == year)

    query = query.order_by(LeaveRequest.created_at.desc())
    result = await db.execute(query)
    rows = result.all()

    return [
        LeaveRequestResponse(
            id=req.id,
            user_id=req.user_id,
            leave_type_id=req.leave_type_id,
            start_date=req.start_date.date(),
            end_date=req.end_date.date(),
            total_days=req.total_days,
            reason=req.reason,
            status=req.status,
            approver_id=req.approver_id,
            approved_at=req.approved_at,
            rejection_reason=req.rejection_reason,
            created_at=req.created_at,
            updated_at=req.updated_at,
            leave_type_name=row_leave_type_name
        )
        for req, row_leave_type_name in rows
    ]


@router.get("/balances", response_model=List[LeaveBalanceResponse])
async def get_my_balances(
    year: Optional[int] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    user_id = token_data.user_id
    target_year = year or date.today().year

    result = await db.execute(
        select(LeaveBalance).where(
            and_(
                LeaveBalance.user_id == user_id,
                LeaveBalance.year == target_year
            )
        )
    )
    balances = result.scalars().all()

    return [
        LeaveBalanceResponse(
            id=b.id,
            user_id=b.user_id,
            leave_type_id=b.leave_type_id,
            year=b.year,
            total_days=b.total_days,
            used_days=b.used_days,
            pending_days=b.pending_days,
            carry_forward_days=b.carry_forward_days,
            available_days=b.total_days - b.used_days - b.pending_days + b.carry_forward_days
        )
        for b in balances
    ]


@router.get("", response_model=List[LeaveRequestResponse])
async def get_all_leaves(
    status_filter: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")

    query = select(
        LeaveRequest, 
        func.concat(User.first_name, ' ', User.last_name).label('user_name'),
        LeaveType.name.label('leave_type_name')
    ).join(
        User, LeaveRequest.user_id == User.id
    ).join(
        LeaveType, LeaveRequest.leave_type_id == LeaveType.id
    )

    if status_filter:
        query = query.where(LeaveRequest.status == status_filter.lower())
    if user_id:
        query = query.where(LeaveRequest.user_id == user_id)
    if year:
        query = query.where(func.year(LeaveRequest.start_date) == year)

    query = query.order_by(LeaveRequest.created_at.desc())
    result = await db.execute(query)
    rows = result.all()

    return [
        LeaveRequestResponse(
            id=req.id,
            user_id=req.user_id,
            leave_type_id=req.leave_type_id,
            start_date=req.start_date.date(),
            end_date=req.end_date.date(),
            total_days=req.total_days,
            reason=req.reason,
            status=req.status,
            created_at=req.created_at,
            updated_at=req.updated_at,
            user_name=row_user_name,
            leave_type_name=row_leave_type_name
        )
        for req, row_user_name, row_leave_type_name in rows
    ]


@router.get("/pending", response_model=List[LeaveRequestResponse])
async def get_pending_leaves(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")

    result = await db.execute(
        select(
            LeaveRequest, 
            func.concat(User.first_name, ' ', User.last_name).label('user_name'),
            LeaveType.name.label('leave_type_name')
        ).join(
            User, LeaveRequest.user_id == User.id
        ).join(
            LeaveType, LeaveRequest.leave_type_id == LeaveType.id
        ).where(LeaveRequest.status == 'pending').order_by(LeaveRequest.created_at)
    )
    rows = result.all()

    return [
        LeaveRequestResponse(
            id=req.id,
            user_id=req.user_id,
            leave_type_id=req.leave_type_id,
            start_date=req.start_date.date(),
            end_date=req.end_date.date(),
            total_days=req.total_days,
            reason=req.reason,
            status=req.status,
            created_at=req.created_at,
            updated_at=req.updated_at,
            user_name=row_user_name,
            leave_type_name=row_leave_type_name
        )
        for req, row_user_name, row_leave_type_name in rows
    ]


@router.put("/{request_id}/approve", response_model=LeaveRequestResponse)
async def approve_leave(
    request_id: str,
    approval_data: LeaveApprovalRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    approver_id = token_data.user_id

    leave_request = await db.execute(
        select(LeaveRequest).where(LeaveRequest.id == request_id)
    )
    leave_request = leave_request.scalar_one_or_none()

    if not leave_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")

    if leave_request.status != 'pending':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Leave request is not pending")

    leave_request.status = 'approved' if approval_data.action == 'approved' else 'rejected'
    leave_request.approver_id = approver_id
    leave_request.approved_at = datetime.utcnow()

    if approval_data.action == 'rejected':
        leave_request.rejection_reason = approval_data.comments

    balance = await db.execute(
        select(LeaveBalance).where(
            and_(
                LeaveBalance.user_id == leave_request.user_id,
                LeaveBalance.leave_type_id == leave_request.leave_type_id,
                LeaveBalance.year == leave_request.start_date.year
            )
        )
    )
    balance = balance.scalar_one_or_none()

    if balance:
        if approval_data.action == 'approved':
            balance.pending_days -= leave_request.total_days
            balance.used_days += leave_request.total_days
        else:
            balance.pending_days -= leave_request.total_days

    approval_record = LeaveApproval(
        leave_request_id=request_id,
        approver_id=approver_id,
        action=approval_data.action,
        comments=approval_data.comments
    )
    db.add(approval_record)
    await db.commit()
    await db.refresh(leave_request)

    return LeaveRequestResponse(
        id=leave_request.id,
        user_id=leave_request.user_id,
        leave_type_id=leave_request.leave_type_id,
        start_date=leave_request.start_date.date(),
        end_date=leave_request.end_date.date(),
        total_days=leave_request.total_days,
        reason=leave_request.reason,
        status=leave_request.status,
        approver_id=leave_request.approver_id,
        approved_at=leave_request.approved_at,
        rejection_reason=leave_request.rejection_reason,
        created_at=leave_request.created_at,
        updated_at=leave_request.updated_at
    )


@router.delete("/{request_id}")
async def cancel_leave(
    request_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    user_id = token_data.user_id

    leave_request = await db.execute(
        select(LeaveRequest).where(LeaveRequest.id == request_id)
    )
    leave_request = leave_request.scalar_one_or_none()

    if not leave_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")

    if leave_request.user_id != user_id and token_data.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if leave_request.status not in ['pending', 'approved']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel this request")

    balance = await db.execute(
        select(LeaveBalance).where(
            and_(
                LeaveBalance.user_id == leave_request.user_id,
                LeaveBalance.leave_type_id == leave_request.leave_type_id,
                LeaveBalance.year == leave_request.start_date.year
            )
        )
    )
    balance = balance.scalar_one_or_none()

    if balance:
        if leave_request.status == 'approved':
            balance.used_days -= leave_request.total_days
        else:
            balance.pending_days -= leave_request.total_days

    leave_request.status = 'cancelled'
    await db.commit()

    return {"message": "Leave request cancelled successfully"}


@router.get("/calendar", response_model=List[LeaveCalendarEvent])
async def get_leave_calendar(
    start: date = Query(...),
    end: date = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    query = select(
        LeaveRequest, func.concat(User.first_name, ' ', User.last_name).label('user_name'), LeaveType.name.label('leave_type_name')
    ).join(
        User, LeaveRequest.user_id == User.id
    ).join(
        LeaveType, LeaveRequest.leave_type_id == LeaveType.id
    ).where(
        and_(
            LeaveRequest.status.in_(['approved', 'pending']),
            func.date(LeaveRequest.start_date) <= end,
            func.date(LeaveRequest.end_date) >= start
        )
    )

    if token_data.role == UserRole.EMPLOYEE.value:
        query = query.where(LeaveRequest.user_id == token_data.user_id)

    result = await db.execute(query)
    rows = result.all()

    return [
        LeaveCalendarEvent(
            id=req.id,
            title=f"{row.user_name} - {row.leave_type_name}",
            start=req.start_date.date(),
            end=req.end_date.date(),
            type=row.leave_type_name,
            status=req.status,
            user_name=row.user_name
        )
        for req, row in rows
    ]
