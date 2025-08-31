#!/bin/bash

# Script to fix video transcription service on the server
# Run this script directly on the EC2 instance

echo "🔧 Applying video transcription fix..."

cd /var/www/aristotest-qa-backend

# Check current environment configuration
echo "📋 Current configuration:"
grep -E "GEMINI_API_KEY|USE_MOCK_TRANSCRIPTION" .env.production || echo "No relevant config found"

# Backup the current service file
echo "💾 Backing up current service file..."
sudo cp dist/services/video-transcription.service.js dist/services/video-transcription.service.js.backup-$(date +%Y%m%d-%H%M%S)

# Fix the transcription logic in the compiled JavaScript
echo "🔨 Fixing transcription logic..."

# Find and replace the faulty condition
# Original: process.env.USE_MOCK_TRANSCRIPTION !== 'false'
# Fixed: process.env.USE_MOCK_TRANSCRIPTION === 'true'
sudo sed -i "s/process\.env\.USE_MOCK_TRANSCRIPTION !== 'false'/process.env.USE_MOCK_TRANSCRIPTION === 'true'/g" dist/services/video-transcription.service.js

# Verify the change was made
echo "✅ Verifying changes..."
grep -n "USE_MOCK_TRANSCRIPTION" dist/services/video-transcription.service.js | head -5

# Update environment configuration
echo "📝 Updating environment configuration..."

# Remove any existing USE_MOCK_TRANSCRIPTION setting
sudo sed -i '/^USE_MOCK_TRANSCRIPTION=/d' .env.production

# Explicitly set to false to use real transcription
echo "USE_MOCK_TRANSCRIPTION=false" | sudo tee -a .env.production > /dev/null

# Verify GEMINI_API_KEY exists
if ! grep -q "GEMINI_API_KEY=" .env.production; then
    echo "⚠️  Warning: GEMINI_API_KEY not found in .env.production"
    echo "Please ensure GEMINI_API_KEY is properly configured"
else
    echo "✅ GEMINI_API_KEY is configured"
fi

# Restart the backend service
echo "🔄 Restarting backend service..."
sudo pm2 restart aristotest-qa-backend

# Wait for service to stabilize
sleep 3

# Check service status
echo "📊 Service status:"
sudo pm2 status aristotest-qa-backend

# Show recent logs to verify startup
echo "📜 Recent logs:"
sudo pm2 logs aristotest-qa-backend --lines 10 --nostream

echo "✅ Transcription fix applied successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Test video upload and interactive layer generation"
echo "2. Check logs: sudo pm2 logs aristotest-qa-backend"
echo "3. Monitor for any errors during transcription"
echo ""
echo "The system should now use real audio transcription via Gemini AI"
echo "instead of mock data when creating interactive video layers."