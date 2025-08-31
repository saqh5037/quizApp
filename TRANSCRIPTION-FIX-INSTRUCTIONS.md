# Video Transcription Fix Instructions

## Problem Identified
The interactive video layer generation is using **mock transcription data** instead of the **actual audio transcription** from videos. This is happening because of an incorrect condition in the transcription service.

## The Issue
In the file `/var/www/aristotest-qa-backend/dist/services/video-transcription.service.js`, the condition:
```javascript
const useMockTranscription = !process.env.GEMINI_API_KEY || (process.env.USE_MOCK_TRANSCRIPTION !== 'false');
```

This logic means mock transcription is used unless `USE_MOCK_TRANSCRIPTION` is explicitly set to `'false'`, which is backwards.

## The Fix
The condition should be:
```javascript
const useMockTranscription = !process.env.GEMINI_API_KEY || (process.env.USE_MOCK_TRANSCRIPTION === 'true');
```

This way, real transcription is used when `GEMINI_API_KEY` exists, unless mock is explicitly requested.

## How to Apply the Fix

### Option 1: Automatic Script (Recommended)
1. SSH into your EC2 instance:
   ```bash
   ssh -i your-key.pem ec2-user@18.206.119.156
   ```

2. Create the fix script:
   ```bash
   nano /tmp/apply-transcription-fix.sh
   ```

3. Copy the contents of `apply-transcription-fix.sh` into the file

4. Make it executable and run:
   ```bash
   chmod +x /tmp/apply-transcription-fix.sh
   sudo /tmp/apply-transcription-fix.sh
   ```

### Option 2: Manual Fix
1. SSH into your EC2 instance
2. Navigate to the backend directory:
   ```bash
   cd /var/www/aristotest-qa-backend
   ```

3. Edit the compiled JavaScript file:
   ```bash
   sudo nano dist/services/video-transcription.service.js
   ```

4. Find the line (around line 654 in the source):
   ```javascript
   const useMockTranscription = !process.env.GEMINI_API_KEY || (process.env.USE_MOCK_TRANSCRIPTION !== 'false');
   ```

5. Change it to:
   ```javascript
   const useMockTranscription = !process.env.GEMINI_API_KEY || (process.env.USE_MOCK_TRANSCRIPTION === 'true');
   ```

6. Update environment configuration:
   ```bash
   echo "USE_MOCK_TRANSCRIPTION=false" | sudo tee -a .env.production
   ```

7. Restart the service:
   ```bash
   sudo pm2 restart aristotest-qa-backend
   ```

## Verification
After applying the fix:

1. Check the logs:
   ```bash
   sudo pm2 logs aristotest-qa-backend --lines 50
   ```

2. Test interactive video generation:
   - Upload a video or use an existing one
   - Generate an interactive layer
   - Look for these log messages:
     - ✅ Good: "GEMINI_API_KEY exists: true"
     - ✅ Good: "Using mock transcription?: false"
     - ✅ Good: "Transcribing audio..."
     - ❌ Bad: "Using enhanced mock transcription for development..."

3. The generated questions should now be based on the actual video content, not generic mock data.

## Expected Results
- Questions will be contextually relevant to the video content
- Timestamps will align with actual content in the video
- No more generic "historia" or test data in the transcriptions
- Proper Spanish transcription for Spanish videos
- Accurate medical/technical terminology for specialized content

## Troubleshooting
If the fix doesn't work:
1. Verify GEMINI_API_KEY is set: `grep GEMINI_API_KEY .env.production`
2. Check FFmpeg is working: `ffmpeg -version`
3. Ensure MinIO is accessible for video storage
4. Review full logs: `sudo pm2 logs aristotest-qa-backend --lines 200`

## Long-term Solution
For future deployments, update the source code in:
`backend/src/services/video-transcription.service.ts` (line 654)

Then rebuild and redeploy the application.