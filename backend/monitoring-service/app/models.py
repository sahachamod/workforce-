from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, Enum, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import Base


class Department(Base):
    __tablename__ = "departments"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)

    users = relationship("User", back_populates="department")


class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(Enum('admin', 'manager', 'employee', name='user_role'), default='employee')
    department_id = Column(String(36), ForeignKey('departments.id'))
    is_active = Column(Boolean, default=True)

    department = relationship("Department", back_populates="users")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    activity_type = Column(String(20), default='active')
    app_name = Column(String(200))
    window_title = Column(String(500))
    url = Column(String(1000))
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    duration_seconds = Column(Integer, default=0)
    is_productive = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")


class Screenshot(Base):
    __tablename__ = "screenshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    taken_at = Column(DateTime, nullable=False, server_default=func.now())
    filepath = Column(String(500), nullable=False, default="")
    image_data = Column(LargeBinary, nullable=False)
    filename = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")


class ProductivityRule(Base):
    __tablename__ = "productivity_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    app_name = Column(String(200), nullable=False)
    app_category = Column(String(20), default='neutral')
    is_active = Column(String(1), default='1')
    created_at = Column(DateTime, server_default=func.now())
