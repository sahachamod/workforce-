import psutil
import pyautogui
import time
import os
from datetime import datetime
from PyQt6.QtCore import QThread, pyqtSignal
import win32gui
import win32process
import pygetwindow as gw

class MonitoringService(QThread):
    activity_captured = pyqtSignal(dict)
    screenshot_taken = pyqtSignal(str, str, datetime)
    screenshot_uploaded = pyqtSignal(bool)

    def __init__(self, db_service, api_service):
        super().__init__()
        self.db = db_service
        self.api = api_service
        self.is_running = False
        self.interval = 30  # Active window check interval
        self.screenshot_interval = 60 # 1 minute
        self.idle_threshold = 180 # 3 minutes
        self.last_activity = time.time()
        self.last_screenshot = 0

    def get_active_window(self):
        try:
            window = gw.getActiveWindow()
            if window:
                return window.title
            return "Unknown"
        except:
            return "Desktop"

    def get_active_process_name(self):
        try:
            window = win32gui.GetForegroundWindow()
            _, pid = win32process.GetWindowThreadProcessId(window)
            process = psutil.Process(pid)
            return process.name()
        except:
            return "System"

    def take_screenshot(self):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        filename = f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        save_dir = "local_db/screenshots"
        if not os.path.exists(save_dir):
            os.makedirs(save_dir, exist_ok=True)
            
        filepath = os.path.join(save_dir, filename)
        abs_path = os.path.abspath(filepath)
        
        try:
            screenshot = pyautogui.screenshot()
            screenshot.save(filepath, quality=40, optimize=True)
            
            taken_at = datetime.now()
            self.screenshot_taken.emit(filename, abs_path, taken_at)
            self.last_screenshot = time.time()
            
            # Log to MySQL in this thread
            if self.db:
                # We need to get the user_id from the db service's config
                user_id = self.db.get_config("user_id")
                if user_id:
                    self.db.log_screenshot_to_mysql(user_id, filename, abs_path)
            
            # Upload immediately from this thread
            if self.api:
                success = self.api.upload_screenshot(abs_path, taken_at)
                self.screenshot_uploaded.emit(success)
            
            return filepath
        except Exception as e:
            print(f"Screenshot Error: {e}")
            return None

    def get_browser_search(self, title, app_name):
        browsers = ['chrome.exe', 'firefox.exe', 'msedge.exe', 'brave.exe', 'opera.exe']
        if app_name.lower() in browsers:
            # Common search patterns in window titles
            search_indicators = [
                ' - Google Search',
                ' - Bing',
                ' - DuckDuckGo',
                ' | DuckDuckGo',
                ' - Search Results',
                ' - YouTube'
            ]
            for indicator in search_indicators:
                if indicator in title:
                    query = title.split(indicator)[0].strip()
                    return query
        return None

    def get_open_apps(self):
        try:
            # Get all windows that have titles and are likely apps the user is using
            windows = gw.getAllWindows()
            apps = []
            for w in windows:
                if w.title and w._hWnd:
                    # Filter out some common system windows if needed
                    if w.title not in ['Settings', 'Task Manager', 'Program Manager']:
                        apps.append(w.title)
            return list(set(apps))
        except:
            return []

    def stop(self):
        self.is_running = False

    def run(self):
        self.is_running = True
        self.last_screenshot = 0
        
        while self.is_running:
            try:
                # Capture active window and process
                window_title = self.get_active_window()
                app_name = self.get_active_process_name()
                browser_search = self.get_browser_search(window_title, app_name)
                open_apps = self.get_open_apps()
                
                activity = {
                    'type': 'active',
                    'app': app_name,
                    'title': window_title,
                    'browser_search': browser_search,
                    'open_apps': open_apps,
                    'start': datetime.now().isoformat(),
                    'end': datetime.now().isoformat(),
                    'duration': self.interval
                }
                
                # Emit signal for logging
                self.activity_captured.emit(activity)

                # Log to API and DB if available
                if self.api or self.db:
                    user_id = self.db.get_config("user_id") if self.db else None
                    if user_id:
                        activity['user_id'] = user_id
                        if self.api:
                            self.api.log_activity(activity)
                        if self.db:
                            self.db.log_activity_to_mysql(user_id, activity)
                
                # Periodic Screenshot
                if time.time() - self.last_screenshot >= self.screenshot_interval:
                    self.take_screenshot()
                
                time.sleep(self.interval)
            except Exception as e:
                print(f"Monitoring Error: {e}")
                time.sleep(5)
