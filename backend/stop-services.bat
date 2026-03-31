@echo off
echo Stopping all Workforce Management Services...

REM Kill processes by port
for %%P in (8001 8002 8003 8004 8005 8006 8007 8008 8009) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
        taskkill /F /PID %%A >nul 2>&1
    )
)

echo.
echo ========================================
echo All services stopped!
echo ========================================