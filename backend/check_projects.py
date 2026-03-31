import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
import pymysql

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1122',
    'database': 'workforce_management',
    'charset': 'utf8mb4'
}

conn = pymysql.connect(**DB_CONFIG)
cursor = conn.cursor()

print("=== PROJECTS ===")
cursor.execute("SELECT id, name, status, owner_id FROM projects")
for row in cursor.fetchall():
    print(f"  {row[0]} | {row[1][:40]} | status={row[2]} | owner={row[3]}")

print("\n=== PROJECT MEMBERS ===")
cursor.execute("""
    SELECT pm.project_id, p.name, pm.user_id, u.first_name, u.last_name, pm.role
    FROM project_members pm
    JOIN projects p ON pm.project_id = p.id
    JOIN users u ON pm.user_id = u.id
    ORDER BY pm.project_id
""")
for row in cursor.fetchall():
    print(f"  {row[0]} ({row[1][:30]}) <- user={row[2]} ({row[3]} {row[4]}), role={row[5]}")

print("\n=== USERS ===")
cursor.execute("SELECT id, email, role FROM users")
for row in cursor.fetchall():
    print(f"  {row[0]} | {row[1]} | {row[2]}")

conn.close()
