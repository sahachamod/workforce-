#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting all Workforce Management Services...${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Python
if ! command_exists python3; then
    echo -e "${RED}Python3 not found. Please install Python 3.11+${NC}"
    exit 1
fi

# Check MySQL (optional warning)
if ! command_exists mysql; then
    echo -e "${YELLOW}Warning: MySQL client not found. Make sure database is configured.${NC}"
fi

# Base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BASE_DIR/backend"

# Services configuration
declare -a services=(
    "auth-service:8001"
    "user-service:8002"
    "leave-service:8003"
    "roster-service:8004"
    "project-service:8005"
    "monitoring-service:8006"
    "analytics-service:8007"
    "notification-service:8008"
)

# Function to start a service
start_service() {
    local service_name=$1
    local port=$2
    local service_dir="$BACKEND_DIR/$service_name"
    
    if [ ! -d "$service_dir" ]; then
        echo -e "${RED}Service directory not found: $service_dir${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Starting $service_name on port $port...${NC}"
    
    # Check if virtual environment exists
    if [ -d "$service_dir/venv" ]; then
        source "$service_dir/venv/bin/activate"
    fi
    
    # Start the service in background
    cd "$service_dir"
    python3 main.py > /tmp/$service_name.log 2>&1 &
    local pid=$!
    echo $pid > /tmp/$service_name.pid
    
    echo -e "${GREEN}$service_name started (PID: $pid)${NC}"
}

# Kill existing processes
echo -e "${YELLOW}Stopping any existing services...${NC}"
for service in auth-service user-service leave-service roster-service project-service monitoring-service analytics-service notification-service; do
    if [ -f /tmp/$service.pid ]; then
        pid=$(cat /tmp/$service.pid)
        kill $pid 2>/dev/null
        rm -f /tmp/$service.pid
    fi
done
sleep 2

# Start all services
for service_info in "${services[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"
    start_service "$service_name" "$port"
done

# Wait for services to start
echo -e "${YELLOW}Waiting for services to initialize...${NC}"
sleep 5

# Check service health
echo -e "${GREEN}Checking service health...${NC}"
for service_info in "${services[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $service_name is healthy${NC}"
    else
        echo -e "${YELLOW}⚠ $service_name starting up...${NC}"
    fi
done

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}All services started successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Service URLs:"
echo "  - Auth Service:      http://localhost:8001"
echo "  - User Service:      http://localhost:8002"
echo "  - Leave Service:     http://localhost:8003"
echo "  - Roster Service:    http://localhost:8004"
echo "  - Project Service:   http://localhost:8005"
echo "  - Monitoring Service: http://localhost:8006"
echo "  - Analytics Service:  http://localhost:8007"
echo "  - Notification Service: http://localhost:8008"
echo ""
echo "To stop all services, run: ./stop-services.sh"
echo "To view logs, check /tmp/<service-name>.log"