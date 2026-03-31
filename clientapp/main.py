import sys
import os
import json
from datetime import datetime
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QLabel, QLineEdit, QPushButton, QStackedWidget, QSystemTrayIcon,
    QMenu, QFrame, QGridLayout, QProgressBar, QGraphicsDropShadowEffect
)
from PyQt6.QtCore import Qt, QTimer, QSize, QThread, pyqtSignal
from PyQt6.QtGui import QIcon, QFont, QAction, QColor

from database.db_service import DatabaseService
from services.monitoring_service import MonitoringService
from utils.styles import MODERN_STYLE

class WorkerThread(QThread):
    finished = pyqtSignal(bool, object, str) # success, data, type

    def __init__(self, task_type, api, **kwargs):
        super().__init__()
        self.task_type = task_type
        self.api = api
        self.kwargs = kwargs

    def run(self):
        try:
            if self.task_type == "login":
                success, res = self.api.login(self.kwargs['email'], self.kwargs['password'])
                self.finished.emit(success, res, "login")
            elif self.task_type == "check_in":
                success = self.api.check_in(self.kwargs['user_id'])
                self.finished.emit(success, None, "check_in")
            elif self.task_type == "check_out":
                success = self.api.check_out(self.kwargs['user_id'])
                self.finished.emit(success, None, "check_out")
        except Exception as e:
            self.finished.emit(False, str(e), self.task_type)

class ModernCard(QFrame):
    def __init__(self, title, value, parent=None):
        super().__init__(parent)
        self.setObjectName("card")
        self.setFixedSize(140, 90)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 12, 15, 12)
        
        self.title_label = QLabel(title)
        self.title_label.setObjectName("stat-label")
        
        self.value_label = QLabel(value)
        self.value_label.setObjectName("stat-value")
        
        layout.addWidget(self.title_label)
        layout.addWidget(self.value_label)
        layout.addStretch()

class Dashboard(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.init_ui()

    def init_ui(self):
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(30, 40, 30, 40)
        self.layout.setSpacing(25)

        # Header
        header = QHBoxLayout()
        self.welcome_label = QLabel("Welcome back,")
        self.welcome_label.setObjectName("h1")
        header.addWidget(self.welcome_label)
        header.addStretch()
        
        self.status_badge = QLabel("Tracking Active")
        self.status_badge.setStyleSheet("""
            background-color: #dcfce7; color: #166534; 
            padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 11px;
        """)
        header.addWidget(self.status_badge)
        self.layout.addLayout(header)

        # Stats Grid
        stats_layout = QGridLayout()
        stats_layout.setSpacing(15)
        
        self.timer_card = ModernCard("Session Time", "00:00:00")
        self.captured_card = ModernCard("Captured", "0")
        self.uploaded_card = ModernCard("Uploaded", "0")
        
        stats_layout.addWidget(self.timer_card, 0, 0)
        stats_layout.addWidget(self.captured_card, 0, 1)
        stats_layout.addWidget(self.uploaded_card, 0, 2)
        self.layout.addLayout(stats_layout)

        # Activity Feed
        feed_title = QLabel("LIVE ACTIVITY")
        feed_title.setObjectName("stat-label")
        self.layout.addWidget(feed_title)

        self.activity_box = QFrame()
        self.activity_box.setStyleSheet("background-color: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0;")
        box_layout = QVBoxLayout(self.activity_box)
        self.app_label = QLabel("Active: Visual Studio Code")
        self.app_label.setStyleSheet("font-weight: 700; color: #334155;")
        self.window_label = QLabel("File: clientapp/main.py")
        self.window_label.setStyleSheet("color: #64748b; font-size: 12px;")
        box_layout.addWidget(self.app_label)
        box_layout.addWidget(self.window_label)
        self.layout.addWidget(self.activity_box)

        self.layout.addStretch()

        # Action Buttons
        btn_layout = QHBoxLayout()
        self.clock_in_btn = QPushButton("CLOCK IN")
        self.clock_in_btn.setFixedHeight(50)
        self.clock_in_btn.setStyleSheet("background-color: #10b981;")
        btn_layout.addWidget(self.clock_in_btn)

        self.clock_out_btn = QPushButton("CLOCK OUT")
        self.clock_out_btn.setObjectName("danger-btn")
        self.clock_out_btn.setFixedHeight(50)
        btn_layout.addWidget(self.clock_out_btn)
        
        self.break_btn = QPushButton("TAKE BREAK")
        self.break_btn.setFixedHeight(50)
        self.break_btn.setStyleSheet("background-color: #64748b;")
        btn_layout.addWidget(self.break_btn)
        
        self.layout.addLayout(btn_layout)

class LoginScreen(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(60, 0, 60, 0)
        layout.setSpacing(15)
        layout.addStretch()

        logo_label = QLabel("AGENT")
        logo_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo_label.setStyleSheet("font-size: 40px; font-weight: 900; color: #3b82f6; letter-spacing: -2px;")
        layout.addWidget(logo_label)

        subtitle = QLabel("Workforce Monitoring System")
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        subtitle.setStyleSheet("color: #64748b; font-weight: 500; margin-bottom: 30px;")
        layout.addWidget(subtitle)

        self.email_input = QLineEdit()
        self.email_input.setPlaceholderText("Email Address")
        self.email_input.setFixedHeight(50)
        layout.addWidget(self.email_input)

        self.pass_input = QLineEdit()
        self.pass_input.setPlaceholderText("Password")
        self.pass_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.pass_input.setFixedHeight(50)
        layout.addWidget(self.pass_input)

        self.login_btn = QPushButton("SIGN IN")
        self.login_btn.setFixedHeight(50)
        self.login_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        layout.addWidget(self.login_btn)

        self.error_label = QLabel("")
        self.error_label.setStyleSheet("color: #ef4444; font-size: 12px;")
        self.error_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.error_label)

        layout.addStretch()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Workforce Agent")
        self.setFixedSize(500, 750)
        self.setStyleSheet(MODERN_STYLE)
        
        icon_path = os.path.join(os.path.dirname(__file__), "assets", "icon.png")
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))
            self.app_icon = QIcon(icon_path)
        else:
            self.app_icon = None

        self.db = DatabaseService()
        from services.api_service import ApiService
        self.api = ApiService()
        self.user = None
        
        self.captured_count = 0
        self.uploaded_count = 0
        self.session_seconds = 0
        self.on_break = False
        
        self.session_timer = QTimer(self)
        self.session_timer.timeout.connect(self.update_session_timer)
        self.session_timer.setInterval(1000)

        self.init_ui()
        self.init_tray()

    def init_ui(self):
        self.stack = QStackedWidget()
        self.login_view = LoginScreen()
        self.dash_view = Dashboard()
        
        self.stack.addWidget(self.login_view)
        self.stack.addWidget(self.dash_view)
        self.setCentralWidget(self.stack)

        self.login_view.login_btn.clicked.connect(self.handle_login)
        self.dash_view.clock_in_btn.clicked.connect(self.handle_clock_in)
        self.dash_view.clock_out_btn.clicked.connect(self.handle_clock_out)
        self.dash_view.break_btn.clicked.connect(self.handle_break)

    def init_tray(self):
        self.tray = QSystemTrayIcon(self)
        if self.app_icon:
            self.tray.setIcon(self.app_icon)
        
        menu = QMenu()
        menu.addAction("Show Dashboard", self.showNormal)
        menu.addAction("Exit", QApplication.instance().quit)
        self.tray.setContextMenu(menu)
        self.tray.show()

    def handle_login(self):
        email = self.login_view.email_input.text()
        password = self.login_view.pass_input.text()
        self.login_view.login_btn.setEnabled(False)
        self.login_view.error_label.setText("Signing in...")
        
        self.worker = WorkerThread("login", self.api, email=email, password=password)
        self.worker.finished.connect(self.on_worker_finished)
        self.worker.start()

    def on_worker_finished(self, success, data, task_type):
        if task_type == "login":
            self.login_view.login_btn.setEnabled(True)
            if success:
                self.user = data['user']
                self.db.save_config("user_id", self.user['id'])
                self.show_dashboard()
            else:
                self.login_view.error_label.setText(str(data))
        elif task_type == "check_in":
            # Check-in done in background, no strict UI change needed here 
            # as start_monitoring handles it
            pass
        elif task_type == "check_out":
            pass

    def show_dashboard(self):
        self.dash_view.welcome_label.setText(f"Hi, {self.user['first_name']}")
        self.stack.setCurrentIndex(1)
        self.handle_clock_in()

    def start_monitoring(self):
        if hasattr(self, 'monitor') and self.monitor.isRunning():
            return
            
        self.monitor = MonitoringService(self.db, self.api)
        self.monitor.activity_captured.connect(self.update_live_info)
        self.monitor.screenshot_taken.connect(self.handle_screenshot)
        self.monitor.screenshot_uploaded.connect(self.handle_upload_success)
        self.monitor.start()
        
        self.dash_view.status_badge.setText("Tracking Active")
        self.dash_view.status_badge.setStyleSheet("""
            background-color: #dcfce7; color: #166534; 
            padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 11px;
        """)

    def update_live_info(self, data):
        self.dash_view.app_label.setText(f"Active: {data['app']}")
        window_text = f"Window: {data['title'][:50]}..."
        if data.get('browser_search'):
            window_text += f"\nSearch: {data['browser_search']}"
        self.dash_view.window_label.setText(window_text)

    def update_session_timer(self):
        self.session_seconds += 1
        hours = self.session_seconds // 3600
        minutes = (self.session_seconds % 3600) // 60
        seconds = self.session_seconds % 60
        self.dash_view.timer_card.value_label.setText(f"{hours:02d}:{minutes:02d}:{seconds:02d}")

    def handle_clock_in(self):
        if self.api and self.user:
            self.worker = WorkerThread("check_in", self.api, user_id=self.user['id'])
            self.worker.start()
        
        self.start_monitoring()
        self.session_timer.start()
        self.dash_view.clock_in_btn.setEnabled(False)
        self.dash_view.clock_out_btn.setEnabled(True)
        self.dash_view.break_btn.setEnabled(True)

    def handle_clock_out(self):
        if self.api and self.user:
            self.worker = WorkerThread("check_out", self.api, user_id=self.user['id'])
            self.worker.start()

        if hasattr(self, 'monitor'):
            self.monitor.stop()
            self.monitor.wait()
        
        self.session_timer.stop()
        
        self.on_break = False
        self.dash_view.break_btn.setText("TAKE BREAK")
        self.dash_view.break_btn.setStyleSheet("background-color: #64748b;")

        self.dash_view.clock_in_btn.setEnabled(True)
        self.dash_view.clock_out_btn.setEnabled(False)
        self.dash_view.break_btn.setEnabled(False)
        
        self.captured_count = 0
        self.uploaded_count = 0
        self.session_seconds = 0
        self.dash_view.captured_card.value_label.setText("0")
        self.dash_view.uploaded_card.value_label.setText("0")
        self.dash_view.timer_card.value_label.setText("00:00:00")
        
        self.dash_view.status_badge.setText("Tracking Stopped")
        self.dash_view.status_badge.setStyleSheet("""
            background-color: #fee2e2; color: #991b1b; 
            padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 11px;
        """)

    def handle_break(self):
        if not self.on_break:
            self.on_break = True
            self.dash_view.break_btn.setText("END BREAK")
            self.dash_view.break_btn.setStyleSheet("background-color: #1e293b;")
            
            if hasattr(self, 'monitor'):
                self.monitor.stop()
                self.monitor.wait()
            
            self.session_timer.stop()
            self.dash_view.status_badge.setText("On Break")
            self.dash_view.status_badge.setStyleSheet("""
                background-color: #fef9c3; color: #854d0e; 
                padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 11px;
            """)
        else:
            self.on_break = False
            self.dash_view.break_btn.setText("TAKE BREAK")
            self.dash_view.break_btn.setStyleSheet("background-color: #64748b;")
            
            self.start_monitoring()
            self.session_timer.start()

    def handle_screenshot(self, filename, filepath, taken_at):
        self.captured_count += 1
        self.dash_view.captured_card.value_label.setText(str(self.captured_count))

    def handle_upload_success(self, success):
        if success:
            self.uploaded_count += 1
            self.dash_view.uploaded_card.value_label.setText(str(self.uploaded_count))

    def closeEvent(self, event):
        # Trigger clock out and stop monitoring before exiting
        self.handle_clock_out()
        event.accept()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
