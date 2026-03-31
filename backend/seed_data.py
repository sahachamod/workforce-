import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from datetime import datetime, timedelta
import bcrypt
import pymysql

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1122',
    'database': 'workforce_management',
    'charset': 'utf8mb4'
}

def create_database():
    conn = pymysql.connect(host='localhost', user='root', password='1122')
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE IF NOT EXISTS workforce_management")
    conn.commit()
    conn.close()
    print("Database created!")

def create_tables():
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        manager_id VARCHAR(36),
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        avatar_url VARCHAR(500),
        role ENUM('admin','manager','employee') DEFAULT 'employee',
        department_id VARCHAR(36),
        job_title VARCHAR(100),
        hire_date DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        refresh_token_hash VARCHAR(255),
        expires_at DATETIME NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shifts (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_time VARCHAR(8) NOT NULL,
        end_time VARCHAR(8) NOT NULL,
        break_duration_minutes INT DEFAULT 0,
        location VARCHAR(200),
        color VARCHAR(7) DEFAULT '#3B82F6',
        is_night_shift BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shift_assignments (
        id VARCHAR(36) PRIMARY KEY,
        shift_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        date VARCHAR(10) NOT NULL,
        status ENUM('scheduled','completed','absent','late','on_leave') DEFAULT 'scheduled',
        check_in_time DATETIME,
        check_out_time DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        status ENUM('planning','active','on_hold','completed','cancelled') DEFAULT 'planning',
        priority ENUM('low','medium','high','critical') DEFAULT 'medium',
        start_date DATETIME,
        end_date DATETIME,
        budget DECIMAL(15,2),
        owner_id VARCHAR(36) NOT NULL,
        client_name VARCHAR(200),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_members (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role ENUM('owner','manager','developer','qa','viewer') DEFAULT 'developer',
        hourly_rate DECIMAL(10,2),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        status ENUM('todo','in_progress','review','done','blocked','cancelled') DEFAULT 'todo',
        priority ENUM('low','medium','high','critical') DEFAULT 'medium',
        story_points INT,
        estimated_hours DECIMAL(6,2),
        due_date DATETIME,
        parent_task_id VARCHAR(36),
        position INT DEFAULT 0,
        created_by VARCHAR(36) NOT NULL,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS leave_types (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        description TEXT,
        max_days_per_year INT DEFAULT 0,
        requires_approval BOOLEAN DEFAULT TRUE,
        is_paid BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS leave_balances (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        leave_type_id VARCHAR(36) NOT NULL,
        year INT NOT NULL,
        total_days DECIMAL(5,2) DEFAULT 0,
        used_days DECIMAL(5,2) DEFAULT 0,
        pending_days DECIMAL(5,2) DEFAULT 0,
        carry_forward_days DECIMAL(5,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS leave_requests (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        leave_type_id VARCHAR(36) NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        total_days DECIMAL(5,2) NOT NULL,
        reason TEXT,
        status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
        approver_id VARCHAR(36),
        approved_at DATETIME,
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
        FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS leave_approvals (
        id VARCHAR(36) PRIMARY KEY,
        leave_request_id VARCHAR(36) NOT NULL,
        approver_id VARCHAR(36) NOT NULL,
        action ENUM('approved','rejected','cancelled') NOT NULL,
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        date VARCHAR(10) NOT NULL,
        check_in DATETIME,
        check_out DATETIME,
        total_hours VARCHAR(10) DEFAULT '0',
        overtime_hours VARCHAR(10) DEFAULT '0',
        status ENUM('present','absent','late','half_day','holiday','weekoff') DEFAULT 'present',
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    conn.close()
    print("Tables created!")

def insert_sample_data():
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM departments")
    if cursor.fetchone()[0] > 0:
        print("Data already exists, skipping...")
        conn.close()
        return
    
    cursor.execute("INSERT INTO departments (id, name, description) VALUES ('dept-001', 'Engineering', 'Software Development Team')")
    cursor.execute("INSERT INTO departments (id, name, description) VALUES ('dept-002', 'Human Resources', 'HR and Recruitment')")
    cursor.execute("INSERT INTO departments (id, name, description) VALUES ('dept-003', 'Marketing', 'Marketing and Sales')")
    
    cursor.execute("""
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, department_id, job_title, hire_date, is_active)
    VALUES ('user-admin', 'admin@company.com', %s, 'System', 'Admin', '+1234567890', 'admin', 'dept-001', 'System Administrator', '2023-01-01', 1)
    """, (bcrypt.hash("admin123"),))
    
    cursor.execute("""
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, department_id, job_title, hire_date, is_active)
    VALUES ('user-manager', 'manager@company.com', %s, 'John', 'Smith', '+1234567891', 'manager', 'dept-001', 'Engineering Manager', '2023-02-15', 1)
    """, (bcrypt.hash("manager123"),))
    
    employees = [
        ('user-emp-1', 'alice@company.com', 'employee123', 'Alice', 'Johnson', '+1234567892', 'dept-001', 'Software Developer', '2023-06-01'),
        ('user-emp-2', 'bob@company.com', 'employee123', 'Bob', 'Williams', '+1234567893', 'dept-001', 'QA Engineer', '2023-08-15'),
        ('user-emp-3', 'carol@company.com', 'employee123', 'Carol', 'Davis', '+1234567894', 'dept-002', 'HR Specialist', '2023-04-10'),
        ('user-emp-4', 'david@company.com', 'employee123', 'David', 'Brown', '+1234567895', 'dept-003', 'Marketing Coordinator', '2023-09-01'),
    ]
    
    for emp in employees:
        cursor.execute("""
        INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, department_id, job_title, hire_date, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, 'employee', %s, %s, %s, 1)
        """, (emp[0], emp[1], bcrypt.hash(emp[2]), emp[3], emp[4], emp[5], emp[6], emp[7], emp[8]))
    
    cursor.execute("INSERT INTO shifts (id, name, start_time, end_time, break_duration_minutes, color, is_night_shift) VALUES ('shift-001', 'Morning Shift', '09:00', '17:00', 60, '#3B82F6', 0)")
    cursor.execute("INSERT INTO shifts (id, name, start_time, end_time, break_duration_minutes, color, is_night_shift) VALUES ('shift-002', 'Evening Shift', '14:00', '22:00', 45, '#8B5CF6', 0)")
    cursor.execute("INSERT INTO shifts (id, name, start_time, end_time, break_duration_minutes, color, is_night_shift) VALUES ('shift-003', 'Night Shift', '22:00', '06:00', 30, '#EF4444', 1)")
    
    cursor.execute("""
    INSERT INTO projects (id, name, description, status, priority, start_date, end_date, budget, owner_id, client_name)
    VALUES ('proj-001', 'Employee Management System', 'A comprehensive employee management platform', 'active', 'high', '2024-01-01', '2024-12-31', 150000, 'user-manager', 'Internal')
    """)
    
    cursor.execute("""
    INSERT INTO projects (id, name, description, status, priority, start_date, end_date, budget, owner_id, client_name)
    VALUES ('proj-002', 'Mobile App Development', 'Cross-platform mobile application', 'planning', 'medium', '2024-06-01', '2024-11-30', 80000, 'user-manager', 'External Client')
    """)
    
    pm_data = [
        ('pm-001', 'proj-001', 'user-manager', 'manager', 75.00),
        ('pm-002', 'proj-001', 'user-emp-1', 'developer', 50.00),
        ('pm-003', 'proj-001', 'user-emp-2', 'qa', 45.00),
        ('pm-004', 'proj-002', 'user-manager', 'manager', 75.00),
        ('pm-005', 'proj-002', 'user-emp-1', 'developer', 50.00),
    ]
    for pm in pm_data:
        cursor.execute("INSERT INTO project_members (id, project_id, user_id, role, hourly_rate) VALUES (%s, %s, %s, %s, %s)", pm)
    
    tasks = [
        ('task-001', 'proj-001', 'User Authentication', 'Implement login and registration', 'done', 'high', 5, 20, '2024-03-15', 'user-manager', '2024-03-10'),
        ('task-002', 'proj-001', 'Dashboard Development', 'Create employee dashboard', 'in_progress', 'high', 8, 32, '2024-04-30', 'user-manager', None),
        ('task-003', 'proj-001', 'Leave Management', 'Leave request and approval workflow', 'todo', 'medium', 5, 20, '2024-05-31', 'user-manager', None),
        ('task-004', 'proj-001', 'Roster Scheduling', 'Shift scheduling and assignment', 'todo', 'medium', 5, 20, '2024-06-30', 'user-manager', None),
    ]
    for t in tasks:
        cursor.execute("INSERT INTO tasks (id, project_id, title, description, status, priority, story_points, estimated_hours, due_date, created_by, completed_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)", t)
    
    leave_types = [
        ('lt-001', 'Annual Leave', 'AL', 'Regular vacation leave', 20, 1, 1),
        ('lt-002', 'Sick Leave', 'SL', 'Medical leave', 10, 1, 1),
        ('lt-003', 'Personal Leave', 'PL', 'Personal time off', 5, 0, 1),
        ('lt-004', 'Maternity Leave', 'ML', 'Pregnancy leave', 90, 1, 1),
        ('lt-005', 'Paternity Leave', 'PBL', 'Paternity leave', 10, 1, 1),
    ]
    for lt in leave_types:
        cursor.execute("INSERT INTO leave_types (id, name, code, description, max_days_per_year, is_paid, is_active) VALUES (%s, %s, %s, %s, %s, %s, %s)", lt)
    
    user_ids = ['user-admin', 'user-manager', 'user-emp-1', 'user-emp-2', 'user-emp-3', 'user-emp-4']
    leave_type_ids = ['lt-001', 'lt-002', 'lt-003']
    max_days = [20, 10, 5]
    for uid in user_ids:
        for i, ltid in enumerate(leave_type_ids):
            cursor.execute("INSERT INTO leave_balances (id, user_id, leave_type_id, year, total_days, used_days, pending_days, carry_forward_days) VALUES (%s, %s, %s, 2024, %s, 0, 0, 0)", (f"lb-{uid}-{ltid}", uid, ltid, max_days[i]))
    
    today = datetime.now().date()
    for i in range(-5, 6):
        date = today - timedelta(days=i)
        for uid in ['user-emp-1', 'user-emp-2']:
            cursor.execute("INSERT INTO attendance_logs (id, user_id, date, check_in, check_out, total_hours, status) VALUES (%s, %s, %s, %s, %s, %s, %s)", 
                         (f"log-{uid}-{date}", uid, str(date), f"{date} 09:00:00", f"{date} 17:00:00", "8", "present"))
    
    conn.commit()
    conn.close()
    print("Sample data inserted!")

def main():
    print("Setting up database...")
    create_database()
    create_tables()
    insert_sample_data()
    print("\n=== Login Credentials ===")
    print("Admin: admin@company.com / admin123")
    print("Manager: manager@company.com / manager123")
    print("Employee: alice@company.com / employee123")

if __name__ == "__main__":
    main()