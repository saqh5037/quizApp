#!/bin/bash

# Clean deployment script for AWS QA
# This ensures everything works without crashes

set -e

# Configuration
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SSH_USER="dynamtek"
SSH_HOST="ec2-52-55-189-120.compute-1.amazonaws.com"
REMOTE_DIR="/home/dynamtek/aristotest"

echo "🚀 Starting clean deployment to AWS QA..."

# Step 1: Create deployment package
echo "📦 Creating deployment package..."
cd /Users/samuelquiroz/Documents/proyectos/quiz-app

# Backend
cd backend
tar -czf /tmp/backend-clean.tar.gz dist package.json package-lock.json

# Frontend  
cd ../frontend
tar -czf /tmp/frontend-clean.tar.gz dist

cd ..

# Step 2: Create directory on server
echo "📁 Creating directories on server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" "mkdir -p $REMOTE_DIR/backend $REMOTE_DIR/frontend"

# Step 3: Copy files
echo "📤 Uploading files..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no /tmp/backend-clean.tar.gz "$SSH_USER@$SSH_HOST:$REMOTE_DIR/backend/"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no /tmp/frontend-clean.tar.gz "$SSH_USER@$SSH_HOST:$REMOTE_DIR/frontend/"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no .env.qa "$SSH_USER@$SSH_HOST:$REMOTE_DIR/backend/.env"

# Step 4: Extract and install on server
echo "🔧 Installing on server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'REMOTE'
cd /home/dynamtek/aristotest/backend
tar -xzf backend-clean.tar.gz
npm install --production

cd /home/dynamtek/aristotest/frontend
tar -xzf frontend-clean.tar.gz

# Create PM2 ecosystem file
cat > /home/dynamtek/aristotest/ecosystem.config.js << 'PM2'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: '/home/dynamtek/aristotest/backend/dist/server.js',
    cwd: '/home/dynamtek/aristotest/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_HOST: 'ec2-3-91-26-178.compute-1.amazonaws.com',
      DB_PORT: 5432,
      DB_NAME: 'aristotest',
      DB_USER: 'labsis',
      DB_PASSWORD: ',U8x=]N02SX4',
      JWT_SECRET: 'aristotest-jwt-secret-qa-2024',
      JWT_REFRESH_SECRET: 'aristotest-jwt-refresh-secret-qa-2024',
      CORS_ORIGIN: '*',
      GEMINI_API_KEY: 'AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_ACCESS_KEY: 'aristotest',
      MINIO_SECRET_KEY: 'AristoTest2024!',
      MINIO_USE_SSL: false
    },
    error_file: '/home/dynamtek/aristotest/logs/error.log',
    out_file: '/home/dynamtek/aristotest/logs/out.log',
    merge_logs: true,
    time: true
  }]
}
PM2

# Create logs directory
mkdir -p /home/dynamtek/aristotest/logs

# Start with PM2
pm2 start /home/dynamtek/aristotest/ecosystem.config.js
pm2 save

echo "✅ Backend started with PM2"
REMOTE

echo "✅ Deployment complete!"
echo ""
echo "📋 Access URLs:"
echo "Frontend: http://$SSH_HOST"
echo "Backend: http://$SSH_HOST:3001"
echo ""
echo "To check status: ssh -i $SSH_KEY $SSH_USER@$SSH_HOST 'pm2 status'"