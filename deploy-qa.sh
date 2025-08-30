#!/bin/bash

# ============================================================================
# AristoTest QA Deployment Script
# Version: 1.0.3
# Server: ec2-52-55-189-120.compute-1.amazonaws.com
# Path: /home/dynamtek/aristoTEST
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="dynamtek"
REMOTE_HOST="ec2-52-55-189-120.compute-1.amazonaws.com"
REMOTE_PATH="/home/dynamtek/aristoTEST"
PEM_FILE="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
LOCAL_PATH=$(pwd)
BRANCH="aristoTest250830"

# Database Configuration
DB_HOST="ec2-3-91-26-178.compute-1.amazonaws.com"
DB_PORT="5432"
DB_NAME="aristotest1"
DB_USER="labsis"
DB_PASSWORD=",U8x=]N02SX4"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   AristoTest QA Deployment Script v1.0.3   ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check if PEM file exists
if [ ! -f "$PEM_FILE" ]; then
    echo -e "${RED}Error: PEM file not found at $PEM_FILE${NC}"
    exit 1
fi

# Function to execute SSH commands
ssh_exec() {
    ssh -i "$PEM_FILE" "$REMOTE_USER@$REMOTE_HOST" "$1"
}

# Function to copy files via SCP
scp_copy() {
    scp -i "$PEM_FILE" -r "$1" "$REMOTE_USER@$REMOTE_HOST:$2"
}

# 1. Check connectivity
echo -e "${YELLOW}1. Checking server connectivity...${NC}"
if ssh_exec "echo 'Connected successfully'"; then
    echo -e "${GREEN}✓ Server connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to server${NC}"
    exit 1
fi

# 2. Check current services
echo -e "${YELLOW}2. Checking current running services...${NC}"
ssh_exec "pm2 list || true"

# 3. Create backup of existing deployment
echo -e "${YELLOW}3. Creating backup of existing deployment...${NC}"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
ssh_exec "
    if [ -d '$REMOTE_PATH' ]; then
        echo 'Creating backup...'
        tar -czf ~/aristotest_backup_$BACKUP_DATE.tar.gz -C /home/dynamtek aristoTEST 2>/dev/null || true
        echo 'Backup created: ~/aristotest_backup_$BACKUP_DATE.tar.gz'
    else
        echo 'No existing deployment found, creating directory...'
        mkdir -p $REMOTE_PATH
    fi
"

# 4. Stop current AristoTest services
echo -e "${YELLOW}4. Stopping existing AristoTest services...${NC}"
ssh_exec "
    pm2 stop aristotest-backend 2>/dev/null || true
    pm2 stop aristotest-frontend 2>/dev/null || true
    pm2 delete aristotest-backend 2>/dev/null || true
    pm2 delete aristotest-frontend 2>/dev/null || true
"

# 5. Prepare local build
echo -e "${YELLOW}5. Building application locally...${NC}"

# Build backend
echo "Building backend..."
cd backend
npm install
npm run build
cd ..

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 6. Create deployment package
echo -e "${YELLOW}6. Creating deployment package...${NC}"
DEPLOY_PACKAGE="aristotest_deploy_$BACKUP_DATE.tar.gz"

# Create temporary deployment directory
rm -rf /tmp/aristotest_deploy
mkdir -p /tmp/aristotest_deploy

# Copy backend files
echo "Copying backend files..."
cp -r backend/dist /tmp/aristotest_deploy/backend
cp -r backend/src /tmp/aristotest_deploy/backend/
cp backend/package*.json /tmp/aristotest_deploy/backend/
cp backend/.babelrc /tmp/aristotest_deploy/backend/ 2>/dev/null || true
cp backend/tsconfig.json /tmp/aristotest_deploy/backend/
mkdir -p /tmp/aristotest_deploy/backend/migrations
cp -r backend/migrations/* /tmp/aristotest_deploy/backend/migrations/

# Copy frontend build
echo "Copying frontend build..."
cp -r frontend/dist /tmp/aristotest_deploy/frontend

# Copy deployment files
cp deploy-qa-env.sh /tmp/aristotest_deploy/
cp deploy-qa-db.sql /tmp/aristotest_deploy/
cp ecosystem.config.js /tmp/aristotest_deploy/
cp nginx-qa.conf /tmp/aristotest_deploy/

# Create archive
cd /tmp
tar -czf $DEPLOY_PACKAGE aristotest_deploy
cd -

echo -e "${GREEN}✓ Deployment package created: $DEPLOY_PACKAGE${NC}"

# 7. Upload deployment package
echo -e "${YELLOW}7. Uploading deployment package...${NC}"
scp_copy "/tmp/$DEPLOY_PACKAGE" "~/"

# 8. Extract and deploy
echo -e "${YELLOW}8. Extracting and deploying...${NC}"
ssh_exec "
    cd ~
    tar -xzf $DEPLOY_PACKAGE
    rm -rf $REMOTE_PATH/*
    mv aristotest_deploy/* $REMOTE_PATH/
    rm -rf aristotest_deploy
    cd $REMOTE_PATH
"

# 9. Install dependencies on server
echo -e "${YELLOW}9. Installing dependencies on server...${NC}"
ssh_exec "
    cd $REMOTE_PATH/backend
    npm install --production
"

# 10. Setup environment
echo -e "${YELLOW}10. Setting up environment configuration...${NC}"
ssh_exec "
    cd $REMOTE_PATH
    chmod +x deploy-qa-env.sh
    ./deploy-qa-env.sh
"

# 11. Run database migrations
echo -e "${YELLOW}11. Running database migrations...${NC}"
ssh_exec "
    cd $REMOTE_PATH/backend
    export NODE_ENV=production
    export DB_HOST=$DB_HOST
    export DB_PORT=$DB_PORT
    export DB_NAME=$DB_NAME
    export DB_USER=$DB_USER
    export DB_PASSWORD='$DB_PASSWORD'
    
    # Run migrations
    npx sequelize-cli db:migrate || true
"

# 12. Setup MinIO
echo -e "${YELLOW}12. Setting up MinIO storage...${NC}"
ssh_exec "
    cd $REMOTE_PATH/backend
    
    # Check if MinIO is already running
    if pm2 list | grep -q 'minio'; then
        echo 'MinIO already running'
    else
        # Create MinIO directories
        mkdir -p storage/minio-data
        
        # Download MinIO if not exists
        if [ ! -f /usr/local/bin/minio ]; then
            wget https://dl.min.io/server/minio/release/linux-amd64/minio -O /tmp/minio
            sudo mv /tmp/minio /usr/local/bin/
            sudo chmod +x /usr/local/bin/minio
        fi
        
        # Start MinIO with PM2
        pm2 start /usr/local/bin/minio --name minio -- server storage/minio-data --console-address :9001
    fi
"

# 13. Start services with PM2
echo -e "${YELLOW}13. Starting services with PM2...${NC}"
ssh_exec "
    cd $REMOTE_PATH
    pm2 start ecosystem.config.js
    pm2 save
"

# 14. Setup Nginx
echo -e "${YELLOW}14. Configuring Nginx...${NC}"
ssh_exec "
    # Check if nginx is installed
    if ! command -v nginx &> /dev/null; then
        echo 'Installing nginx...'
        sudo apt-get update
        sudo apt-get install -y nginx
    fi
    
    # Copy nginx configuration
    sudo cp $REMOTE_PATH/nginx-qa.conf /etc/nginx/sites-available/aristotest
    sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
    
    # Test and reload nginx
    sudo nginx -t && sudo systemctl reload nginx
"

# 15. Health check
echo -e "${YELLOW}15. Performing health check...${NC}"
sleep 5

# Check backend
if ssh_exec "curl -s http://localhost:3001/api/v1/health > /dev/null 2>&1"; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

# Check frontend
if ssh_exec "curl -s http://localhost:80 > /dev/null 2>&1"; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}! Frontend may need additional configuration${NC}"
fi

# 16. Show service status
echo -e "${YELLOW}16. Service Status:${NC}"
ssh_exec "pm2 list"

# 17. Cleanup
echo -e "${YELLOW}17. Cleaning up...${NC}"
rm -f /tmp/$DEPLOY_PACKAGE
rm -rf /tmp/aristotest_deploy

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Deployment Complete!                    ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo -e "  Frontend: http://$REMOTE_HOST"
echo -e "  Backend API: http://$REMOTE_HOST:3001"
echo -e "  MinIO Console: http://$REMOTE_HOST:9001"
echo ""
echo -e "${BLUE}Database:${NC}"
echo -e "  Host: $DB_HOST"
echo -e "  Database: $DB_NAME"
echo ""
echo -e "${BLUE}Monitoring:${NC}"
echo -e "  SSH: ssh -i '$PEM_FILE' $REMOTE_USER@$REMOTE_HOST"
echo -e "  Logs: pm2 logs"
echo -e "  Status: pm2 status"
echo ""
echo -e "${YELLOW}Note: Some services may need a few moments to fully initialize.${NC}"