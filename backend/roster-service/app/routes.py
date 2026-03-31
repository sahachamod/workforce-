from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime, timedelta
from typing import List, Optional
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import get_db
from common.security import decode_token
from common.schemas import UserRole
from .models import Shift, ShiftAssignment, ShiftSwap, AttendanceLog, User
from .schemas import (
    ShiftCreate, ShiftResponse, ShiftAssignmentCreate, ShiftAssignmentResponse,
    ShiftSwapCreate, ShiftSwapResponse, AttendanceLogCreate, AttendanceLogResponse,
    RosterCalendarEvent, UserDashboardStats
)

router = APIRouter(prefix="/api/v1/roster", tags=["Roster Management"])
security = HTTPBearer()


async def get_current_user_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = decode_token(credentials.credentials)
    return token_data


@router.get("/my-stats", response_model=UserDashboardStats)
async def get_my_roster_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    user_id = token_data.user_id
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Today attendance
    today_log_res = await db.execute(
        select(AttendanceLog).where(
            and_(AttendanceLog.user_id == user_id, AttendanceLog.date == today)
        )
    )
    today_log = today_log_res.scalar_one_or_none()
    
    # Weekly hours (last 7 days)
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    weekly_logs_res = await db.execute(
        select(AttendanceLog).where(
            and_(AttendanceLog.user_id == user_id, AttendanceLog.date >= week_ago)
        )
    )
    weekly_logs = weekly_logs_res.scalars().all()
    weekly_hours = sum(float(log.total_hours or 0) for log in weekly_logs)
    
    # Monthly hours (this month)
    first_of_month = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    monthly_logs_res = await db.execute(
        select(AttendanceLog).where(
            and_(AttendanceLog.user_id == user_id, AttendanceLog.date >= first_of_month)
        )
    )
    monthly_logs = monthly_logs_res.scalars().all()
    monthly_hours = sum(float(log.total_hours or 0) for log in monthly_logs)
    
    today_hours = 0.0
    if today_log:
        if today_log.total_hours:
            today_hours = float(today_log.total_hours)
        elif today_log.check_in:
            delta = datetime.now() - today_log.check_in
            today_hours = delta.total_seconds() / 3600
            
    return UserDashboardStats(
        today_check_in=today_log.check_in if today_log else None,
        today_check_out=today_log.check_out if today_log else None,
        today_hours=round(today_hours, 2),
        weekly_hours=round(weekly_hours, 2),
        monthly_hours=round(monthly_hours, 2)
    )


@router.get("/shifts", response_model=List[ShiftResponse])
async def get_shifts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Shift))
    return result.scalars().all()


@router.post("/shifts", response_model=ShiftResponse)
async def create_shift(
    shift_data: ShiftCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")

    shift = Shift(**shift_data.model_dump())
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return shift


@router.put("/shifts/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: str,
    shift_data: ShiftCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")

    shift = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = shift.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    for key, value in shift_data.model_dump().items():
        setattr(shift, key, value)

    await db.commit()
    await db.refresh(shift)
    return shift


@router.delete("/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift(
    shift_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")

    shift = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = shift.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    shift.is_active = False
    await db.commit()
    return None


@router.post("/assignments", response_model=ShiftAssignmentResponse)
async def create_assignment(
    assignment_data: ShiftAssignmentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    existing = await db.execute(
        select(ShiftAssignment).where(
            and_(
                ShiftAssignment.user_id == assignment_data.user_id,
                ShiftAssignment.date == assignment_data.date
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignment already exists")

    shift_res = await db.execute(select(Shift).where(Shift.id == assignment_data.shift_id))
    shift_obj = shift_res.scalar_one_or_none()
    if not shift_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    assignment = ShiftAssignment(**assignment_data.model_dump())
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    return ShiftAssignmentResponse(
        id=assignment.id,
        shift_id=assignment.shift_id,
        user_id=assignment.user_id,
        date=assignment.date,
        status=assignment.status,
        work_mode=assignment.work_mode,
        shift_name=shift_obj.name
    )


@router.post("/assignments/bulk")
async def bulk_assignments(
    shift_id: str,
    user_ids: List[str],
    start_date: str = Query(..., pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    end_date: str = Query(..., pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    if token_data.role not in [UserRole.ADMIN.value, UserRole.MANAGER.value]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")

    current_date = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    count = 0

    while current_date <= end:
        date_str = current_date.strftime("%Y-%m-%d")
        for user_id in user_ids:
            existing = await db.execute(
                select(ShiftAssignment).where(
                    and_(ShiftAssignment.user_id == user_id, ShiftAssignment.date == date_str)
                )
            )
            if not existing.scalar_one_or_none():
                assignment = ShiftAssignment(shift_id=shift_id, user_id=user_id, date=date_str)
                db.add(assignment)
                count += 1
        current_date += timedelta(days=1)

    await db.commit()
    return {"message": f"Created {count} assignments"}


@router.get("/calendar", response_model=List[RosterCalendarEvent])
async def get_roster_calendar(
    start: str = Query(..., pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    end: str = Query(..., pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    user_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    query = select(
        ShiftAssignment, Shift.name.label('shift_name'), Shift.color, 
        func.concat(User.first_name, ' ', User.last_name).label('user_name'),
        ShiftAssignment.work_mode
    ).join(Shift, ShiftAssignment.shift_id == Shift.id).join(
        User, ShiftAssignment.user_id == User.id
    ).where(
        and_(ShiftAssignment.date >= start, ShiftAssignment.date <= end)
    )

    if user_id:
        query = query.where(ShiftAssignment.user_id == user_id)
    elif token_data.role == UserRole.EMPLOYEE.value:
        query = query.where(ShiftAssignment.user_id == token_data.user_id)

    result = await db.execute(query)
    rows = result.all()

    return [
        RosterCalendarEvent(
            id=row[0].id,
            title=f"{row[3]} - {row[1]}",
            date=row[0].date,
            shift_name=row[1],
            color=row[2],
            user_name=row[3],
            status=row[0].status,
            work_mode=row[4]
        )
        for row in rows
    ]


@router.post("/swaps", response_model=ShiftSwapResponse)
async def request_swap(
    swap_data: ShiftSwapCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    swap = ShiftSwap(
        requester_id=token_data.user_id,
        target_id=swap_data.target_id,
        requester_assignment_id=swap_data.requester_assignment_id,
        target_assignment_id=swap_data.target_assignment_id,
        reason=swap_data.reason
    )
    db.add(swap)
    await db.commit()
    await db.refresh(swap)
    return swap


@router.put("/swaps/{swap_id}/approve")
async def approve_swap(
    swap_id: str,
    action: str = Query(..., pattern="^(approved|rejected)$"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    swap = await db.execute(select(ShiftSwap).where(ShiftSwap.id == swap_id))
    swap = swap.scalar_one_or_none()

    if not swap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Swap request not found")

    if action == 'approved':
        req_assignment = await db.execute(
            select(ShiftAssignment).where(ShiftAssignment.id == swap.requester_assignment_id)
        )
        req_assignment = req_assignment.scalar_one_or_none()

        tgt_assignment = await db.execute(
            select(ShiftAssignment).where(ShiftAssignment.id == swap.target_assignment_id)
        )
        tgt_assignment = tgt_assignment.scalar_one_or_none()

        if req_assignment and tgt_assignment:
            req_assignment.user_id, tgt_assignment.user_id = tgt_assignment.user_id, req_assignment.user_id

    swap.status = action
    swap.approver_id = token_data.user_id
    await db.commit()

    return {"message": f"Swap {action}"}


@router.post("/attendance/checkin", response_model=AttendanceLogResponse)
async def check_in(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    today = datetime.now().strftime("%Y-%m-%d")

    existing = await db.execute(
        select(AttendanceLog).where(
            and_(AttendanceLog.user_id == user_id, AttendanceLog.date == today)
        )
    )
    attendance = existing.scalar_one_or_none()

    if not attendance:
        attendance = AttendanceLog(user_id=user_id, date=today, check_in=datetime.now())
        db.add(attendance)
    else:
        # If already clocked in, don't update check_in. 
        # But if clocked out, we allow "re-clocking in" by resetting check_out
        if attendance.check_in is None:
             attendance.check_in = datetime.now()
        
        # Reset check_out to allow a new session period
        attendance.check_out = None

    await db.commit()
    await db.refresh(attendance)

    return AttendanceLogResponse(
        id=attendance.id,
        user_id=attendance.user_id,
        date=attendance.date,
        check_in=attendance.check_in,
        status=attendance.status
    )


@router.post("/attendance/checkout")
async def check_out(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    today = datetime.now().strftime("%Y-%m-%d")

    attendance = await db.execute(
        select(AttendanceLog).where(
            and_(AttendanceLog.user_id == user_id, AttendanceLog.date == today)
        )
    )
    attendance = attendance.scalar_one_or_none()

    if not attendance or not attendance.check_in:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not checked in")

    attendance.check_out = datetime.now()
    delta = attendance.check_out - attendance.check_in
    attendance.total_hours = str(round(delta.total_seconds() / 3600, 2))

    await db.commit()
    return {"message": "Checked out successfully", "total_hours": attendance.total_hours}


@router.get("/attendance/report")
async def get_attendance_report(
    start_date: str = Query(..., pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    end_date: str = Query(..., pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    user_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    query = select(AttendanceLog, func.concat(User.first_name, ' ', User.last_name).label('user_name')).join(
        User, AttendanceLog.user_id == User.id
    ).where(
        and_(AttendanceLog.date >= start_date, AttendanceLog.date <= end_date)
    )

    if user_id:
        query = query.where(AttendanceLog.user_id == user_id)
    elif token_data.role == UserRole.EMPLOYEE.value:
        query = query.where(AttendanceLog.user_id == token_data.user_id)

    query = query.order_by(AttendanceLog.date.desc())
    result = await db.execute(query)
    rows = result.all()

    return [
        AttendanceLogResponse(
            id=row[0].id,
            user_id=row[0].user_id,
            date=row[0].date,
            check_in=row[0].check_in,
            check_out=row[0].check_out,
            total_hours=row[0].total_hours,
            overtime_hours=row[0].overtime_hours,
            status=row[0].status,
            remarks=row[0].remarks,
            user_name=row[1]
        )
        for row in rows
    ]


@router.get("/schedule")
async def get_schedule(
    week: int = Query(1),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    # Basic implementation for the frontend
    users_res = await db.execute(select(User).where(User.role == 'employee'))
    users = users_res.scalars().all()
    
    response = []
    for user in users:
        # Check assignments for this user
        assignments_res = await db.execute(
            select(ShiftAssignment, Shift.name).join(Shift, ShiftAssignment.shift_id == Shift.id)
            .where(ShiftAssignment.user_id == user.id)
        )
        asgn_list = assignments_res.all()
        shift_name = asgn_list[0].name if asgn_list else "Off"
        
        response.append({
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "shift_name": shift_name,
            "schedule": [True if asgn_list else False] * 7 # Simplified 7-day view
        })
    return response


@router.get("/attendance", response_model=List[AttendanceLogResponse])
async def get_attendance(
    date: Optional[str] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    return await get_attendance_report(date, date, None, credentials, db)
