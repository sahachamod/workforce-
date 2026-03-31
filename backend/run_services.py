import subprocess
import time
import os
import sys
import platform

SERVICES = {
    "auth-service": 8001,
    "user-service": 8002,
    "leave-service": 8003,
    "roster-service": 8004,
    "project-service": 8005,
    "monitoring-service": 8006,
    "analytics-service": 8007,
    "notification-service": 8008,
    "payroll-service": 8009,
}

processes = {}

def get_backend_dir():
    return os.path.dirname(os.path.abspath(__file__))

def start_services():
    backend_dir = get_backend_dir()
    
    print("=" * 50)
    print("Starting Workforce Management Services")
    print("=" * 50)
    print()
    
    for service_name, port in SERVICES.items():
        service_dir = os.path.join(backend_dir, service_name)
        
        if not os.path.exists(service_dir):
            print(f"Service directory not found: {service_dir}")
            continue
            
        print(f"Starting {service_name} on port {port}...")
        
        try:
            process = subprocess.Popen(
                [sys.executable, "main.py"],
                cwd=service_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            processes[service_name] = process
            print(f"  {service_name} started (PID: {process.pid})")
            
        except Exception as e:
            print(f"  Failed to start {service_name}: {e}")
    
    print()
    print("=" * 50)
    print("All services started!")
    print("=" * 50)
    print()
    print("Service URLs:")
    for service_name, port in SERVICES.items():
        print(f"  - {service_name}: http://localhost:{port}")
    print()
    print("Press Ctrl+C to stop all services")

def stop_services():
    print("\nStopping all services...")
    
    for service_name, process in processes.items():
        try:
            if platform.system() == "Windows":
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(process.pid)], 
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                subprocess.call(['kill', '-TERM', str(process.pid)], 
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"Stopped {service_name}")
        except:
            pass
    
    if platform.system() == "Windows":
        for port in SERVICES.values():
            subprocess.run(f'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :{port} ^| findstr LISTENING\') do taskkill /F /PID %a', 
                          shell=True, capture_output=True)
    else:
        for port in SERVICES.values():
            subprocess.run(f"lsof -ti:{port} | xargs kill -9 2>/dev/null", 
                          shell=True, capture_output=True)
    
    print("All services stopped!")

def main():
    try:
        start_services()
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        stop_services()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stop":
        stop_services()
    else:
        main()