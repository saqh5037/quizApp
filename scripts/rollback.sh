#!/bin/bash

# AristoTest Emergency Rollback Script
# Version: 1.0.2-QA
# Date: 2025-01-28

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ROLLBACK_LOG="$PROJECT_ROOT/rollback-$(date +%Y%m%d-%H%M%S).log"

# Function to log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$ROLLBACK_LOG"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

# Confirm rollback
confirm_rollback() {
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}         EMERGENCY ROLLBACK             ${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    warning "This will rollback to the previous stable version"
    warning "Current work may be lost if not committed"
    echo ""
    
    read -p "Are you sure you want to rollback? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        info "Rollback cancelled"
        exit 0
    fi
}

# Stop current services
stop_services() {
    log "Stopping current services..."
    
    # Stop PM2 processes
    if command -v pm2 &> /dev/null; then
        pm2 stop all || warning "No PM2 processes to stop"
        pm2 delete all || warning "No PM2 processes to delete"
        log "PM2 processes stopped"
    fi
    
    # Kill node processes on port 3001
    if lsof -i :3001 &> /dev/null; then
        kill $(lsof -t -i:3001) || warning "Could not kill process on port 3001"
        log "Backend process stopped"
    fi
    
    # Kill node processes on port 5173
    if lsof -i :5173 &> /dev/null; then
        kill $(lsof -t -i:5173) || warning "Could not kill process on port 5173"
        log "Frontend dev server stopped"
    fi
    
    log "Services stopped"
}

# Backup current state
backup_current() {
    log "Creating backup of current state..."
    
    BACKUP_DIR="$PROJECT_ROOT/backups/rollback-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup database if PostgreSQL is available
    if command -v psql &> /dev/null && [ -f "$PROJECT_ROOT/backend/.env" ]; then
        source "$PROJECT_ROOT/backend/.env"
        export PGPASSWORD="$DB_PASSWORD"
        
        if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c '\dt' &> /dev/null 2>&1; then
            pg_dump -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" > "$BACKUP_DIR/database-current.sql" 2>/dev/null
            log "Database backed up to $BACKUP_DIR/database-current.sql"
        else
            warning "Could not backup database"
        fi
    fi
    
    # Backup current git state
    cd "$PROJECT_ROOT"
    git diff > "$BACKUP_DIR/uncommitted-changes.diff" 2>/dev/null || true
    git rev-parse HEAD > "$BACKUP_DIR/current-commit.txt"
    
    log "Current state backed up to $BACKUP_DIR"
}

# Rollback git repository
rollback_git() {
    log "Rolling back git repository..."
    cd "$PROJECT_ROOT"
    
    # Show available branches and tags
    info "Available branches:"
    git branch -a | grep -E "main|master|stable|production" || true
    
    info "Recent tags:"
    git tag -l | tail -5 || true
    
    # Stash current changes
    if [ -n "$(git status --porcelain)" ]; then
        git stash push -m "Rollback stash $(date +%Y%m%d-%H%M%S)"
        log "Current changes stashed"
    fi
    
    # Ask user for rollback target
    echo ""
    echo "Rollback options:"
    echo "1) main branch (stable)"
    echo "2) Previous commit"
    echo "3) Specific tag/branch"
    echo "4) Restore from backup"
    read -p "Choose option (1-4): " OPTION
    
    case $OPTION in
        1)
            git checkout main || git checkout master
            git pull origin main || git pull origin master
            log "Rolled back to main branch"
            ;;
        2)
            git checkout HEAD~1
            log "Rolled back to previous commit"
            ;;
        3)
            read -p "Enter tag or branch name: " TARGET
            git checkout "$TARGET"
            log "Rolled back to $TARGET"
            ;;
        4)
            # Find latest backup
            LATEST_BACKUP=$(ls -t "$PROJECT_ROOT/backups" | grep "backup-" | head -1)
            if [ -n "$LATEST_BACKUP" ]; then
                info "Found backup: $LATEST_BACKUP"
                git checkout "backup/estado-actual-$(echo $LATEST_BACKUP | cut -d'-' -f2-)"
                log "Restored from backup branch"
            else
                error "No backup found"
            fi
            ;;
        *)
            error "Invalid option"
            ;;
    esac
}

# Reinstall dependencies
reinstall_dependencies() {
    log "Reinstalling dependencies..."
    
    # Backend
    cd "$PROJECT_ROOT/backend"
    rm -rf node_modules package-lock.json
    npm install
    log "Backend dependencies reinstalled"
    
    # Frontend
    cd "$PROJECT_ROOT/frontend"
    rm -rf node_modules package-lock.json
    npm install
    log "Frontend dependencies reinstalled"
}

# Rebuild applications
rebuild_apps() {
    log "Rebuilding applications..."
    
    # Backend
    cd "$PROJECT_ROOT/backend"
    npm run build || warning "Backend build failed"
    
    # Frontend
    cd "$PROJECT_ROOT/frontend"
    npm run build || warning "Frontend build failed"
    
    log "Applications rebuilt"
}

# Restart services
restart_services() {
    log "Restarting services..."
    
    # Start with PM2 if ecosystem file exists
    cd "$PROJECT_ROOT"
    if [ -f "ecosystem.config.js" ] && command -v pm2 &> /dev/null; then
        pm2 start ecosystem.config.js
        pm2 save
        log "Services restarted with PM2"
        pm2 status
    else
        # Start development servers
        warning "PM2 not configured. Starting development servers..."
        
        # Start backend
        cd "$PROJECT_ROOT/backend"
        npm run dev > "$PROJECT_ROOT/logs/backend-dev.log" 2>&1 &
        
        # Start frontend
        cd "$PROJECT_ROOT/frontend"
        npm run dev > "$PROJECT_ROOT/logs/frontend-dev.log" 2>&1 &
        
        log "Development servers started"
    fi
}

# Run health check
run_health_check() {
    log "Running health check..."
    
    # Wait for services to start
    sleep 10
    
    if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
        bash "$SCRIPT_DIR/health-check.sh"
    else
        # Basic health check
        if curl -f http://localhost:3001/api/v1/health &> /dev/null; then
            log "Backend is healthy"
        else
            warning "Backend health check failed"
        fi
    fi
}

# Restore database
restore_database() {
    log "Checking for database restore..."
    
    echo ""
    read -p "Do you want to restore the database? (yes/no): " RESTORE_DB
    
    if [ "$RESTORE_DB" = "yes" ]; then
        # List available backups
        if [ -d "$PROJECT_ROOT/backups" ]; then
            info "Available database backups:"
            find "$PROJECT_ROOT/backups" -name "*.sql" -type f | tail -5
            
            read -p "Enter path to backup file (or press Enter to skip): " BACKUP_FILE
            
            if [ -f "$BACKUP_FILE" ]; then
                source "$PROJECT_ROOT/backend/.env"
                export PGPASSWORD="$DB_PASSWORD"
                
                # Drop and recreate database
                psql -U "$DB_USER" -h "$DB_HOST" -c "DROP DATABASE IF EXISTS $DB_NAME;"
                psql -U "$DB_USER" -h "$DB_HOST" -c "CREATE DATABASE $DB_NAME;"
                
                # Restore backup
                psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" < "$BACKUP_FILE"
                
                log "Database restored from $BACKUP_FILE"
            fi
        else
            warning "No backups directory found"
        fi
    fi
}

# Clean up
cleanup() {
    log "Cleaning up..."
    
    # Clear npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Remove temporary files
    find "$PROJECT_ROOT" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    log "Cleanup completed"
}

# Generate report
generate_report() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}         ROLLBACK COMPLETE              ${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    echo ""
    info "Rollback log saved to: $ROLLBACK_LOG"
    info "Current branch: $(git branch --show-current)"
    info "Current commit: $(git rev-parse --short HEAD)"
    echo ""
    
    if command -v pm2 &> /dev/null; then
        info "Services status:"
        pm2 list
    fi
    
    echo ""
    log "Rollback completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Verify application functionality"
    echo "2. Check logs for any errors"
    echo "3. If issues persist, check rollback log: $ROLLBACK_LOG"
    echo ""
}

# Main rollback process
main() {
    confirm_rollback
    stop_services
    backup_current
    rollback_git
    reinstall_dependencies
    rebuild_apps
    restore_database
    restart_services
    run_health_check
    cleanup
    generate_report
}

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Run rollback
main "$@"