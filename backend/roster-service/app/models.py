from sqlalchemy import Column, String, Boolean, Enum, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(20))


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    start_time = Column(String(8), nullable=False)
    end_time = Column(String(8), nullable=False)
    break_duration_minutes = Column(Integer, default=0)
    location = Column(String(200))
    color = Column(String(7), default='#3B82F6')
    is_night_shift = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    assignments = relationship("ShiftAssignment", back_populates="shift")


class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shift_id = Column(String(36), ForeignKey('shifts.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    date = Column(String(10), nullable=False)
    status = Column(Enum('scheduled', 'completed', 'absent', 'late', 'on_leave', name='assignment_status'), default='scheduled')
    work_mode = Column(String(10), default='office') # 'office' or 'home'
    check_in_time = Column(DateTime)
    check_out_time = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    shift = relationship("Shift", back_populates="assignments")
    user = relationship("User")


class ShiftSwap(Base):
    __tablename__ = "shift_swaps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    requester_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    target_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    requester_assignment_id = Column(String(36), ForeignKey('shift_assignments.id', ondelete='CASCADE'), nullable=False)
    target_assignment_id = Column(String(36), ForeignKey('shift_assignments.id', ondelete='CASCADE'), nullable=False)
    status = Column(Enum('pending', 'approved', 'rejected', 'cancelled', name='swap_status'), default='pending')
    approver_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    requester = relationship("User", foreign_keys=[requester_id])
    target = relationship("User", foreign_keys=[target_id])


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    date = Column(String(10), nullable=False)
    check_in = Column(DateTime)
    check_out = Column(DateTime)
    total_hours = Column(String(10), default='0')
    overtime_hours = Column(String(10), default='0')
    status = Column(Enum('present', 'absent', 'late', 'half_day', 'holiday', 'weekoff', name='attendance_status'), default='present')
    remarks = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")
