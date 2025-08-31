#!/bin/bash

# Fix transcription service to use real audio instead of mock data

echo "🔧 Fixing video transcription service..."

# SSH connection details
SSH_KEY="$HOME/.ssh/sam-demo-aws.pem"
EC2_USER="ec2-user"
EC2_HOST="18.206.119.156"

# Create the fix script on the server
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
cd /var/www/aristotest-qa-backend

# Backup the current file
sudo cp dist/services/video-transcription.service.js dist/services/video-transcription.service.js.backup

# Apply the fix to the compiled JavaScript file
# Change the condition to use real transcription when GEMINI_API_KEY exists
sudo sed -i "s/process\.env\.USE_MOCK_TRANSCRIPTION !== 'false'/process.env.USE_MOCK_TRANSCRIPTION === 'true'/g" dist/services/video-transcription.service.js

# Also ensure USE_MOCK_TRANSCRIPTION is not set to true in the environment
if grep -q "USE_MOCK_TRANSCRIPTION=true" .env.production; then
    sudo sed -i '/USE_MOCK_TRANSCRIPTION=/d' .env.production
fi

# Add USE_MOCK_TRANSCRIPTION=false to ensure real transcription is used
echo "USE_MOCK_TRANSCRIPTION=false" | sudo tee -a .env.production > /dev/null

# Restart the backend service
sudo pm2 restart aristotest-qa-backend

echo "✅ Transcription service fixed!"
echo "🔍 Checking service status..."
sudo pm2 status aristotest-qa-backend

EOF

echo "✅ Fix applied successfully!"