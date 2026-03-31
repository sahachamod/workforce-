# Employee Monitoring Client Application

A production-ready desktop agent for tracking employee activity and productivity.

## 🚀 Features

- **Authentication**: Secure login with JWT token storage.
- **Clock System**: Clock In/Out functionality to control tracking.
- **Activity Tracking**: Real-time monitoring of active windows and applications.
- **Screenshot Capture**: Periodic automated screenshots (compressed for efficiency).
- **Offline Support**: Local SQLite database for storing data when the internet is unavailable.
- **System Tray**: Runs in the background with a minimal footprint.
- **Modern UI**: Clean, intuitive dashboard built with PyQt6.

## 🛠️ Setup Instructions

### Prerequisites

- Python 3.11 or higher
- Windows OS (recommended for full window tracking support)

### Installation

1. Navigate to the `clientapp` directory:
   ```bash
   cd clientapp
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - **Windows**:
     ```bash
     venv\Scripts\activate
     ```
   - **Linux/macOS**:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

```bash
python main.py
```

## 📁 Project Structure

- `/database`: SQLite service for local data persistence.
- `/services`: Core logic for API communication and system monitoring.
- `main.py`: Entry point and UI implementation.
- `local_db/`: Directory for the SQLite database and captured screenshots.

## 🔐 Security

- Uses JWT tokens for secure API authentication.
- Local data is stored in a private directory.
- Screenshots are optimized and compressed before upload.

## 🤝 Integration

The client is designed to work with the Workforce Management Backend API. Ensure the backend services are running before logging in.
