-- Workforce Management Platform Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS workforce_management;
USE workforce_management;

-- ============================================
-- CORE TABLES (Auth + User Service)
-- ============================================

CREATE TABLE departments (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id CHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_departments_name (name),
    INDEX idx_departments_manager (manager_id)
);

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    role ENUM('admin', 'manager', 'employee') NOT NULL DEFAULT 'employee',
    department_id CHAR(36),
    job_title VARCHAR(100),
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_department (department_id)
);

ALTER TABLE departments ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (token_hash),
    INDEX idx_sessions_expires (expires_at)
);

-- ============================================
-- LEAVE MANAGEMENT TABLES
-- ============================================

CREATE TABLE leave_types (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    max_days_per_year INT DEFAULT 0,
    requires_approval BOOLEAN DEFAULT TRUE,
    is_paid BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_leave_types_code (code)
);

CREATE TABLE leave_requests (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    leave_type_id CHAR(36) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(5,2) NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    approver_id CHAR(36),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_leave_requests_user (user_id),
    INDEX idx_leave_requests_status (status),
    INDEX idx_leave_requests_dates (start_date, end_date)
);

CREATE TABLE leave_balances (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    leave_type_id CHAR(36) NOT NULL,
    year INT NOT NULL,
    total_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    used_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    pending_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    carry_forward_days DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
    UNIQUE KEY uk_leave_balance (user_id, leave_type_id, year),
    INDEX idx_leave_balances_user (user_id),
    INDEX idx_leave_balances_year (year)
);

CREATE TABLE leave_approvals (
    id CHAR(36) PRIMARY KEY,
    leave_request_id CHAR(36) NOT NULL,
    approver_id CHAR(36) NOT NULL,
    action ENUM('approved', 'rejected', 'cancelled') NOT NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_leave_approvals_request (leave_request_id)
);

-- ============================================
-- ROSTER MANAGEMENT TABLES
-- ============================================

CREATE TABLE shifts (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration_minutes INT DEFAULT 0,
    location VARCHAR(200),
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_night_shift BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_shifts_times (start_time, end_time)
);

CREATE TABLE shift_assignments (
    id CHAR(36) PRIMARY KEY,
    shift_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    status ENUM('scheduled', 'completed', 'absent', 'late', 'on_leave') DEFAULT 'scheduled',
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_shift_assignment (user_id, date),
    INDEX idx_shift_assignments_date (date),
    INDEX idx_shift_assignments_status (status)
);

CREATE TABLE shift_swaps (
    id CHAR(36) PRIMARY KEY,
    requester_id CHAR(36) NOT NULL,
    target_id CHAR(36) NOT NULL,
    requester_assignment_id CHAR(36) NOT NULL,
    target_assignment_id CHAR(36) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    approver_id CHAR(36),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_assignment_id) REFERENCES shift_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (target_assignment_id) REFERENCES shift_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_shift_swaps_requester (requester_id),
    INDEX idx_shift_swaps_status (status)
);

CREATE TABLE attendance_logs (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    total_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    status ENUM('present', 'absent', 'late', 'half_day', 'holiday', 'weekoff') DEFAULT 'present',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_attendance_user_date (user_id, date),
    INDEX idx_attendance_date (date),
    INDEX idx_attendance_status (status)
);

-- ============================================
-- PROJECT MANAGEMENT TABLES
-- ============================================

CREATE TABLE projects (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled') DEFAULT 'planning',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    owner_id CHAR(36) NOT NULL,
    client_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_projects_status (status),
    INDEX idx_projects_priority (priority),
    INDEX idx_projects_owner (owner_id)
);

CREATE TABLE project_members (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role ENUM('owner', 'manager', 'developer', 'qa', 'viewer') DEFAULT 'developer',
    hourly_rate DECIMAL(10,2),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_project_member (project_id, user_id),
    INDEX idx_project_members_user (user_id)
);

CREATE TABLE tasks (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    status ENUM('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled') DEFAULT 'todo',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    story_points INT,
    estimated_hours DECIMAL(6,2),
    due_date DATE,
    parent_task_id CHAR(36),
    position INT DEFAULT 0,
    created_by CHAR(36) NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_tasks_project (project_id),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_assignee (id),
    INDEX idx_tasks_due_date (due_date)
);

CREATE TABLE task_assignments (
    id CHAR(36) PRIMARY KEY,
    task_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_task_assignment (task_id, user_id),
    INDEX idx_task_assignments_user (user_id)
);

CREATE TABLE time_logs (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    task_id CHAR(36),
    project_id CHAR(36) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INT DEFAULT 0,
    description TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_time_logs_user (user_id),
    INDEX idx_time_logs_task (task_id),
    INDEX idx_time_logs_project (project_id),
    INDEX idx_time_logs_dates (start_time, end_time)
);

-- ============================================
-- MONITORING TABLES
-- ============================================

CREATE TABLE activity_logs (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    activity_type ENUM('active', 'idle', 'offline') DEFAULT 'active',
    app_name VARCHAR(200),
    window_title VARCHAR(500),
    url VARCHAR(1000),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_activity_logs_user (user_id),
    INDEX idx_activity_logs_time (start_time, end_time),
    INDEX idx_activity_logs_type (activity_type)
);

CREATE TABLE screenshots (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    task_id CHAR(36),
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    productivity_score INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    INDEX idx_screenshots_user (user_id),
    INDEX idx_screenshots_taken (taken_at)
);

CREATE TABLE productivity_rules (
    id CHAR(36) PRIMARY KEY,
    app_name VARCHAR(200) NOT NULL,
    app_category ENUM('productive', 'neutral', 'unproductive') DEFAULT 'neutral',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_productivity_rules_app (app_name)
);

-- ============================================
-- NOTIFICATION TABLES
-- ============================================

CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_created (created_at)
);

CREATE TABLE notification_preferences (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_notification_pref (user_id, notification_type)
);

-- ============================================
-- AUDIT & SETTINGS TABLES
-- ============================================

CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id CHAR(36),
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_logs_user (user_id),
    INDEX idx_audit_logs_resource (resource_type, resource_id),
    INDEX idx_audit_logs_created (created_at)
);

CREATE TABLE system_settings (
    id CHAR(36) PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_system_settings_key (key_name)
);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Default Leave Types
INSERT INTO leave_types (id, name, code, description, max_days_per_year, requires_approval, is_paid) VALUES
(UUID(), 'Annual Leave', 'annual', 'Paid annual leave', 20, TRUE, TRUE),
(UUID(), 'Sick Leave', 'sick', 'Medical sick leave', 10, TRUE, TRUE),
(UUID(), 'Casual Leave', 'casual', 'Casual/personal leave', 5, TRUE, TRUE),
(UUID(), 'Unpaid Leave', 'unpaid', 'Leave without pay', 30, TRUE, FALSE),
(UUID(), 'Maternity Leave', 'maternity', 'Pregnancy leave', 90, TRUE, TRUE),
(UUID(), 'Paternity Leave', 'paternity', 'Paternity leave', 5, TRUE, TRUE);

-- Default Productivity Rules
INSERT INTO productivity_rules (id, app_name, app_category) VALUES
(UUID(), 'Visual Studio Code', 'productive'),
(UUID(), 'Microsoft Teams', 'productive'),
(UUID(), 'Slack', 'neutral'),
(UUID(), 'Facebook', 'unproductive'),
(UUID(), 'YouTube', 'unproductive');

-- System Settings
INSERT INTO system_settings (id, key_name, value, description) VALUES
(UUID(), 'company_name', 'Acme Corp', 'Company name for branding'),
(UUID(), 'workday_start', '09:00', 'Default work day start time'),
(UUID(), 'workday_end', '18:00', 'Default work day end time'),
(UUID(), 'timezone', 'UTC', 'Default timezone');
