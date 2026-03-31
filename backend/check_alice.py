import pymysql

conn = pymysql.connect(
    host='localhost', user='root', password='1122', database='workforce_management', charset='utf8mb4'
)
with conn.cursor() as c:
    c.execute("""
        SELECT s.id, s.user_id, s.timestamp, u.department_id, d.name 
        FROM screenshots s 
        JOIN users u ON s.user_id = u.id 
        LEFT JOIN departments d ON u.department_id = d.id 
        WHERE s.user_id = 'user-emp-1'
    """)
    rows = c.fetchall()
    print("Alice's screenshots are:")
    for r in rows:
        print(r)
