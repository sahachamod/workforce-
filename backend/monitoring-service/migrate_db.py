import pymysql

# Connection details from .env/config
host = "localhost"
user = "root"
password = "1122"
db = "workforce_management"

try:
    connection = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=db
    )
    cursor = connection.cursor()
    
    # Check if column already exists to avoid errors
    cursor.execute("SHOW COLUMNS FROM activity_logs LIKE 'is_productive'")
    result = cursor.fetchone()
    
    if not result:
        cursor.execute("ALTER TABLE activity_logs ADD COLUMN is_productive BOOLEAN DEFAULT 1;")
        print("Column 'is_productive' added successfully to MySQL.")
    else:
        print("Column 'is_productive' already exists in MySQL.")
        
    connection.commit()
    connection.close()
except Exception as e:
    print(f"Error: {e}")
