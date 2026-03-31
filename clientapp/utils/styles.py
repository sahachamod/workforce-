MODERN_STYLE = """
    QMainWindow {
        background-color: #f8fafc;
    }
    
    QLabel {
        color: #1e293b;
        font-family: "Segoe UI", "Inter", sans-serif;
    }
    
    QLineEdit {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px 14px;
        background-color: white;
        color: #1e293b;
        font-size: 14px;
    }
    
    QLineEdit:focus {
        border: 2px solid #3b82f6;
    }
    
    QPushButton {
        background-color: #3b82f6;
        color: white;
        border-radius: 8px;
        padding: 10px 20px;
        font-weight: 600;
        font-size: 14px;
        border: none;
    }
    
    QPushButton:hover {
        background-color: #2563eb;
    }
    
    QPushButton:pressed {
        background-color: #1d4ed8;
    }
    
    QPushButton#danger-btn {
        background-color: #ef4444;
    }
    
    QPushButton#danger-btn:hover {
        background-color: #dc2626;
    }
    
    QFrame#card {
        background-color: white;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
    }
    
    QLabel#h1 {
        font-size: 24px;
        font-weight: 800;
        color: #0f172a;
    }
    
    QLabel#stat-label {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    QLabel#stat-value {
        font-size: 20px;
        font-weight: 700;
        color: #0f172a;
    }
    
    QProgressBar {
        border: none;
        border-radius: 4px;
        background-color: #f1f5f9;
        text-align: center;
        height: 8px;
    }
    
    QProgressBar::chunk {
        background-color: #3b82f6;
        border-radius: 4px;
    }
"""
