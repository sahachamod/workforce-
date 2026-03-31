import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
import pymysql, uuid, base64
from datetime import datetime

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1122',
    'database': 'workforce_management',
    'charset': 'utf8mb4'
}

conn = pymysql.connect(**DB_CONFIG)
cursor = conn.cursor()

# Show full table structure
cursor.execute("DESCRIBE screenshots")
cols = cursor.fetchall()
print("=== screenshots table structure ===")
for col in cols:
    print(f"  {col[0]:20} | {col[1]:30} | null={col[2]} | key={col[3]} | default={col[4]}")

# Show existing records
cursor.execute("SELECT id, user_id, timestamp, filename, LENGTH(image_data) as img_size FROM screenshots LIMIT 10")
rows = cursor.fetchall()
print(f"\n=== Existing records ({len(rows)}) ===")
for r in rows:
    print(f"  id={str(r[0])[:16]}... user={r[1][:12]}... ts={r[2]} file={r[3]} img_bytes={r[4]}")

# Get employees
cursor.execute("SELECT id, first_name, last_name FROM users WHERE role='employee' AND is_active=1")
employees = cursor.fetchall()
print(f"\nEmployees: {[e[1]+' '+e[2] for e in employees]}")

# Generate a small sample PNG as binary (1x1 gray pixel base64 encoded)
# A real tiny PNG file bytes
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)

print(f"\nSeeding sample screenshot records with image_data...")
insert_count = 0
today = datetime.now().date()

for emp in employees:
    # Check if already has screenshots for today
    cursor.execute("SELECT COUNT(*) FROM screenshots WHERE user_id=%s AND DATE(timestamp)=%s", (emp[0], str(today)))
    if cursor.fetchone()[0] > 0:
        print(f"  {emp[1]} already has screenshots today, skipping")
        continue

    for i in range(4):  # 4 screenshots per employee
        sid = str(uuid.uuid4())
        hour = 9 + i * 2
        ts = datetime(today.year, today.month, today.day, hour, 30, 0)
        fname = f"screenshot_{emp[0][:8]}_{i}.png"

        cursor.execute("""
            INSERT INTO screenshots (id, user_id, timestamp, image_data, filename)
            VALUES (%s, %s, %s, %s, %s)
        """, (sid, emp[0], ts, TINY_PNG, fname))
        insert_count += 1
        print(f"  Inserted screenshot for {emp[1]} {emp[2]} at {ts}")

conn.commit()
print(f"\nInserted {insert_count} records.")
cursor.execute("SELECT COUNT(*) FROM screenshots")
print(f"Total screenshots now: {cursor.fetchone()[0]}")
conn.close()
