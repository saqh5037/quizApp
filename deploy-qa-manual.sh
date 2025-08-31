#!/bin/bash

# =====================================================
# AristoTest QA Deployment Script - Manual Version
# Version: 2.0.0
# Date: 2024-08-31
# Description: Deploy script to run directly on the server
# =====================================================

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/var/www/aristotest-qa-backend"
FRONTEND_DIR="/var/www/aristotest-qa-frontend"
GITHUB_REPO="https://github.com/saqh5037/quizApp.git"
BRANCH="main"

# Database configuration
DB_HOST="aristotest-qa-db.cvynqp7xo6mw.us-east-1.rds.amazonaws.com"
DB_NAME="aristotest2"
DB_USER="aristotest"
DB_PASS="AristoTest2024"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   AristoTest QA Complete Deployment Script    ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Note: Run this script directly on the EC2 server${NC}"
echo ""

# Check if running on EC2
if [ ! -f /sys/hypervisor/uuid ] || [ $(head -c 3 /sys/hypervisor/uuid) != "ec2" ]; then
    echo -e "${YELLOW}Warning: This doesn't appear to be an EC2 instance${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${BLUE}Starting deployment process...${NC}"

# Stop current services
echo -e "${YELLOW}Stopping current services...${NC}"
sudo pm2 stop all || true
sudo systemctl stop nginx || true

# Backup current deployment
echo -e "${YELLOW}Creating backup of current deployment...${NC}"
BACKUP_DIR="/var/backups/aristotest-$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$BACKUP_DIR"

if [ -d "$BACKEND_DIR" ]; then
    sudo cp -r "$BACKEND_DIR" "$BACKUP_DIR/backend"
fi
if [ -d "$FRONTEND_DIR" ]; then
    sudo cp -r "$FRONTEND_DIR" "$BACKUP_DIR/frontend"
fi

# Clean and recreate directories
echo -e "${YELLOW}Preparing deployment directories...${NC}"
sudo rm -rf "$BACKEND_DIR" "$FRONTEND_DIR"
sudo mkdir -p "$BACKEND_DIR" "$FRONTEND_DIR"
sudo chown -R $USER:$USER "$BACKEND_DIR" "$FRONTEND_DIR"

# Clone repository
echo -e "${YELLOW}Cloning repository from GitHub...${NC}"
cd /tmp
rm -rf quizApp
git clone -b "$BRANCH" "$GITHUB_REPO"
cd quizApp

# Deploy Backend
echo -e "${BLUE}Deploying Backend...${NC}"
cp -r backend/* "$BACKEND_DIR/"
cd "$BACKEND_DIR"

# Create backend .env.production
echo -e "${YELLOW}Creating backend configuration...${NC}"
cat > .env.production << EOF
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_NAME=$DB_NAME
DB_DIALECT=postgres
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# JWT Configuration
JWT_SECRET=aristotest-qa-jwt-secret-2024-secure
JWT_REFRESH_SECRET=aristotest-qa-refresh-secret-2024-secure
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Session Configuration
SESSION_SECRET=aristotest-qa-session-secret-2024

# AI Configuration
GEMINI_API_KEY=AIzaSyDczOPJzs8Z5RCLrxxC6I9EVG-2P42MzHE
USE_MOCK_TRANSCRIPTION=false

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
MINIO_BUCKET_NAME=aristotest-videos

# FFmpeg Configuration
FFMPEG_PATH=/usr/bin/ffmpeg

# CORS Configuration
CORS_ORIGIN=http://ec2-18-206-119-156.compute-1.amazonaws.com
SOCKET_CORS_ORIGIN=http://ec2-18-206-119-156.compute-1.amazonaws.com

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/tmp/uploads

# QR Code
QR_BASE_URL=http://ec2-18-206-119-156.compute-1.amazonaws.com

# Tenant Configuration
TENANT_ID=1
DEFAULT_TENANT_ID=1

# Trust Proxy for Nginx
TRUST_PROXY=true
EOF

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
npm install --production

# Fix module aliases for production
echo -e "${YELLOW}Fixing module aliases...${NC}"
cat > register-aliases.js << 'EOF'
const moduleAlias = require('module-alias');
const path = require('path');

moduleAlias.addAliases({
  '@controllers': path.join(__dirname, 'dist/controllers'),
  '@models': path.join(__dirname, 'dist/models'),
  '@routes': path.join(__dirname, 'dist/routes'),
  '@middleware': path.join(__dirname, 'dist/middleware'),
  '@services': path.join(__dirname, 'dist/services'),
  '@config': path.join(__dirname, 'dist/config'),
  '@utils': path.join(__dirname, 'dist/utils'),
  '@validators': path.join(__dirname, 'dist/validators'),
  '@types': path.join(__dirname, 'dist/types'),
  '@socket': path.join(__dirname, 'dist/socket')
});
EOF

# Build backend
echo -e "${YELLOW}Building backend...${NC}"
npm run build || {
    echo -e "${YELLOW}Build failed, checking for existing dist folder${NC}"
    if [ ! -d "dist" ]; then
        echo -e "${RED}No dist folder found. Build is required.${NC}"
        exit 1
    fi
}

# Apply transcription fix
echo -e "${YELLOW}Applying video transcription fix...${NC}"
if [ -f "dist/services/video-transcription.service.js" ]; then
    sed -i "s/process\.env\.USE_MOCK_TRANSCRIPTION !== 'false'/process.env.USE_MOCK_TRANSCRIPTION === 'true'/g" dist/services/video-transcription.service.js
fi

# Fix trust proxy in server
if [ -f "dist/server.js" ]; then
    sed -i "/const app = express();/a app.set('trust proxy', true);" dist/server.js
fi

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
npx sequelize-cli db:migrate --env production || {
    echo -e "${YELLOW}Some migrations may have already been applied${NC}"
}

# Deploy Frontend
echo -e "${BLUE}Deploying Frontend...${NC}"
cd /tmp/quizApp
cp -r frontend/* "$FRONTEND_DIR/"
cd "$FRONTEND_DIR"

# Create frontend .env.production
echo -e "${YELLOW}Creating frontend configuration...${NC}"
cat > .env.production << EOF
VITE_API_URL=http://ec2-18-206-119-156.compute-1.amazonaws.com/api/v1
VITE_SOCKET_URL=http://ec2-18-206-119-156.compute-1.amazonaws.com
EOF

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
npm install

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
npm run build

# Configure Nginx
echo -e "${YELLOW}Configuring Nginx...${NC}"
sudo tee /etc/nginx/conf.d/aristotest.conf > /dev/null << 'EOF'
upstream backend {
    server localhost:3001;
}

server {
    listen 80;
    server_name ec2-18-206-119-156.compute-1.amazonaws.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend
    location / {
        root /var/www/aristotest-qa-frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Timeouts for long operations
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Socket.io
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # MinIO
    location /minio/ {
        proxy_pass http://localhost:9000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 1G;
    }
    
    client_max_body_size 100M;
}
EOF

# Start MinIO
echo -e "${YELLOW}Starting MinIO service...${NC}"
cd "$BACKEND_DIR"
if [ ! -d "storage/minio-data" ]; then
    mkdir -p storage/minio-data
fi

# Create MinIO systemd service
sudo tee /etc/systemd/system/minio.service > /dev/null << EOF
[Unit]
Description=MinIO
Documentation=https://docs.min.io
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=$BACKEND_DIR/storage
User=$USER
Group=$USER
Type=simple
Restart=always
RestartSec=5
Environment="MINIO_ROOT_USER=aristotest"
Environment="MINIO_ROOT_PASSWORD=AristoTest2024!"
ExecStart=/usr/local/bin/minio server ./minio-data --console-address ":9001"
StandardOutput=journal
StandardError=journal
SyslogIdentifier=minio
KillMode=mixed
KillSignal=SIGTERM
SuccessExitStatus=0

[Install]
WantedBy=multi-user.target
EOF

# Install MinIO if not present
if [ ! -f /usr/local/bin/minio ]; then
    echo -e "${YELLOW}Installing MinIO...${NC}"
    wget -q https://dl.min.io/server/minio/release/linux-amd64/minio
    chmod +x minio
    sudo mv minio /usr/local/bin/
fi

# Start services
echo -e "${YELLOW}Starting all services...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl start minio
sudo systemctl start nginx

# Start backend with PM2
cd "$BACKEND_DIR"
pm2 delete aristotest-qa-backend || true
pm2 start dist/server.js --name aristotest-qa-backend --env production
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER || true

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}Service Status:${NC}"
pm2 status
echo ""
echo -e "${BLUE}Nginx Status:${NC}"
sudo systemctl status nginx --no-pager | head -10
echo ""
echo -e "${BLUE}MinIO Status:${NC}"
sudo systemctl status minio --no-pager | head -10
echo ""
echo -e "${GREEN}Application URLs:${NC}"
echo "Frontend: http://ec2-18-206-119-156.compute-1.amazonaws.com"
echo "Backend API: http://ec2-18-206-119-156.compute-1.amazonaws.com/api/v1"
echo "MinIO Console: http://ec2-18-206-119-156.compute-1.amazonaws.com:9001"
echo ""
echo -e "${GREEN}Database: aristotest2 on RDS${NC}"
echo ""
echo -e "${YELLOW}Default credentials:${NC}"
echo "Admin: admin@aristotest.com / admin123"
echo "MinIO: aristotest / AristoTest2024!"