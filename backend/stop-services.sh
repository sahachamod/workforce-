#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}Stopping all Workforce Management Services...${NC}"

# Stop all services
for service in auth-service user-service leave-service roster-service project-service monitoring-service analytics-service notification-service; do
    if [ -f /tmp/$service.pid ]; then
        pid=$(cat /tmp/$service.pid)
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null
            echo -e "${RED}Stopped $service (PID: $pid)${NC}"
        fi
        rm -f /tmp/$service.pid
    fi
    
    # Also kill by port
    case $service in
        auth-service) port=8001 ;;
        user-service) port=8002 ;;
        leave-service) port=8003 ;;
        roster-service) port=8004 ;;
        project-service) port=8005 ;;
        monitoring-service) port=8006 ;;
        analytics-service) port=8007 ;;
        notification-service) port=8008 ;;
    esac
    
    # Kill process on port
    lsof -ti:$port | xargs kill -9 2>/dev/null
done

echo -e "${GREEN}All services stopped!${NC}"

# Clean up log files
rm -f /tmp/*-service.log 2>/dev/null