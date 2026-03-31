import sqlite3
import pymysql
import os
from datetime import datetime
import json
import bcrypt
import uuid

class DatabaseService:
    # Use sync driver since PyQt handles its own event loop and we'll use a separate thread
    DB_CONFIG = {
        'host': 'localhost',
        'user': 'root',
        'password': '1122',
        'database': 'workforce_management',
        'charset': 'utf8mb4',
        'cursorclass': pymysql.cursors.DictCursor
    }

    def __init__(self, sqlite_path="local_db/buffer.db"):
        self.sqlite_path = sqlite_path
        os.makedirs(os.path.dirname(self.sqlite_path), exist_ok=True)
        self.init_sqlite()
        # Ensure MySQL tables exist
        self.create_mysql_tables()

    def get_mysql_conn(self):
        return pymysql.connect(**self.DB_CONFIG)

    def init_sqlite(self):
        with sqlite3.connect(self.sqlite_path) as conn:
            cursor = conn.cursor()
            # Local cache for auth and unsynced logs
            cursor.execute('''CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS offline_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    endpoint TEXT,
                    payload TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()

    def save_config(self, key, value):
        with sqlite3.connect(self.sqlite_path) as conn:
            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", (key, str(value)))

    def get_config(self, key):
        with sqlite3.connect(self.sqlite_path) as conn:
            res = conn.execute("SELECT value FROM config WHERE key = ?", (key,)).fetchone()
            return res[0] if res else None

    def create_mysql_tables(self):
        """Standardizing tables provided by user."""
        try:
            conn = self.get_mysql_conn()
            with conn.cursor() as cursor:
                # ... (Existing table creations)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    activity_type VARCHAR(20),
                    app_name VARCHAR(255),
                    window_title TEXT,
                    url VARCHAR(1000),
                    start_time DATETIME NOT NULL,
                    end_time DATETIME,
                    duration_seconds INT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    browser_search TEXT,
                    open_apps TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS screenshots (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    filepath VARCHAR(500) NOT NULL,
                    taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    productivity_score INT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """)
                conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error creating MySQL tables: {e}")

    def log_screenshot_to_mysql(self, user_id, filename, filepath, score=None):
        try:
            conn = self.get_mysql_conn()
            log_id = str(uuid.uuid4())
            time_now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO screenshots (id, user_id, filename, filepath, taken_at, productivity_score)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (log_id, user_id, filename, filepath, time_now, score))
                conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"MySQL Screenshot Error: {e}")
            return False

    def authenticate_user(self, email, password):
        """Verifies login directly against MySQL if online."""
        try:
            conn = self.get_mysql_conn()
            with conn.cursor() as cursor:
                # pymysql uses %s as placeholder
                cursor.execute("SELECT * FROM users WHERE email = %s AND is_active = 1", (email,))
                user = cursor.fetchone()
                if user:
                    stored_hash = user['password_hash']
                    if isinstance(stored_hash, str):
                        stored_hash = stored_hash.encode('utf-8')
                    
                    try:
                        if bcrypt.checkpw(password.encode('utf-8'), stored_hash):
                            return True, user
                    except Exception:
                        # Fallback for plain text if migration is in progress
                        if user['password_hash'] == password:
                            return True, user
                            
            return False, "Invalid credentials"
        except Exception as e:
            return False, f"Connection Error: {str(e)}"

    def log_attendance(self, user_id, status='present'):
        """Logs attendance directly to MySQL."""
        try:
            conn = self.get_mysql_conn()
            date_str = datetime.now().strftime('%Y-%m-%d')
            time_now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            log_id = str(uuid.uuid4())
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO attendance_logs (id, user_id, date, check_in, status)
                    VALUES (%s, %s, %s, %s, %s)
                """, (log_id, user_id, date_str, time_now, status))
                conn.commit()
            conn.close()
            return True
        except Exception as e:
            # Buffer locally if offline
            self.buffer_offline('attendance', {'user_id': user_id, 'status': status})
            return False

    def log_activity_to_mysql(self, user_id, activity_data):
        try:
            conn = self.get_mysql_conn()
            log_id = str(uuid.uuid4())
            time_now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            activity_type = activity_data.get('type', 'active')
            app_name = activity_data.get('app', 'Unknown')
            window_title = activity_data.get('title', 'Unknown')
            browser_search = activity_data.get('browser_search')
            open_apps = json.dumps(activity_data.get('open_apps', []))
            # Format datetime
            start_time = activity_data.get('start', time_now).replace('T', ' ')[:19]
            end_time = activity_data.get('end', time_now).replace('T', ' ')[:19]
            duration_seconds = activity_data.get('duration', 0)
            
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO activity_logs 
                    (id, user_id, activity_type, app_name, window_title, browser_search, open_apps, start_time, end_time, duration_seconds, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (log_id, user_id, activity_type, app_name, window_title, browser_search, open_apps, start_time, end_time, duration_seconds, time_now))
                conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"MySQL Activity Error: {e}")
            # Buffer locally if offline
            self.buffer_offline('activity', {'user_id': user_id, 'activity': activity_data})
            return False

    def buffer_offline(self, endpoint, payload):
        with sqlite3.connect(self.sqlite_path) as conn:
            conn.execute("INSERT INTO offline_logs (endpoint, payload) VALUES (?, ?)", (endpoint, json.dumps(payload)))
