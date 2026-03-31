from sqlalchemy import Column, String, Boolean, Enum, DateTime, ForeignKey, Text, DECIMAL, Integer
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
    department_id = Column(String(36))

    leave_requests = relationship("LeaveRequest", back_populates="user", foreign_keys="LeaveRequest.user_id")


class Department(Base):
    __tablename__ = "departments"
    id = Column(String(36), primary_key=True)
    name = Column(String(100))


class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text)
    max_days_per_year = Column(Integer, default=0)
    requires_approval = Column(Boolean, default=True)
    is_paid = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    leave_requests = relationship("LeaveRequest", back_populates="leave_type")
    leave_balances = relationship("LeaveBalance", back_populates="leave_type")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    leave_type_id = Column(String(36), ForeignKey('leave_types.id', ondelete='RESTRICT'), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    total_days = Column(DECIMAL(5, 2), nullable=False)
    reason = Column(Text)
    status = Column(Enum('pending', 'approved', 'rejected', 'cancelled', name='leave_status'), default='pending')
    approver_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="leave_requests", foreign_keys=[user_id])
    leave_type = relationship("LeaveType", back_populates="leave_requests")
    approver = relationship("User", foreign_keys=[approver_id])
    approvals = relationship("LeaveApproval", back_populates="leave_request")


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    leave_type_id = Column(String(36), ForeignKey('leave_types.id', ondelete='CASCADE'), nullable=False)
    year = Column(Integer, nullable=False)
    total_days = Column(DECIMAL(5, 2), default=0)
    used_days = Column(DECIMAL(5, 2), default=0)
    pending_days = Column(DECIMAL(5, 2), default=0)
    carry_forward_days = Column(DECIMAL(5, 2), default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    leave_type = relationship("LeaveType", back_populates="leave_balances")


class LeaveApproval(Base):
    __tablename__ = "leave_approvals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    leave_request_id = Column(String(36), ForeignKey('leave_requests.id', ondelete='CASCADE'), nullable=False)
    approver_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    action = Column(Enum('approved', 'rejected', 'cancelled', name='approval_action'), nullable=False)
    comments = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    leave_request = relationship("LeaveRequest", back_populates="approvals")
    approver = relationship("User")
