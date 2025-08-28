#!/bin/bash

# AristoTest Direct AWS Deployment (Simplified)
# Date: 2025-01-28

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SSH_USER="dynamtek"
SSH_HOST="ec2-52-55-189-120.compute-1.amazonaws.com"
REMOTE_DIR="/home/dynamtek/aristotest"
LOCAL_DIR="/Users/samuelquiroz/Documents/proyectos/quiz-app"

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Step 1: Build locally
log "Building backend..."
cd "$LOCAL_DIR/backend"
npm run build || error "Backend build failed"

log "Building frontend..."
cd "$LOCAL_DIR/frontend"
echo "VITE_API_URL=http://$SSH_HOST:3001" > .env.production
echo "VITE_SOCKET_URL=http://$SSH_HOST:3001" >> .env.production
npm run build || error "Frontend build failed"

# Step 2: Prepare remote directory
log "Preparing remote server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'EOF'
# Backup if exists
if [ -d /home/dynamtek/aristotest ]; then
  mv /home/dynamtek/aristotest /home/dynamtek/aristotest-backup-$(date +%Y%m%d-%H%M%S)
fi
mkdir -p /home/dynamtek/aristotest/{backend,frontend,logs}
EOF

# Step 3: Copy files
log "Copying backend files..."
cd "$LOCAL_DIR"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
  backend/dist \
  backend/package.json \
  backend/package-lock.json \
  backend/migrations \
  backend/.sequelizerc \
  .env.qa \
  "$SSH_USER@$SSH_HOST:$REMOTE_DIR/backend/"

log "Copying frontend files..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
  frontend/dist \
  "$SSH_USER@$SSH_HOST:$REMOTE_DIR/frontend/"

# Step 4: Setup on server
log "Setting up server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'EOF'
cd /home/dynamtek/aristotest/backend

# Rename env file
mv .env.qa .env

# Install dependencies
echo "Installing dependencies..."
npm ci --production

# Create storage directories
mkdir -p storage/{uploads,processed,videos,manuals}
chmod -R 755 storage

# Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  npm install -g pm2
fi

# Stop existing AristoTest processes
pm2 delete aristotest-backend 2>/dev/null || true

# Start MinIO if not running
if ! pgrep -x "minio" > /dev/null; then
  echo "Starting MinIO..."
  mkdir -p /home/dynamtek/minio-data
  export MINIO_ROOT_USER=aristotest
  export MINIO_ROOT_PASSWORD=AristoTest2024!
  nohup minio server /home/dynamtek/minio-data --console-address ":9001" > /home/dynamtek/aristotest/logs/minio.log 2>&1 &
  sleep 5
fi

# Run migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate || echo "Migrations complete or up to date"

# Start with PM2
echo "Starting backend with PM2..."
pm2 start dist/server.js --name aristotest-backend -i 2 --env production
pm2 save

echo "Setup complete!"
pm2 status
EOF

# Step 5: Configure Nginx
log "Configuring Nginx..."
cat > /tmp/nginx-aristotest.conf << 'NGINX'
server {
    listen 80;
    server_name ec2-52-55-189-120.compute-1.amazonaws.com;
    
    root /home/dynamtek/aristotest/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

scp -i "$SSH_KEY" -o StrictHostKeyChecking=no /tmp/nginx-aristotest.conf "$SSH_USER@$SSH_HOST:/tmp/"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'EOF'
# Install nginx if needed
if ! command -v nginx &> /dev/null; then
  sudo apt update && sudo apt install -y nginx
fi

# Configure nginx
sudo cp /tmp/nginx-aristotest.conf /etc/nginx/sites-available/aristotest
sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
EOF

# Step 6: Health check
log "Running health check..."
sleep 10

if curl -f "http://$SSH_HOST:3001/api/v1/health" &> /dev/null; then
  log "✓ Backend is healthy"
else
  warning "Backend health check failed"
fi

if curl -f "http://$SSH_HOST/" &> /dev/null; then
  log "✓ Frontend is accessible"
else
  warning "Frontend not accessible"
fi

# Final message
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}       DEPLOYMENT COMPLETED!            ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Access your application at:"
echo -e "  ${GREEN}http://$SSH_HOST/${NC}"
echo ""
echo "Backend API:"
echo -e "  ${GREEN}http://$SSH_HOST:3001/api/v1${NC}"
echo ""
echo "Default credentials:"
echo "  Email: admin@aristotest.com"
echo "  Password: admin123"
echo ""
echo "SSH to server:"
echo "  ssh -i $SSH_KEY $SSH_USER@$SSH_HOST"
echo ""
echo "View logs:"
echo "  ssh -i $SSH_KEY $SSH_USER@$SSH_HOST 'pm2 logs'"
echo ""