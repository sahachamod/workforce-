from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import Base


class Payroll(Base):
    __tablename__ = "payrolls"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    basic_salary = Column(Numeric(15, 2), default=0.0)
    allowances = Column(Numeric(15, 2), default=0.0)
    deductions = Column(Numeric(15, 2), default=0.0)
    net_salary = Column(Numeric(15, 2), default=0.0)
    status = Column(String(20), default='draft') # draft, processed, paid, cancelled
    payment_date = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
