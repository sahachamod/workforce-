import sys, os
import pymysql

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1122',
    'database': 'workforce_management',
    'charset': 'utf8mb4'
}

def remove_other_screenshots():
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Alice's user ID is user-emp-1
    cursor.execute("DELETE FROM screenshots WHERE user_id != 'user-emp-1'")
    deleted_count = cursor.rowcount
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM screenshots")
    remaining_count = cursor.fetchone()[0]
    
    conn.close()
    print(f"Deleted {deleted_count} screenshots.")
    print(f"Remaining screenshots (Alice's): {remaining_count}")

if __name__ == "__main__":
    remove_other_screenshots()
