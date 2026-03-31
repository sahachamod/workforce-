"""
Script to ensure all employees are added to active projects so they show data.
Run this once to populate project_members for carol, david, and any other employee users.
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
import pymysql
import uuid

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1122',
    'database': 'workforce_management',
    'charset': 'utf8mb4'
}

conn = pymysql.connect(**DB_CONFIG)
cursor = conn.cursor()

# Get all active projects
cursor.execute("SELECT id, name FROM projects WHERE status = 'active'")
active_projects = cursor.fetchall()
print(f"Active projects: {[(p[1]) for p in active_projects]}")

# Get all employees who are NOT already members of any active project
cursor.execute("""
    SELECT u.id, u.first_name, u.last_name, u.email
    FROM users u
    WHERE u.role = 'employee'
    AND u.id NOT IN (
        SELECT DISTINCT pm.user_id FROM project_members pm
        JOIN projects p ON pm.project_id = p.id
        WHERE p.status = 'active'
    )
""")
non_members = cursor.fetchall()
print(f"\nEmployees not in any active project: {[(u[1]+' '+u[2]) for u in non_members]}")

# Add them to the first active project (WorkForce or Employee Management)
# Use the 'Employee Management System' (proj-001) as the default
target_project = active_projects[0][0] if active_projects else None

if target_project and non_members:
    for user in non_members:
        member_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT IGNORE INTO project_members (id, project_id, user_id, role, hourly_rate)
            VALUES (%s, %s, %s, 'developer', 40.00)
        """, (member_id, target_project, user[0]))
        print(f"  Added {user[1]} {user[2]} to project {target_project}")

conn.commit()
print("\nDone! Run check_projects.py again to verify.")
conn.close()
