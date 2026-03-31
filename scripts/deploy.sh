#!/bin/bash

set -e

echo "=== Workforce Management Platform Deployment Script ==="
echo ""

BACKEND_DIR="/var/www/backend"
FRONTEND_DIR="/var/www/frontend"
LOG_DIR="/var/log/services"

create_directories() {
    echo "[1/8] Creating directories..."
    sudo mkdir -p $BACKEND_DIR
    sudo mkdir -p $FRONTEND_DIR
    sudo mkdir -p $LOG_DIR
    sudo chmod 755 $LOG_DIR
}

install_systemd_services() {
    echo "[2/8] Installing systemd services..."
    sudo cp systemd/*.service /etc/systemd/system/
    sudo systemctl daemon-reload
}

install_nginx() {
    echo "[3/8] Configuring NGINX..."
    sudo cp nginx/workforce.conf /etc/nginx/sites-available/workforce
    sudo ln -sf /etc/nginx/sites-available/workforce /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
}

setup_service() {
    local service_name=$1
    local service_dir=$2
    local port=$3

    echo "Setting up $service_name..."

    cd $service_dir
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate

    sudo systemctl enable $service_name
    sudo systemctl restart $service_name
}

deploy_backend() {
    echo "[4/8] Deploying backend services..."
    
    sudo cp -r backend/* $BACKEND_DIR/

    setup_service "auth" "$BACKEND_DIR/auth-service" "8001"
    setup_service "user" "$BACKEND_DIR/user-service" "8002"
    setup_service "leave" "$BACKEND_DIR/leave-service" "8003"
    setup_service "roster" "$BACKEND_DIR/roster-service" "8004"
    setup_service "project" "$BACKEND_DIR/project-service" "8005"
    setup_service "monitoring" "$BACKEND_DIR/monitoring-service" "8006"
    setup_service "analytics" "$BACKEND_DIR/analytics-service" "8007"
    setup_service "notification" "$BACKEND_DIR/notification-service" "8008"
}

deploy_frontend() {
    echo "[5/8] Deploying frontend..."

    sudo cp -r frontend/* $FRONTEND_DIR/
    cd $FRONTEND_DIR

    npm install
    npm run build

    pm2 delete frontend 2>/dev/null || true
    pm2 start npm --name "frontend" -- start
    pm2 save
    pm2 startup
}

setup_database() {
    echo "[6/8] Setting up database..."
    mysql -u root -p < database/schema.sql
}

verify_services() {
    echo "[7/8] Verifying services..."
    
    services=("auth" "user" "leave" "roster" "project" "monitoring" "analytics" "notification")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet ${service}.service; then
            echo "  [OK] ${service} service is running"
        else
            echo "  [FAIL] ${service} service is not running"
        fi
    done
}

echo "[8/8] Deployment complete!"
echo ""
echo "Services:"
echo "  - Auth Service:      http://localhost:8001"
echo "  - User Service:      http://localhost:8002"
echo "  - Leave Service:     http://localhost:8003"
echo "  - Roster Service:    http://localhost:8004"
echo "  - Project Service:   http://localhost:8005"
echo "  - Monitoring Service:http://localhost:8006"
echo "  - Analytics Service: http://localhost:8007"
echo "  - Notification Svc: http://localhost:8008"
echo "  - Frontend:          http://localhost:3000"
echo ""
echo "To start/stop services:"
echo "  sudo systemctl start|stop|restart <service-name>"
echo "  pm2 start|stop|restart frontend"
