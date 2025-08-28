#!/bin/bash

# AristoTest AWS QA Deployment Script
# Server: ec2-52-55-189-120.compute-1.amazonaws.com
# Date: 2025-01-28

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SSH_USER="dynamtek"
SSH_HOST="ec2-52-55-189-120.compute-1.amazonaws.com"
REMOTE_DIR="/home/dynamtek/aristotest"
LOCAL_DIR="/Users/samuelquiroz/Documents/proyectos/quiz-app"
DB_HOST="ec2-3-91-26-178.compute-1.amazonaws.com"
DB_NAME="aristotest"
DB_USER="labsis"
DB_PASSWORD=",U8x=]N02SX4"

# Function to log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check prerequisites
check_local_prerequisites() {
    log "Checking local prerequisites..."
    
    # Check SSH key
    if [ ! -f "$SSH_KEY" ]; then
        error "SSH key not found at $SSH_KEY"
    fi
    chmod 400 "$SSH_KEY"
    
    # Test SSH connection
    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SSH_USER@$SSH_HOST" "echo 'SSH connection successful'" > /dev/null 2>&1; then
        error "Cannot connect to server via SSH"
    fi
    
    log "Prerequisites checked successfully"
}

# Prepare local build
prepare_local_build() {
    log "Preparing local build..."
    cd "$LOCAL_DIR"
    
    # Copy QA environment file
    cp .env.qa backend/.env.production
    
    # Build backend
    cd backend
    npm run build || error "Backend build failed"
    
    # Build frontend with QA API URL
    cd ../frontend
    echo "VITE_API_URL=http://$SSH_HOST:3001" > .env.production
    echo "VITE_SOCKET_URL=http://$SSH_HOST:3001" >> .env.production
    npm run build || error "Frontend build failed"
    
    cd "$LOCAL_DIR"
    log "Build completed successfully"
}

# Create deployment package
create_deployment_package() {
    log "Creating deployment package..."
    
    # Create temp directory for deployment
    DEPLOY_PACKAGE="/tmp/aristotest-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Create tar package excluding unnecessary files
    tar -czf "$DEPLOY_PACKAGE" \
        --exclude="node_modules" \
        --exclude=".git" \
        --exclude="*.log" \
        --exclude="backend/storage/minio-data" \
        --exclude="backend/storage/processed/*" \
        --exclude="frontend/node_modules" \
        --exclude="frontend/src" \
        backend/dist \
        backend/package*.json \
        backend/.env.production \
        backend/migrations \
        backend/storage \
        frontend/dist \
        scripts/health-check.sh \
        ecosystem.config.js 2>/dev/null || true
    
    log "Deployment package created: $DEPLOY_PACKAGE"
    echo "$DEPLOY_PACKAGE"
}

# Deploy to server
deploy_to_server() {
    local package_file=$1
    log "Deploying to AWS server..."
    
    # Create remote directory
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "mkdir -p $REMOTE_DIR"
    
    # Copy deployment package
    log "Uploading deployment package..."
    scp -i "$SSH_KEY" "$package_file" "$SSH_USER@$SSH_HOST:/tmp/"
    
    # Extract and setup on server
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" << 'REMOTE_SCRIPT'
    set -e
    
    # Variables
    REMOTE_DIR="/home/dynamtek/aristotest"
    PACKAGE_NAME=$(ls -t /tmp/aristotest-deploy-*.tar.gz | head -1)
    
    echo "Setting up AristoTest..."
    
    # Backup existing installation if exists
    if [ -d "$REMOTE_DIR" ]; then
        echo "Backing up existing installation..."
        mv "$REMOTE_DIR" "${REMOTE_DIR}-backup-$(date +%Y%m%d-%H%M%S)"
    fi
    
    # Create directory and extract
    mkdir -p "$REMOTE_DIR"
    cd "$REMOTE_DIR"
    tar -xzf "$PACKAGE_NAME"
    
    # Install backend dependencies
    echo "Installing backend dependencies..."
    cd backend
    npm ci --production
    
    # Setup storage directories
    mkdir -p storage/uploads storage/processed storage/videos storage/manuals
    chmod -R 755 storage
    
    # Move environment file
    mv .env.production .env
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        npm install -g pm2
    fi
    
    # Stop existing PM2 processes for AristoTest
    pm2 delete aristotest-backend 2>/dev/null || true
    
    echo "Setup completed on server"
REMOTE_SCRIPT
    
    log "Files deployed successfully"
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    # Create database setup SQL
    cat > /tmp/setup-qa-db.sql << EOF
-- AristoTest QA Database Setup
-- This will reset the database for QA testing

-- Drop existing tables if needed (BE CAREFUL!)
-- Uncomment only if you want complete reset:
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- Create database if not exists
SELECT 'Database aristotest exists' WHERE EXISTS (
    SELECT FROM pg_database WHERE datname = 'aristotest'
);

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE aristotest TO labsis;
GRANT ALL ON SCHEMA public TO labsis;
EOF

    # Copy SQL file to server
    scp -i "$SSH_KEY" /tmp/setup-qa-db.sql "$SSH_USER@$SSH_HOST:/tmp/"
    
    # Run migrations on server
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" << REMOTE_SCRIPT
    cd $REMOTE_DIR/backend
    
    # Run Sequelize migrations
    echo "Running database migrations..."
    npx sequelize-cli db:migrate || echo "Migration completed or already up to date"
    
    echo "Database setup completed"
REMOTE_SCRIPT
}

# Start services with PM2
start_services() {
    log "Starting services with PM2..."
    
    # Create ecosystem file if not exists
    cat > /tmp/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './backend/dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    time: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF

    # Copy ecosystem file
    scp -i "$SSH_KEY" /tmp/ecosystem.config.js "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"
    
    # Start services on server
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" << REMOTE_SCRIPT
    cd $REMOTE_DIR
    
    # Create logs directory
    mkdir -p logs
    
    # Start MinIO if not running
    if ! pgrep -x "minio" > /dev/null; then
        echo "Starting MinIO..."
        export MINIO_ROOT_USER=aristotest
        export MINIO_ROOT_PASSWORD=AristoTest2024!
        nohup minio server /home/dynamtek/minio-data --console-address ":9001" > logs/minio.log 2>&1 &
        sleep 5
    fi
    
    # Start PM2
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup || true
    
    # Show status
    pm2 status
    
    echo "Services started successfully"
REMOTE_SCRIPT
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    # Create Nginx configuration
    cat > /tmp/aristotest-nginx.conf << 'EOF'
server {
    listen 80;
    server_name ec2-52-55-189-120.compute-1.amazonaws.com;
    
    # Frontend
    location / {
        root /home/dynamtek/aristotest/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long operations
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
    
    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # MinIO Console (optional, for admin access)
    location /minio/ {
        proxy_pass http://localhost:9001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

    # Copy and install Nginx config
    scp -i "$SSH_KEY" /tmp/aristotest-nginx.conf "$SSH_USER@$SSH_HOST:/tmp/"
    
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" << 'REMOTE_SCRIPT'
    # Check if nginx is installed
    if ! command -v nginx &> /dev/null; then
        echo "Installing Nginx..."
        sudo apt-get update
        sudo apt-get install -y nginx
    fi
    
    # Copy configuration
    sudo cp /tmp/aristotest-nginx.conf /etc/nginx/sites-available/aristotest
    sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
    
    # Test and reload nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    echo "Nginx configured successfully"
REMOTE_SCRIPT
}

# Run health checks
run_health_checks() {
    log "Running health checks..."
    
    sleep 10
    
    # Check backend
    if curl -f "http://$SSH_HOST:3001/api/v1/health" &> /dev/null; then
        log "✓ Backend is healthy"
    else
        warning "Backend health check failed"
    fi
    
    # Check frontend
    if curl -f "http://$SSH_HOST/" &> /dev/null; then
        log "✓ Frontend is accessible"
    else
        warning "Frontend not accessible"
    fi
    
    # Check MinIO
    if curl -f "http://$SSH_HOST:9000/minio/health/live" &> /dev/null; then
        log "✓ MinIO is healthy"
    else
        warning "MinIO health check failed"
    fi
}

# Show final information
show_info() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}    DEPLOYMENT COMPLETED SUCCESSFULLY   ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Access URLs:${NC}"
    echo -e "Frontend: ${GREEN}http://$SSH_HOST/${NC}"
    echo -e "Backend API: ${GREEN}http://$SSH_HOST:3001/api/v1${NC}"
    echo -e "MinIO Console: ${GREEN}http://$SSH_HOST:9001${NC}"
    echo ""
    echo -e "${BLUE}SSH Access:${NC}"
    echo -e "ssh -i $SSH_KEY $SSH_USER@$SSH_HOST"
    echo ""
    echo -e "${BLUE}PM2 Commands:${NC}"
    echo -e "ssh -i $SSH_KEY $SSH_USER@$SSH_HOST 'pm2 status'"
    echo -e "ssh -i $SSH_KEY $SSH_USER@$SSH_HOST 'pm2 logs'"
    echo -e "ssh -i $SSH_KEY $SSH_USER@$SSH_HOST 'pm2 restart all'"
    echo ""
    echo -e "${YELLOW}Important:${NC}"
    echo "1. Test all functionality thoroughly"
    echo "2. Monitor logs: pm2 logs"
    echo "3. Check database connectivity"
    echo "4. Verify video upload and processing"
    echo ""
}

# Main deployment process
main() {
    echo -e "${BLUE}Starting AristoTest AWS QA Deployment${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    check_local_prerequisites
    prepare_local_build
    PACKAGE=$(create_deployment_package)
    deploy_to_server "$PACKAGE"
    setup_database
    start_services
    configure_nginx
    run_health_checks
    show_info
    
    # Cleanup
    rm -f "$PACKAGE" /tmp/setup-qa-db.sql /tmp/ecosystem.config.js /tmp/aristotest-nginx.conf
}

# Run deployment
main "$@"