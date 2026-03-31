from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
import uuid
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import get_db
from common.security import decode_token
from common.schemas import UserRole

router = APIRouter(prefix="/api/v1/users", tags=["User Management"])
security = HTTPBearer()

User = None
Department = None


async def get_current_user_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    global User, Department
    if User is None:
        from app.models import User, Department
    return decode_token(credentials.credentials)


@router.get("")
async def get_users(
    search: Optional[str] = None,
    department_id: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    global User, Department
    if User is None:
        from app.models import User
    if Department is None:
        from app.models import Department

    token_data = await get_current_user_data(credentials)
    query = select(User)

    if search:
        query = query.where(
            or_(
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )

    if department_id:
        query = query.where(User.department_id == department_id)

    if role:
        query = query.where(User.role == role)

    if is_active is not None:
        query = query.where(User.is_active == is_active)

    query = query.order_by(User.first_name, User.last_name)
    result = await db.execute(query)
    users = result.scalars().all()

    response = []
    for u in users:
        dept_name = None
        if u.department_id:
            dept_result = await db.execute(select(Department).where(Department.id == u.department_id))
            dept = dept_result.scalar_one_or_none()
            dept_name = dept.name if dept else None
        response.append({
            "id": u.id, 
            "email": u.email, 
            "first_name": u.first_name, 
            "last_name": u.last_name,
            "phone": u.phone,
            "department": dept_name,
            "department_id": u.department_id,
            "job_title": u.job_title,
            "role": u.role,
            "is_active": u.is_active,
            "hire_date": u.hire_date.isoformat() if u.hire_date else None
        })
    return response


@router.get("/me")
async def get_my_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    global User
    if User is None:
        from app.models import User

    token_data = await get_current_user_data(credentials)
    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {"id": user.id, "email": user.email, "first_name": user.first_name, "last_name": user.last_name, "role": user.role}


@router.put("/me")
async def update_my_profile(
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    global User
    if User is None:
        from app.models import User

    token_data = await get_current_user_data(credentials)
    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name

    await db.commit()
    return {"message": "Profile updated successfully"}


@router.get("/{user_id}")
async def get_user(user_id: str, credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    global User
    if User is None:
        from app.models import User

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {"id": user.id, "email": user.email, "first_name": user.first_name, "last_name": user.last_name, "role": user.role}


@router.get("/departments/list")
async def get_departments(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    global Department
    if Department is None:
        from app.models import Department

    result = await db.execute(select(Department).where(Department.is_active == True))
    departments = result.scalars().all()
    return [{"id": d.id, "name": d.name} for d in departments]


@router.post("")
async def create_user(
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    role: str = "employee",
    department_id: Optional[str] = None,
    job_title: Optional[str] = None,
    phone: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    global User
    if User is None:
        from app.models import User
    from common.security import hash_password

    token_data = await get_current_user_data(credentials)
    if token_data.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = User(
        id=str(uuid.uuid4()),
        email=email,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        role=role,
        department_id=department_id,
        job_title=job_title,
        phone=phone,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    return {"id": new_user.id, "email": new_user.email, "first_name": new_user.first_name, "last_name": new_user.last_name, "role": new_user.role}


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    email: Optional[str] = None,
    role: Optional[str] = None,
    department_id: Optional[str] = None,
    job_title: Optional[str] = None,
    phone: Optional[str] = None,
    is_active: Optional[bool] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    global User
    if User is None:
        from app.models import User

    token_data = await get_current_user_data(credentials)
    if token_data.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name
    if email:
        user.email = email
    if role:
        user.role = role
    if department_id:
        user.department_id = department_id
    if job_title:
        user.job_title = job_title
    if phone:
        user.phone = phone
    if is_active is not None:
        user.is_active = is_active

    await db.commit()
    return {"id": user.id, "email": user.email, "first_name": user.first_name, "last_name": user.last_name, "role": user.role, "is_active": user.is_active}


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    global User
    if User is None:
        from app.models import User

    token_data = await get_current_user_data(credentials)
    if token_data.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
    return {"message": "User deleted successfully"}
