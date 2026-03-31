import sqlite3
import sys

db_path = r"d:\projects\employee\backend\employee.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cur.fetchall()
print("Tables in DB:", tables)

for t in tables:
    if t[0] == "activity_logs":
        cur.execute(f"SELECT COUNT(*) FROM {t[0]};")
        print(f"Count of {t[0]}:", cur.fetchone()[0])
        
conn.close()
