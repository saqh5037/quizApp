#!/bin/bash

# Environment configuration script for QA deployment
# This script sets up all environment variables

echo "Setting up environment configuration..."

# Backend environment
cat > /home/dynamtek/aristoTEST/backend/.env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=ec2-3-91-26-178.compute-1.amazonaws.com
DB_PORT=5432
DB_NAME=aristotest1
DB_USER=labsis
DB_PASSWORD=,U8x=]N02SX4
DB_DIALECT=postgres

# JWT Configuration
JWT_SECRET=AristoTestQA2024SecretKey_$(openssl rand -hex 32)
JWT_REFRESH_SECRET=AristoTestQA2024RefreshKey_$(openssl rand -hex 32)
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# Session Configuration
SESSION_SECRET=AristoTestQA2024SessionKey_$(openssl rand -hex 32)
SESSION_MAX_AGE=86400000

# CORS Configuration
CORS_ORIGIN=http://52.55.189.120,http://localhost:3000,http://localhost:5173
SOCKET_CORS_ORIGIN=http://52.55.189.120,http://localhost:3000,http://localhost:5173

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
MINIO_BUCKET_NAME=aristotest-videos
MINIO_USE_SSL=false

# AI Configuration
GEMINI_API_KEY=AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw
OPENAI_API_KEY=sk-proj-1mNE4R_-zFKWjbDaAtX6R7YgvpfCTjks9PGyFXsTwmfwT23fLKxFK2uRGJAuBpqH2$
CLAUDE_API_KEY=sk-ant-api03-tgv-dbsuzjXhBOSgJnlg6yi9b5_W6fglfvAqftw6Db80r6u7bk9_GIbAEZaz$

# File Upload Configuration
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./storage/uploads

# QR Code Configuration
QR_BASE_URL=http://52.55.189.120

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Redis (optional, comment out if not using)
# REDIS_HOST=localhost
# REDIS_PORT=6379

# Logging
LOG_LEVEL=info
EOF

# Frontend environment
cat > /home/dynamtek/aristoTEST/frontend/.env << 'EOF'
# API Configuration
VITE_API_URL=http://52.55.189.120:3001
VITE_SOCKET_URL=http://52.55.189.120:3001

# Public URL
VITE_PUBLIC_URL=http://52.55.189.120
EOF

# Create MinIO configuration
mkdir -p /home/dynamtek/aristoTEST/backend/storage/minio-data

# Set proper permissions
chmod 600 /home/dynamtek/aristoTEST/backend/.env
chmod 600 /home/dynamtek/aristoTEST/frontend/.env
chmod 755 /home/dynamtek/aristoTEST/backend/storage

echo "Environment configuration complete!"