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


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(Enum('planning', 'active', 'on_hold', 'completed', 'cancelled', name='project_status'), default='planning')
    priority = Column(Enum('low', 'medium', 'high', 'critical', name='project_priority'), default='medium')
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    budget = Column(DECIMAL(15, 2))
    owner_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    client_name = Column(String(200))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship("User")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    time_logs = relationship("TimeLog", back_populates="project")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = Column(Enum('owner', 'manager', 'developer', 'qa', 'viewer', name='member_role'), default='developer')
    hourly_rate = Column(DECIMAL(10, 2))
    joined_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="members")
    user = relationship("User")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    status = Column(Enum('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled', name='task_status'), default='todo')
    priority = Column(Enum('low', 'medium', 'high', 'critical', name='task_priority'), default='medium')
    story_points = Column(Integer)
    estimated_hours = Column(DECIMAL(6, 2))
    due_date = Column(DateTime)
    parent_task_id = Column(String(36), ForeignKey('tasks.id', ondelete='SET NULL'))
    position = Column(Integer, default=0)
    created_by = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    completed_at = Column(DateTime)
    evidence_file = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="tasks")
    parent_task = relationship("Task", remote_side=[id], foreign_keys=[parent_task_id])
    creator = relationship("User", foreign_keys=[created_by])
    assignments = relationship("TaskAssignment", back_populates="task", cascade="all, delete-orphan")
    time_logs = relationship("TimeLog", back_populates="task")


class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    assigned_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)

    task = relationship("Task", back_populates="assignments")
    user = relationship("User")


class TimeLog(Base):
    __tablename__ = "time_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    task_id = Column(String(36), ForeignKey('tasks.id', ondelete='SET NULL'))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    duration_minutes = Column(Integer, default=0)
    description = Column(Text)
    is_billable = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    task = relationship("Task", back_populates="time_logs")
    project = relationship("Project", back_populates="time_logs")
