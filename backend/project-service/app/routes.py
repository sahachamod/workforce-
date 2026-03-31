from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, case
from datetime import datetime, timedelta
from typing import List, Optional
import sys
import os
import uuid
import shutil
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from common.database import get_db
from common.security import decode_token
from common.schemas import UserRole
from .models import Project, ProjectMember, Task, TaskAssignment, TimeLog
from .schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectMemberAdd, ProjectMemberResponse,
    TaskCreate, TaskUpdate, TaskResponse, TimeLogCreate, TimeLogUpdate, TimeLogResponse,
    ProjectAnalytics, UserProjectStats
)

router = APIRouter(prefix="/api/v1/projects", tags=["Project Management"])
security = HTTPBearer()


async def get_current_user_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = decode_token(credentials.credentials)
    return token_data


@router.get("/my-stats", response_model=UserProjectStats)
async def get_my_project_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    user_id = token_data.user_id
    
    # Active projects (where user is a member and project is 'active')
    active_projects_res = await db.execute(
        select(func.count(Project.id))
        .join(ProjectMember)
        .where(and_(ProjectMember.user_id == user_id, Project.status == 'active'))
    )
    
    # Completed tasks for this user
    completed_tasks_res = await db.execute(
        select(func.count(Task.id))
        .join(TaskAssignment)
        .where(and_(TaskAssignment.user_id == user_id, Task.status == 'done'))
    )
    
    # Pending tasks
    pending_tasks_res = await db.execute(
        select(func.count(Task.id))
        .join(TaskAssignment)
        .where(and_(TaskAssignment.user_id == user_id, Task.status != 'done'))
    )
    
    return UserProjectStats(
        active_projects_count=active_projects_res.scalar() or 0,
        completed_tasks_count=completed_tasks_res.scalar() or 0,
        pending_tasks_count=pending_tasks_res.scalar() or 0
    )


@router.get("", response_model=List[ProjectResponse])
async def get_projects(
    status_filter: Optional[str] = Query(None),
    my_projects: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    query = select(Project)

    # Normalize status: frontend may send 'in_progress', DB stores 'active'
    normalized_status = status_filter
    if status_filter == 'in_progress':
        normalized_status = 'active'

    if normalized_status:
        query = query.where(Project.status == normalized_status)

    if my_projects or token_data.role == UserRole.EMPLOYEE.value:
        query = query.join(ProjectMember).where(ProjectMember.user_id == token_data.user_id)

    query = query.order_by(Project.created_at.desc())
    result = await db.execute(query)
    projects = result.scalars().all()

    response = []
    for project in projects:
        task_count = await db.execute(
            select(func.count(Task.id)).where(Task.project_id == project.id)
        )
        member_count = await db.execute(
            select(func.count(ProjectMember.id)).where(ProjectMember.project_id == project.id)
        )

        owner = await db.execute(select(User).where(User.id == project.owner_id))
        owner = owner.scalar_one_or_none()

        response.append(ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            priority=project.priority,
            start_date=project.start_date.date() if project.start_date else None,
            end_date=project.end_date.date() if project.end_date else None,
            budget=project.budget,
            client_name=project.client_name,
            owner_id=project.owner_id,
            owner_name=f"{owner.first_name} {owner.last_name}" if owner else None,
            created_at=project.created_at,
            updated_at=project.updated_at,
            task_count=task_count.scalar() or 0,
            member_count=member_count.scalar() or 0
        ))

    return response


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    project = Project(
        name=project_data.name,
        description=project_data.description,
        status=project_data.status,
        priority=project_data.priority,
        start_date=datetime.combine(project_data.start_date, datetime.min.time()) if project_data.start_date else None,
        end_date=datetime.combine(project_data.end_date, datetime.min.time()) if project_data.end_date else None,
        budget=project_data.budget,
        client_name=project_data.client_name,
        owner_id=token_data.user_id
    )
    db.add(project)
    await db.flush()

    owner_member = ProjectMember(
        project_id=project.id,
        user_id=token_data.user_id,
        role='owner'
    )
    db.add(owner_member)

    if project_data.member_ids:
        for member_id in project_data.member_ids:
            if member_id != token_data.user_id:
                member = ProjectMember(
                    project_id=project.id,
                    user_id=member_id,
                    role='developer'
                )
                db.add(member)

    await db.commit()
    await db.refresh(project)

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date.date() if project.start_date else None,
        end_date=project.end_date.date() if project.end_date else None,
        budget=project.budget,
        client_name=project.client_name,
        owner_id=project.owner_id,
        created_at=project.created_at,
        updated_at=project.updated_at,
        member_count=len(project_data.member_ids) + 1 if project_data.member_ids else 1
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    project = await db.execute(select(Project).where(Project.id == project_id))
    project = project.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    task_count = await db.execute(select(func.count(Task.id)).where(Task.project_id == project_id))
    member_count = await db.execute(select(func.count(ProjectMember.id)).where(ProjectMember.project_id == project_id))

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date.date() if project.start_date else None,
        end_date=project.end_date.date() if project.end_date else None,
        budget=project.budget,
        client_name=project.client_name,
        owner_id=project.owner_id,
        created_at=project.created_at,
        updated_at=project.updated_at,
        task_count=task_count.scalar() or 0,
        member_count=member_count.scalar() or 0
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    project = await db.execute(select(Project).where(Project.id == project_id))
    project = project.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    for key, value in project_data.model_dump(exclude_unset=True).items():
        if value is not None:
            if key in ['start_date', 'end_date'] and value:
                setattr(project, key, datetime.combine(value, datetime.min.time()))
            else:
                setattr(project, key, value)

    await db.commit()
    await db.refresh(project)

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date.date() if project.start_date else None,
        end_date=project.end_date.date() if project.end_date else None,
        budget=project.budget,
        client_name=project.client_name,
        owner_id=project.owner_id,
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.get("/{project_id}/tasks", response_model=List[TaskResponse])
async def get_project_tasks(
    project_id: str,
    status_filter: Optional[str] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    query = select(Task).where(Task.project_id == project_id)

    if status_filter:
        query = query.where(Task.status == status_filter)

    query = query.order_by(Task.position, Task.created_at)
    result = await db.execute(query)
    tasks = result.scalars().all()

    response = []
    for task in tasks:
        assignments = await db.execute(
            select(TaskAssignment, func.concat(User.first_name, ' ', User.last_name).label('name')).join(
                User, TaskAssignment.user_id == User.id
            ).where(TaskAssignment.task_id == task.id)
        )
        assignees = [f"{row.name}" for row in assignments.all()]

        time_logged = await db.execute(
            select(func.sum(TimeLog.duration_minutes)).where(TimeLog.task_id == task.id)
        )
        total_time = time_logged.scalar() or 0

        response.append(TaskResponse(
            id=task.id,
            project_id=task.project_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            story_points=task.story_points,
            estimated_hours=task.estimated_hours,
            due_date=task.due_date.date() if task.due_date else None,
            parent_task_id=task.parent_task_id,
            position=task.position,
            created_by=task.created_by,
            completed_at=task.completed_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
            assignee_names=assignees,
            total_time_logged=total_time,
            evidence_file=task.evidence_file
        ))

    return response


@router.post("/{project_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: str,
    task_data: TaskCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    project = await db.execute(select(Project).where(Project.id == project_id))
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    max_position = await db.execute(
        select(func.max(Task.position)).where(Task.project_id == project_id)
    )
    position = (max_position.scalar() or 0) + 1

    task = Task(
        project_id=project_id,
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority,
        story_points=task_data.story_points,
        estimated_hours=task_data.estimated_hours,
        due_date=datetime.combine(task_data.due_date, datetime.min.time()) if task_data.due_date else None,
        parent_task_id=task_data.parent_task_id,
        position=position,
        created_by=token_data.user_id
    )
    db.add(task)
    await db.flush()

    if task_data.assignee_ids:
        for assignee_id in task_data.assignee_ids:
            assignment = TaskAssignment(task_id=task.id, user_id=assignee_id)
            db.add(assignment)

    await db.commit()
    await db.refresh(task)

    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        story_points=task.story_points,
        estimated_hours=task.estimated_hours,
        due_date=task.due_date.date() if task.due_date else None,
        parent_task_id=task.parent_task_id,
        position=task.position,
        created_by=task.created_by,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_names=[],
        total_time_logged=0
    )


@router.put("/{project_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    project_id: str,
    task_id: str,
    task_data: TaskUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    task = await db.execute(select(Task).where(Task.id == task_id, Task.project_id == project_id))
    task = task.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    update_data = task_data.model_dump(exclude_unset=True)

    if 'due_date' in update_data and update_data['due_date']:
        update_data['due_date'] = datetime.combine(update_data['due_date'], datetime.min.time())

    if 'status' in update_data and update_data['status'] == 'done' and not task.completed_at:
        update_data['completed_at'] = datetime.utcnow()

    for key, value in update_data.items():
        setattr(task, key, value)

    await db.commit()
    await db.refresh(task)

    assignments = await db.execute(
        select(TaskAssignment, func.concat(User.first_name, ' ', User.last_name).label('name')).join(
            User, TaskAssignment.user_id == User.id
        ).where(TaskAssignment.task_id == task.id)
    )
    assignees = [row.name for row in assignments.all()]

    time_logged = await db.execute(
        select(func.sum(TimeLog.duration_minutes)).where(TimeLog.task_id == task.id)
    )
    total_time = time_logged.scalar() or 0

    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        story_points=task.story_points,
        estimated_hours=task.estimated_hours,
        due_date=task.due_date.date() if task.due_date else None,
        parent_task_id=task.parent_task_id,
        position=task.position,
        created_by=task.created_by,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_names=assignees,
        total_time_logged=total_time,
        evidence_file=task.evidence_file
    )


@router.delete("/{project_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    project_id: str,
    task_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)
    task = await db.execute(select(Task).where(Task.id == task_id, Task.project_id == project_id))
    task = task.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    await db.delete(task)
    await db.commit()
    return None


@router.post("/{project_id}/tasks/{task_id}/submit", response_model=TaskResponse)
async def submit_task(
    project_id: str,
    task_id: str,
    evidence: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    task = await db.execute(select(Task).where(Task.id == task_id, Task.project_id == project_id))
    task = task.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    os.makedirs("uploads", exist_ok=True)
    filename = f"{uuid.uuid4()}_{evidence.filename}"
    file_path = f"uploads/{filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(evidence.file, buffer)
    
    task.evidence_file = filename  # store just the filename, path served via /uploads/
    task.status = "review"
    
    await db.commit()
    await db.refresh(task)

    assignments = await db.execute(
        select(TaskAssignment, func.concat(User.first_name, ' ', User.last_name).label('name')).join(
            User, TaskAssignment.user_id == User.id
        ).where(TaskAssignment.task_id == task_id)
    )
    assignees = [row.name for row in assignments.all()]

    time_logged = await db.execute(
        select(func.sum(TimeLog.duration_minutes)).where(TimeLog.task_id == task_id)
    )
    total_time = time_logged.scalar() or 0

    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        story_points=task.story_points,
        estimated_hours=task.estimated_hours,
        due_date=task.due_date.date() if task.due_date else None,
        parent_task_id=task.parent_task_id,
        position=task.position,
        created_by=task.created_by,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_names=assignees,
        total_time_logged=total_time,
        evidence_file=task.evidence_file
    )


@router.post("/time-logs", response_model=TimeLogResponse, status_code=status.HTTP_201_CREATED)
async def create_time_log(
    time_log_data: TimeLogCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token_data = await get_current_user_data(credentials)

    duration = 0
    if time_log_data.end_time:
        duration = int((time_log_data.end_time - time_log_data.start_time).total_seconds() / 60)

    time_log = TimeLog(
        user_id=token_data.user_id,
        task_id=time_log_data.task_id,
        project_id=time_log_data.project_id,
        start_time=time_log_data.start_time,
        end_time=time_log_data.end_time,
        duration_minutes=duration,
        description=time_log_data.description,
        is_billable=time_log_data.is_billable
    )
    db.add(time_log)
    await db.commit()
    await db.refresh(time_log)

    project = await db.execute(select(Project).where(Project.id == time_log_data.project_id))
    project = project.scalar_one_or_none()

    task = None
    if time_log_data.task_id:
        task = await db.execute(select(Task).where(Task.id == time_log_data.task_id))
        task = task.scalar_one_or_none()

    return TimeLogResponse(
        id=time_log.id,
        user_id=time_log.user_id,
        task_id=time_log.task_id,
        project_id=time_log.project_id,
        start_time=time_log.start_time,
        end_time=time_log.end_time,
        duration_minutes=time_log.duration_minutes,
        description=time_log.description,
        is_billable=time_log.is_billable,
        created_at=time_log.created_at,
        project_name=project.name if project else None,
        task_title=task.title if task else None
    )


@router.get("/{project_id}/analytics", response_model=ProjectAnalytics)
async def get_project_analytics(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    project = await db.execute(select(Project).where(Project.id == project_id))
    project = project.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    total_tasks = await db.execute(select(func.count(Task.id)).where(Task.project_id == project_id))
    completed_tasks = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == project_id, Task.status == 'done')
    )
    in_progress = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == project_id, Task.status == 'in_progress')
    )
    blocked = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == project_id, Task.status == 'blocked')
    )

    total_time = await db.execute(
        select(func.sum(TimeLog.duration_minutes)).where(TimeLog.project_id == project_id)
    )
    total_minutes = total_time.scalar() or 0

    estimated = await db.execute(
        select(func.sum(Task.estimated_hours * 60)).where(Task.project_id == project_id)
    )
    estimated_minutes = estimated.scalar() or 0

    story_points_completed = await db.execute(
        select(func.sum(Task.story_points)).where(Task.project_id == project_id, Task.status == 'done')
    )
    story_points_total = await db.execute(
        select(func.sum(Task.story_points)).where(Task.project_id == project_id)
    )

    completed_points = story_points_completed.scalar() or 0
    total_points = story_points_total.scalar() or 0
    velocity = completed_points / max(1, (total_points or 1)) * 100

    budget_util = None
    if project.budget and total_minutes > 0:
        hourly_rate = 50
        actual_cost = (total_minutes / 60) * hourly_rate
        budget_util = (actual_cost / float(project.budget)) * 100

    return ProjectAnalytics(
        project_id=project_id,
        total_tasks=total_tasks.scalar() or 0,
        completed_tasks=completed_tasks.scalar() or 0,
        in_progress_tasks=in_progress.scalar() or 0,
        blocked_tasks=blocked.scalar() or 0,
        total_time_logged=total_minutes,
        total_budget=project.budget,
        time_logged_hours=Decimal(str(total_minutes / 60)),
        budget_utilization=budget_util,
        team_velocity=velocity,
        estimated_vs_actual=Decimal(str(estimated_minutes - total_minutes))
    )


from decimal import Decimal
from .models import User
