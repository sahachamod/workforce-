# Workforce Management Platform

Enterprise-grade SaaS platform for employee productivity management, attendance tracking, leave management, shift scheduling, and project management.

## Architecture

```
┌─────────────────────────────────────────────┐
│              NGINX Reverse Proxy             │
│     (SSL Termination + Load Balancing)      │
└─────────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    ▼                 ▼                 ▼
┌────────┐      ┌──────────┐     ┌─────────┐
│ Auth   │      │  Leave   │     │ Roster  │
│ 8001   │      │  8003    │     │  8004   │
└────────┘      └──────────┘     └─────────┘
┌────────┐      ┌──────────┐     ┌─────────┐
│ User   │      │ Project  │     │ Monitor │
│ 8002   │      │  8005    │     │  8006   │
└────────┘      └──────────┘     └─────────┘
┌────────┐      ┌──────────┐     ┌─────────┐
│Notif.  │      │Analytics │     │Frontend │
│ 8008   │      │  8007    │     │  3000   │
└────────┘      └──────────┘     └─────────┘
```

## Features

- **Employee Management**: User profiles, roles (Admin, Manager, Employee), departments
- **Leave Management**: Apply for leaves, approval workflow, balance tracking, calendar view
- **Shift/Roster Management**: Create shifts, assign employees, shift swaps, attendance tracking
- **Project Management**: Projects, tasks (Kanban), time tracking, team management
- **Employee Monitoring**: Activity tracking, app usage, productivity scoring
- **Analytics Dashboard**: Productivity trends, leave trends, attendance insights

## Tech Stack

### Backend
- Python 3.11+ with FastAPI
- SQLAlchemy ORM with async support
- MySQL database
- Redis for caching and queues
- JWT authentication

### Frontend
- Next.js 14 with App Router
- Tailwind CSS
- ShadCN UI components
- Recharts for data visualization

## Project Structure

```
/backend
  /auth-service         # Authentication & authorization
  /user-service         # User & department management
  /leave-service        # Leave requests & approvals
  /roster-service       # Shift & attendance management
  /project-service      # Project & task management
  /monitoring-service   # Employee activity monitoring
  /analytics-service    # Reporting & analytics
  /notification-service # Notifications
  /common               # Shared utilities

/frontend
  /app                  # Next.js app router pages
  /components           # React components
  /lib                  # Utilities & API client

/nginx                   # NGINX configuration
/systemd                 # systemd service files
/scripts                 # Deployment scripts
/database               # MySQL schema
```

## Prerequisites

- Ubuntu 22.04 LTS
- Python 3.11+
- Node.js 18+
- MySQL 8.0+
- Redis 7.0+
- NGINX
- PM2 (for Node.js)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd workforce-management
```

### 2. Install system dependencies

```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip \
  nodejs npm mysql-server redis-server nginx
```

### 3. Set up MySQL

```bash
sudo mysql_secure_installation
sudo mysql
```

```sql
CREATE DATABASE workforce_management;
CREATE USER 'wfm_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON workforce_management.* TO 'wfm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Import database schema

```bash
mysql -u wfm_user -p < database/schema.sql
```

### 5. Create virtual environments and install Python dependencies

```bash
cd backend/auth-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Repeat for all services...
```

### 6. Install frontend dependencies

```bash
cd frontend
npm install
```

### 7. Configure environment variables

Create `.env` files for each service:

```env
DATABASE_URL=mysql+aiomysql://wfm_user:password@localhost:3306/workforce_management
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-super-secret-key-change-in-production
```

### 8. Set up systemd services

```bash
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable auth user leave roster project monitoring analytics notification
```

### 9. Configure NGINX

```bash
sudo cp nginx/workforce.conf /etc/nginx/sites-available/workforce
sudo ln -sf /etc/nginx/sites-available/workforce /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 10. Start all services

```bash
# Start backend services
sudo systemctl start auth user leave roster project monitoring analytics notification

# Start frontend with PM2
cd frontend
pm2 start npm --name "frontend" -- start
pm2 save
pm2 startup
```

## Service Ports

| Service       | Port |
|---------------|------|
| Auth          | 8001 |
| User          | 8002 |
| Leave         | 8003 |
| Roster        | 8004 |
| Project       | 8005 |
| Monitoring    | 8006 |
| Analytics     | 8007 |
| Notification  | 8008 |
| Frontend      | 3000 |
| NGINX         | 80/443 |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Leave Management
- `GET /api/leaves/types` - Get leave types
- `POST /api/leaves/apply` - Apply for leave
- `GET /api/leaves/my` - Get user's leaves
- `GET /api/leaves/balances` - Get leave balances
- `PUT /api/leaves/{id}/approve` - Approve leave

### Roster Management
- `GET /api/roster/shifts` - Get shifts
- `POST /api/roster/assignments` - Create assignment
- `GET /api/roster/calendar` - Get roster calendar
- `POST /api/roster/attendance/checkin` - Check in
- `POST /api/roster/attendance/checkout` - Check out

### Project Management
- `GET /api/projects` - Get projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}/tasks` - Get project tasks
- `POST /api/projects/{id}/tasks` - Create task
- `PUT /api/projects/{id}/tasks/{taskId}` - Update task
- `POST /api/projects/time-logs` - Log time

### Monitoring
- `POST /api/monitoring/activities` - Log activity
- `GET /api/monitoring/summary` - Get activity summary
- `GET /api/monitoring/app-usage` - Get app usage stats

### Analytics
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/productivity-trend` - Productivity trend
- `GET /api/analytics/attendance-insights` - Attendance insights

## Security

- JWT-based authentication
- Role-based access control (RBAC): Admin, Manager, Employee
- Password hashing with bcrypt
- HTTPS via NGINX
- Input validation with Pydantic
- Rate limiting

## Monitoring & Logging

Log files location: `/var/log/services/`

- `auth-service.log`
- `user-service.log`
- `leave-service.log`
- `roster-service.log`
- `project-service.log`
- `monitoring-service.log`
- `analytics-service.log`
- `notification-service.log`

Health check endpoints: `/health` and `/ready` for each service.

## Scaling

Each service can be scaled horizontally:
1. Add more uvicorn workers
2. Use NGINX for load balancing
3. Use Redis for session sharing
4. Consider database read replicas

## Troubleshooting

Check service status:
```bash
sudo systemctl status <service-name>
```

View logs:
```bash
tail -f /var/log/services/<service-name>.log
```

Restart service:
```bash
sudo systemctl restart <service-name>
```

## License

Proprietary - All rights reserved

Role	Email	Password
Admin	admin@company.com	admin123
Manager	manager@company.com	manager123
Employee	alice@company.com	employee123