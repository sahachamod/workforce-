@echo off
echo Starting all Workforce Management Services...

set BASE_DIR=%~dp0
set BACKEND_DIR=%BASE_DIR%backend

REM Create log directory if not exists
if not exist "%BASE_DIR%logs" mkdir "%BASE_DIR%logs"

REM Kill existing processes
echo Stopping any existing services...
for %%S in (auth-service user-service leave-service roster-service project-service monitoring-service analytics-service notification-service payroll-service) do (
    if exist "%%S.pid" del "%%S.pid"
)

timeout /t 2 /nobreak >nul

REM Start all services
echo Starting services...

REM Auth Service - Port 8001
start /b cmd /c "cd /d %BACKEND_DIR%\auth-service && python main.py > %BASE_DIR%logs\auth-service.log 2>&1"
echo Started auth-service on port 8001

REM User Service - Port 8002
start /b cmd /c "cd /d %BACKEND_DIR%\user-service && python main.py > %BASE_DIR%logs\user-service.log 2>&1"
echo Started user-service on port 8002

REM Leave Service - Port 8003
start /b cmd /c "cd /d %BACKEND_DIR%\leave-service && python main.py > %BASE_DIR%logs\leave-service.log 2>&1"
echo Started leave-service on port 8003

REM Roster Service - Port 8004
start /b cmd /c "cd /d %BACKEND_DIR%\roster-service && python main.py > %BASE_DIR%logs\roster-service.log 2>&1"
echo Started roster-service on port 8004

REM Project Service - Port 8005
start /b cmd /c "cd /d %BACKEND_DIR%\project-service && python main.py > %BASE_DIR%logs\project-service.log 2>&1"
echo Started project-service on port 8005

REM Monitoring Service - Port 8006
start /b cmd /c "cd /d %BACKEND_DIR%\monitoring-service && python main.py > %BASE_DIR%logs\monitoring-service.log 2>&1"
echo Started monitoring-service on port 8006

REM Analytics Service - Port 8007
start /b cmd /c "cd /d %BACKEND_DIR%\analytics-service && python main.py > %BASE_DIR%logs\analytics-service.log 2>&1"
echo Started analytics-service on port 8007

REM Notification Service - Port 8008
start /b cmd /c "cd /d %BACKEND_DIR%\notification-service && python main.py > %BASE_DIR%logs\notification-service.log 2>&1"
echo Started notification-service on port 8008

REM Payroll Service - Port 8009
start /b cmd /c "cd /d %BACKEND_DIR%\payroll-service && python main.py > %BASE_DIR%logs\payroll-service.log 2>&1"
echo Started payroll-service on port 8009

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Service URLs:
echo   - Auth Service:      http://localhost:8001
echo   - User Service:      http://localhost:8002
echo   - Leave Service:     http://localhost:8003
echo   - Roster Service:   http://localhost:8004
echo   - Project Service:   http://localhost:8005
echo   - Monitoring:       http://localhost:8006
echo   - Analytics:        http://localhost:8007
echo   - Notification:      http://localhost:8008
echo   - Payroll:           http://localhost:8009
echo.
echo To stop services, run: stop-services.bat
echo Logs available in: %BASE_DIR%logs