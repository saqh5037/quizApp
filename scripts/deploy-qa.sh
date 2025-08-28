#!/bin/bash

# AristoTest QA Deployment Script
# Version: 1.0.2-QA
# Date: 2025-01-28

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_LOG="$PROJECT_ROOT/deployment-$(date +%Y%m%d-%H%M%S).log"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js 18+ is required. Current version: $(node -v)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        warning "PostgreSQL client not found. Database verification will be skipped"
    fi
    
    # Check FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        warning "FFmpeg not found. Video processing may not work"
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        warning "PM2 not found. Installing globally..."
        npm install -g pm2
    fi
    
    log "Prerequisites check completed"
}

# Pull latest code
pull_code() {
    log "Pulling latest code from repository..."
    cd "$PROJECT_ROOT"
    
    # Stash any local changes
    if [ -n "$(git status --porcelain)" ]; then
        warning "Local changes detected. Stashing..."
        git stash push -m "Deployment stash $(date +%Y%m%d-%H%M%S)"
    fi
    
    # Pull latest from feature branch
    git fetch origin
    git checkout feature/interactive-videos-v1
    git pull origin feature/interactive-videos-v1
    
    log "Code updated successfully"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Backend dependencies
    cd "$PROJECT_ROOT/backend"
    log "Installing backend dependencies..."
    npm ci --production=false
    
    # Frontend dependencies
    cd "$PROJECT_ROOT/frontend"
    log "Installing frontend dependencies..."
    npm ci --production=false
    
    log "Dependencies installed successfully"
}

# Setup environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    # Backend .env
    if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
        if [ -f "$PROJECT_ROOT/backend/.env.example" ]; then
            cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"
            warning "Created .env from .env.example. Please configure it!"
            warning "Edit: $PROJECT_ROOT/backend/.env"
            read -p "Press enter after configuring .env file..."
        else
            error "No .env or .env.example found in backend"
        fi
    fi
    
    # Frontend .env.production
    if [ ! -f "$PROJECT_ROOT/frontend/.env.production" ]; then
        if [ -f "$PROJECT_ROOT/frontend/.env.example" ]; then
            cp "$PROJECT_ROOT/frontend/.env.example" "$PROJECT_ROOT/frontend/.env.production"
            warning "Created .env.production from .env.example. Please configure it!"
            warning "Edit: $PROJECT_ROOT/frontend/.env.production"
            read -p "Press enter after configuring .env.production file..."
        else
            error "No .env.production or .env.example found in frontend"
        fi
    fi
    
    log "Environment variables configured"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    cd "$PROJECT_ROOT/backend"
    
    # Check if database is accessible
    if command -v psql &> /dev/null; then
        # Extract DB credentials from .env
        source .env
        export PGPASSWORD="$DB_PASSWORD"
        
        if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c '\dt' &> /dev/null; then
            log "Database connection successful"
        else
            error "Cannot connect to database. Check your .env configuration"
        fi
    fi
    
    # Run migrations
    npm run migrate || error "Migration failed"
    
    log "Migrations completed successfully"
}

# Build applications
build_apps() {
    log "Building applications..."
    
    # Build backend
    cd "$PROJECT_ROOT/backend"
    log "Building backend..."
    npm run build || error "Backend build failed"
    
    # Build frontend
    cd "$PROJECT_ROOT/frontend"
    log "Building frontend..."
    npm run build || error "Frontend build failed"
    
    log "Applications built successfully"
}

# Start MinIO
start_minio() {
    log "Starting MinIO storage server..."
    
    # Check if MinIO is already running
    if pgrep -x "minio" > /dev/null; then
        warning "MinIO is already running"
    else
        # Start MinIO in background
        cd "$PROJECT_ROOT"
        if [ -f "./scripts/start-minio.sh" ]; then
            ./scripts/start-minio.sh &
            sleep 5
            log "MinIO started"
        else
            warning "MinIO start script not found. Please start MinIO manually"
        fi
    fi
}

# Deploy with PM2
deploy_pm2() {
    log "Deploying with PM2..."
    cd "$PROJECT_ROOT"
    
    # Create PM2 ecosystem file if not exists
    if [ ! -f "ecosystem.config.js" ]; then
        cat > ecosystem.config.js << 'EOF'
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
    time: true
  }]
}
EOF
        log "Created PM2 ecosystem file"
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Stop existing PM2 processes
    pm2 stop all || true
    pm2 delete all || true
    
    # Start application
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup || true
    
    log "Application deployed with PM2"
    pm2 status
}

# Run health checks
run_health_checks() {
    log "Running health checks..."
    
    # Wait for services to start
    sleep 10
    
    # Check backend health
    if curl -f http://localhost:3001/api/v1/health &> /dev/null; then
        log "✓ Backend is healthy"
    else
        error "Backend health check failed"
    fi
    
    # Check MinIO
    if curl -f http://localhost:9000/minio/health/live &> /dev/null; then
        log "✓ MinIO is healthy"
    else
        warning "MinIO health check failed"
    fi
    
    # Check frontend build
    if [ -d "$PROJECT_ROOT/frontend/dist" ]; then
        log "✓ Frontend build exists"
    else
        error "Frontend build not found"
    fi
    
    log "Health checks completed"
}

# Main deployment process
main() {
    log "Starting AristoTest QA deployment..."
    log "Deployment log: $DEPLOYMENT_LOG"
    
    check_prerequisites
    pull_code
    install_dependencies
    setup_environment
    run_migrations
    build_apps
    start_minio
    deploy_pm2
    run_health_checks
    
    log "========================================="
    log "Deployment completed successfully!"
    log "========================================="
    log "Backend: http://localhost:3001"
    log "Frontend: Serve from $PROJECT_ROOT/frontend/dist"
    log "MinIO Console: http://localhost:9001"
    log ""
    log "Next steps:"
    log "1. Configure Nginx to serve frontend and proxy backend"
    log "2. Test all functionality"
    log "3. Monitor logs: pm2 logs"
    log ""
    log "To rollback if needed: ./scripts/rollback.sh"
}

# Run deployment
main "$@"