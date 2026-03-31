# Workforce Management Platform - Architecture Documentation

## System Overview
Enterprise-grade SaaS platform for employee productivity management, attendance tracking, leave management, shift scheduling, and project management.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Web Browser   │  │   Mobile App    │  │   Desktop App   │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
└───────────┼────────────────────┼────────────────────┼───────────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NGINX REVERSE PROXY                                │
│                    (SSL Termination + Load Balancing)                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  /api/auth/* → Auth Service (8001)                                    │   │
│  │  /api/users/* → User Service (8002)                                   │   │
│  │  /api/leaves/* → Leave Service (8003)                                 │   │
│  │  /api/roster/* → Roster Service (8004)                                 │   │
│  │  /api/projects/* → Project Service (8005)                              │   │
│  │  /api/monitoring/* → Monitoring Service (8006)                         │   │
│  │  /api/analytics/* → Analytics Service (8007)                           │   │
│  │  /api/notifications/* → Notification Service (8008)                    │   │
│  │  /* → Frontend (Next.js - 3000)                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         MICROSERVICES LAYER                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                   │
│  │  Auth Service  │  │ User Service   │  │Leave Service   │                   │
│  │  (8001)        │  │ (8002)         │  │(8003)          │                   │
│  │  - JWT Tokens  │  │ - Employees    │  │- Leave Requests│                   │
│  │  - RBAC        │  │ - Departments  │  │- Approvals     │                   │
│  │  - Sessions    │  │ - Roles        │  │- Balances      │                   │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘                   │
│          │                   │                   │                            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                   │
│  │Roster Service  │  │Project Service │  │Monitoring     │                   │
│  │(8004)          │  │(8005)          │  │Service (8006)  │                   │
│  │- Shifts        │  │- Projects      │  │- Activity      │                   │
│  │- Assignments   │  │- Tasks         │  │- Screenshots   │                   │
│  │- Swaps         │  │- Time Logs     │  │- App Usage     │                   │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘                   │
│          │                   │                   │                            │
│  ┌────────────────┐  ┌────────────────┐                                   │
│  │Analytics       │  │Notification    │                                   │
│  │Service (8007)  │  │Service (8008)  │                                   │
│  │- Reports       │  │- Email         │                                   │
│  │- Dashboards    │  │- Push          │                                   │
│  │- Trends        │  │- In-app        │                                   │
│  └────────────────┘  └────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │    MySQL     │  │    Redis     │  │   Celery     │                       │
│  │   (3306)     │  │   (6379)     │  │  (Background │                       │
│  │              │  │ - Cache      │  │   Tasks)     │                       │
│  │              │  │ - Queues     │  │              │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Service Communication

### Synchronous (HTTP)
- All services expose REST APIs
- API Gateway routes requests
- Direct service-to-service calls for internal operations

### Asynchronous (Redis + Celery)
- Email notifications
- Analytics computation
- Report generation
- Periodic cleanup tasks

## Database Schema

### Auth Service
```
users
├── id (PK, UUID)
├── email (UNIQUE)
├── password_hash
├── first_name
├── last_name
├── role (ENUM: admin, manager, employee)
├── department_id (FK)
├── is_active
├── created_at
└── updated_at

departments
├── id (PK, UUID)
├── name
├── manager_id (FK → users)
├── created_at
└── updated_at

sessions
├── id (PK, UUID)
├── user_id (FK)
├── token_hash
├── expires_at
├── created_at
└── ip_address
```

### Leave Service
```
leave_types
├── id (PK, UUID)
├── name
├── code (sick, casual, annual, unpaid)
├── max_days_per_year
├── requires_approval
├── is_active
└── created_at

leave_requests
├── id (PK, UUID)
├── user_id (FK)
├── leave_type_id (FK)
├── start_date
├── end_date
├── total_days
├── reason
├── status (ENUM: pending, approved, rejected, cancelled)
├── approver_id (FK)
├── approved_at
├── rejection_reason
├── created_at
└── updated_at

leave_balances
├── id (PK, UUID)
├── user_id (FK)
├── leave_type_id (FK)
├── year
├── total_days
├── used_days
├── pending_days
└── updated_at

leave_approvals
├── id (PK, UUID)
├── leave_request_id (FK)
├── approver_id (FK)
├── action (ENUM: approved, rejected)
├── comments
├── created_at
```

### Roster Service
```
shifts
├── id (PK, UUID)
├── name
├── start_time
├── end_time
├── break_duration
├── location
├── created_at
└── updated_at

shift_assignments
├── id (PK, UUID)
├── shift_id (FK)
├── user_id (FK)
├── date
├── status (ENUM: scheduled, completed, absent, late)
├── check_in_time
├── check_out_time
├── created_at
└── updated_at

shift_swaps
├── id (PK, UUID)
├── requester_id (FK)
├── target_id (FK)
├── original_shift_id (FK)
├── target_shift_id (FK)
├── status (ENUM: pending, approved, rejected)
├── approver_id (FK)
├── created_at
└── updated_at

attendance_logs
├── id (PK, UUID)
├── user_id (FK)
├── date
├── check_in
├── check_out
├── total_hours
├── overtime_hours
├── status (ENUM: present, absent, late, half_day)
├── created_at
└── updated_at
```

### Project Service
```
projects
├── id (PK, UUID)
├── name
├── description
├── status (ENUM: planning, active, on_hold, completed, cancelled)
├── priority (ENUM: low, medium, high, critical)
├── start_date
├── end_date
├── budget
├── owner_id (FK)
├── created_at
└── updated_at

tasks
├── id (PK, UUID)
├── project_id (FK)
├── title
├── description
├── status (ENUM: todo, in_progress, review, done, blocked)
├── priority (ENUM: low, medium, high, critical)
├── story_points
├── due_date
├── parent_task_id (FK, nullable)
├── created_by (FK)
├── created_at
└── updated_at

task_assignments
├── id (PK, UUID)
├── task_id (FK)
├── user_id (FK)
├── assigned_at
└── completed_at

time_logs
├── id (PK, UUID)
├── user_id (FK)
├── task_id (FK)
├── project_id (FK)
├── start_time
├── end_time
├── duration_minutes
├── description
├── created_at
└── updated_at

project_members
├── id (PK, UUID)
├── project_id (FK)
├── user_id (FK)
├── role (ENUM: owner, manager, developer, viewer)
├── joined_at
└── created_at
```

### Monitoring Service
```
activity_logs
├── id (PK, UUID)
├── user_id (FK)
├── activity_type (ENUM: active, idle, offline)
├── app_name
├── window_title
├── url (nullable)
├── start_time
├── end_time
├── duration_seconds
├── created_at

screenshots
├── id (PK, UUID)
├── user_id (FK)
├── task_id (FK, nullable)
├── filename
├── filepath
├── taken_at
├── productivity_score
├── created_at

productivity_settings
├── id (PK, UUID)
├── app_name
├── category (ENUM: productive, neutral, unproductive)
├── is_active
└── created_at
```

## Security Implementation

### JWT Token Structure
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "admin|manager|employee",
  "permissions": ["read", "write", "approve"],
  "exp": 1234567890,
  "iat": 1234567890
}
```

### RBAC Permissions
| Role     | Permissions                                      |
|----------|--------------------------------------------------|
| Admin    | Full access to all modules                        |
| Manager  | Manage team leaves, roster, view team analytics  |
| Employee | View own data, apply leaves, log time           |

### Rate Limiting
- Public endpoints: 100 requests/minute
- Auth endpoints: 10 requests/minute
- API endpoints: 1000 requests/minute

## Deployment Architecture

### Server Requirements
- CPU: 4+ cores
- RAM: 16GB+
- Storage: 100GB+ SSD
- OS: Ubuntu 22.04 LTS

### Service Ports
| Service      | Port |
|--------------|------|
| Auth         | 8001 |
| User         | 8002 |
| Leave        | 8003 |
| Roster       | 8004 |
| Project      | 8005 |
| Monitoring   | 8006 |
| Analytics    | 8007 |
| Notification | 8008 |
| Frontend     | 3000 |
| NGINX        | 80/443 |

### Process Management
- Python services: systemd
- Node.js frontend: PM2
- Redis: systemd
- MySQL: systemd

## Monitoring & Logging

### Log Locations
```
/var/log/services/
├── auth-service.log
├── user-service.log
├── leave-service.log
├── roster-service.log
├── project-service.log
├── monitoring-service.log
├── analytics-service.log
├── notification-service.log
└── nginx-access.log
```

### Health Check Endpoints
```
/health - Basic health check
/ready - Readiness probe (DB + Redis connectivity)
```

## Scaling Strategy

### Horizontal Scaling
- Each service can run multiple instances
- NGINX load balancing
- Redis for session sharing

### Database Scaling
- Read replicas for analytics
- Sharding for large datasets (future)
