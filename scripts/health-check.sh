#!/bin/bash

# AristoTest Health Check Script
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
BACKEND_URL="http://localhost:3001"
MINIO_URL="http://localhost:9000"
MINIO_CONSOLE_URL="http://localhost:9001"
MAX_RETRIES=3
RETRY_DELAY=5

# Results tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $status in
        "pass")
            echo -e "${GREEN}✓${NC} $message"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            ;;
        "fail")
            echo -e "${RED}✗${NC} $message"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            ;;
        "warning")
            echo -e "${YELLOW}⚠${NC} $message"
            WARNINGS=$((WARNINGS + 1))
            ;;
        "info")
            echo -e "${BLUE}ℹ${NC} $message"
            TOTAL_CHECKS=$((TOTAL_CHECKS - 1))  # Don't count info messages
            ;;
    esac
}

# Check with retry
check_with_retry() {
    local url=$1
    local service=$2
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            return 0
        fi
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    done
    return 1
}

# Check system requirements
check_system() {
    echo -e "\n${BLUE}=== System Requirements ===${NC}"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_status "pass" "Node.js installed: $NODE_VERSION"
    else
        print_status "fail" "Node.js not installed"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_status "pass" "npm installed: $NPM_VERSION"
    else
        print_status "fail" "npm not installed"
    fi
    
    # Check FFmpeg
    if command -v ffmpeg &> /dev/null; then
        print_status "pass" "FFmpeg installed"
    else
        print_status "warning" "FFmpeg not installed (video processing will fail)"
    fi
    
    # Check PM2
    if command -v pm2 &> /dev/null; then
        print_status "pass" "PM2 installed"
    else
        print_status "warning" "PM2 not installed (process management unavailable)"
    fi
}

# Check backend services
check_backend() {
    echo -e "\n${BLUE}=== Backend Services ===${NC}"
    
    # Check backend health endpoint
    if check_with_retry "$BACKEND_URL/api/v1/health" "Backend"; then
        print_status "pass" "Backend API is running"
        
        # Check specific endpoints
        if curl -f -s "$BACKEND_URL/api/v1/auth/health" > /dev/null 2>&1; then
            print_status "pass" "Auth service is healthy"
        else
            print_status "warning" "Auth service not responding"
        fi
        
        if curl -f -s "$BACKEND_URL/socket.io/" > /dev/null 2>&1; then
            print_status "pass" "Socket.io is running"
        else
            print_status "warning" "Socket.io not responding"
        fi
    else
        print_status "fail" "Backend API is not running"
    fi
    
    # Check PM2 status if available
    if command -v pm2 &> /dev/null; then
        PM2_STATUS=$(pm2 list | grep "aristotest-backend" || true)
        if [ -n "$PM2_STATUS" ]; then
            if echo "$PM2_STATUS" | grep -q "online"; then
                print_status "pass" "PM2 process is online"
            else
                print_status "warning" "PM2 process is not online"
            fi
        else
            print_status "warning" "PM2 process not found"
        fi
    fi
}

# Check database
check_database() {
    echo -e "\n${BLUE}=== Database ===${NC}"
    
    if [ -f "../backend/.env" ]; then
        source ../backend/.env
        
        if command -v psql &> /dev/null; then
            export PGPASSWORD="$DB_PASSWORD"
            
            # Check connection
            if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c '\dt' &> /dev/null; then
                print_status "pass" "Database connection successful"
                
                # Check critical tables
                TABLES=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
                print_status "info" "Database has $TABLES tables"
                
                # Check for critical tables
                for table in users quizzes videos interactive_video_layers manuals; do
                    if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c "SELECT 1 FROM $table LIMIT 1" &> /dev/null; then
                        print_status "pass" "Table '$table' exists"
                    else
                        print_status "warning" "Table '$table' is empty or missing"
                    fi
                done
            else
                print_status "fail" "Cannot connect to database"
            fi
        else
            print_status "warning" "psql client not installed - skipping database checks"
        fi
    else
        print_status "warning" "Backend .env not found - skipping database checks"
    fi
}

# Check storage
check_storage() {
    echo -e "\n${BLUE}=== Storage Services ===${NC}"
    
    # Check MinIO API
    if check_with_retry "$MINIO_URL/minio/health/live" "MinIO"; then
        print_status "pass" "MinIO API is running"
    else
        print_status "fail" "MinIO API is not running"
    fi
    
    # Check MinIO Console
    if curl -f -s "$MINIO_CONSOLE_URL" > /dev/null 2>&1; then
        print_status "pass" "MinIO Console is accessible"
    else
        print_status "warning" "MinIO Console not accessible"
    fi
    
    # Check storage directories
    if [ -d "../backend/storage" ]; then
        print_status "pass" "Storage directory exists"
        
        # Check subdirectories
        for dir in uploads processed videos manuals; do
            if [ -d "../backend/storage/$dir" ]; then
                print_status "pass" "Storage/$dir directory exists"
            else
                print_status "warning" "Storage/$dir directory missing"
            fi
        done
    else
        print_status "fail" "Storage directory not found"
    fi
}

# Check frontend
check_frontend() {
    echo -e "\n${BLUE}=== Frontend ===${NC}"
    
    # Check frontend build
    if [ -d "../frontend/dist" ]; then
        print_status "pass" "Frontend build exists"
        
        # Check index.html
        if [ -f "../frontend/dist/index.html" ]; then
            print_status "pass" "index.html found"
        else
            print_status "fail" "index.html not found in build"
        fi
        
        # Check assets
        if [ -d "../frontend/dist/assets" ]; then
            JS_FILES=$(find ../frontend/dist/assets -name "*.js" | wc -l)
            CSS_FILES=$(find ../frontend/dist/assets -name "*.css" | wc -l)
            print_status "info" "Found $JS_FILES JS files and $CSS_FILES CSS files"
        fi
    else
        print_status "fail" "Frontend build not found (run npm run build)"
    fi
}

# Check API endpoints
check_api_endpoints() {
    echo -e "\n${BLUE}=== API Endpoints ===${NC}"
    
    # Only check if backend is running
    if curl -f -s "$BACKEND_URL/api/v1/health" > /dev/null 2>&1; then
        # Test auth endpoint
        AUTH_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v1/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"email":"test@test.com","password":"test"}' 2>/dev/null || echo "{}")
        
        if echo "$AUTH_RESPONSE" | grep -q "error\|message"; then
            print_status "pass" "Auth endpoint responding"
        else
            print_status "warning" "Auth endpoint not responding properly"
        fi
        
        # Test quiz list (should return 401 without auth)
        QUIZ_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/v1/quizzes" 2>/dev/null | tail -n1)
        if [ "$QUIZ_RESPONSE" = "401" ]; then
            print_status "pass" "Quiz endpoint requires authentication (expected)"
        else
            print_status "warning" "Quiz endpoint returned unexpected status: $QUIZ_RESPONSE"
        fi
        
        # Test video endpoints
        VIDEO_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/v1/videos" 2>/dev/null | tail -n1)
        if [ "$VIDEO_RESPONSE" = "401" ]; then
            print_status "pass" "Video endpoint requires authentication (expected)"
        else
            print_status "warning" "Video endpoint returned unexpected status: $VIDEO_RESPONSE"
        fi
    else
        print_status "warning" "Backend not running - skipping API tests"
    fi
}

# Check logs
check_logs() {
    echo -e "\n${BLUE}=== Logs ===${NC}"
    
    # Check PM2 logs
    if command -v pm2 &> /dev/null; then
        if [ -d "$HOME/.pm2/logs" ]; then
            ERROR_COUNT=$(find $HOME/.pm2/logs -name "*error*" -mtime -1 -exec grep -l "ERROR\|Error" {} \; 2>/dev/null | wc -l)
            if [ $ERROR_COUNT -eq 0 ]; then
                print_status "pass" "No recent errors in PM2 logs"
            else
                print_status "warning" "Found $ERROR_COUNT files with recent errors in PM2 logs"
            fi
        fi
    fi
    
    # Check application logs
    if [ -d "../logs" ]; then
        print_status "info" "Application logs directory exists"
    else
        print_status "info" "No application logs directory"
    fi
}

# Generate summary
generate_summary() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}           HEALTH CHECK SUMMARY          ${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    echo -e "Total checks: $TOTAL_CHECKS"
    echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "\n${GREEN}✓ System is healthy and ready!${NC}"
        exit 0
    elif [ $FAILED_CHECKS -lt 3 ]; then
        echo -e "\n${YELLOW}⚠ System has minor issues but may be functional${NC}"
        exit 1
    else
        echo -e "\n${RED}✗ System has critical issues and needs attention${NC}"
        exit 2
    fi
}

# Main execution
main() {
    echo -e "${BLUE}AristoTest Health Check - $(date)${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    check_system
    check_backend
    check_database
    check_storage
    check_frontend
    check_api_endpoints
    check_logs
    
    generate_summary
}

# Change to script directory
cd "$(dirname "$0")"

# Run health check
main "$@"