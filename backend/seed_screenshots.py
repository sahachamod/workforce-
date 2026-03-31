"""
Seed sample screenshots for all employees so the monitoring page shows data.
Uses the real DB schema: id (INT auto-increment), user_id, timestamp, image_data (LONGBLOB), filename.
Generates distinct placeholder PNG images per employee using pillow or raw bytes fallback.
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
import pymysql
from datetime import datetime, timedelta
import struct, zlib

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1122',
    'database': 'workforce_management',
    'charset': 'utf8mb4'
}

def make_png(r, g, b, width=320, height=180):
    """Generate a solid-color PNG as bytes without any dependencies."""
    def chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)

    # IDAT — raw RGB rows
    raw_row = b'\x00' + bytes([r, g, b] * width)
    raw_image = raw_row * height
    compressed = zlib.compress(raw_image)
    idat = chunk(b'IDAT', compressed)

    iend = chunk(b'IEND', b'')
    return b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend


# Distinct colors per employee for easy visual identification
EMPLOYEE_COLORS = [
    (99, 102, 241),   # indigo
    (16, 185, 129),   # emerald
    (245, 158, 11),   # amber
    (239, 68, 68),    # red
    (139, 92, 246),   # violet
]

conn = pymysql.connect(**DB_CONFIG)
cursor = conn.cursor()

# Get all employees
cursor.execute("SELECT id, first_name, last_name FROM users WHERE is_active=1")
all_users = cursor.fetchall()
print(f"Found {len(all_users)} users")

today = datetime.now().date()
total_inserted = 0

for idx, user in enumerate(all_users):
    uid, fname, lname = user
    color = EMPLOYEE_COLORS[idx % len(EMPLOYEE_COLORS)]

    # Check existing screenshots for today
    cursor.execute(
        "SELECT COUNT(*) FROM screenshots WHERE user_id=%s AND DATE(timestamp)=%s",
        (uid, str(today))
    )
    existing = cursor.fetchone()[0]
    if existing >= 3:
        print(f"  {fname} {lname} already has {existing} screenshots today — skipping")
        continue

    # Generate 4 screenshots spaced 2 hours apart starting at 9am
    for i in range(4):
        ts = datetime(today.year, today.month, today.day, 9 + i * 2, 15 + (i * 7) % 45, 0)
        # Slightly vary color per time slot
        r = min(255, color[0] + i * 10)
        g = min(255, color[1] + i * 5)
        b = min(255, color[2] - i * 8)
        img_bytes = make_png(r, g, b)
        fname_file = f"ss_{uid[:8]}_{i}.png"

        cursor.execute(
            "INSERT INTO screenshots (user_id, timestamp, image_data, filename) VALUES (%s, %s, %s, %s)",
            (uid, ts, img_bytes, fname_file)
        )
        total_inserted += 1

    print(f"  Added 4 screenshots for {fname} {lname}")

conn.commit()
print(f"\n✅ Inserted {total_inserted} screenshots total.")

cursor.execute("SELECT COUNT(*) FROM screenshots")
print(f"Total screenshots in DB: {cursor.fetchone()[0]}")

# Show summary per user
print("\n=== Screenshots per user ===")
cursor.execute("""
    SELECT u.first_name, u.last_name, COUNT(s.id) as cnt
    FROM users u
    LEFT JOIN screenshots s ON s.user_id = u.id AND DATE(s.timestamp) = %s
    GROUP BY u.id, u.first_name, u.last_name
    ORDER BY u.first_name
""", (str(today),))
for row in cursor.fetchall():
    print(f"  {row[0]} {row[1]}: {row[2]} screenshots today")

conn.close()
print("\nDone!")
