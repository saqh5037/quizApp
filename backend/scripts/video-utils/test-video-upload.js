const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJhZG1pbkBhcmlzdG90ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NjA2MDI4OSwiZXhwIjoxNzU2MTQ2Njg5fQ.M6A9amWXLR-XwBc1avvyYdjhVeNUH_2PbeRoullqp6Y';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// Use the real test video file
const getTestFile = () => {
  const testFile = path.join(__dirname, 'test-sample.mp4');
  if (!fs.existsSync(testFile)) {
    throw new Error('Test video file not found. Please create test-sample.mp4 first.');
  }
  return testFile;
};

async function testVideoUpload() {
  try {
    const testFile = getTestFile();
    const stats = fs.statSync(testFile);
    const fileSize = stats.size;
    
    console.log('1. Initializing upload...');
    
    // Initialize upload
    const initResponse = await fetch(`${API_URL}/videos/upload/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        filename: 'test-video.mp4',
        fileSize: fileSize,
        mimeType: 'video/mp4',
        metadata: {
          title: 'Test Upload',
          description: 'Testing chunked upload',
          categoryId: 1,
          tags: ['test'],
          language: 'es',
          isPublic: false,
          allowDownload: false
        }
      })
    });

    if (!initResponse.ok) {
      const error = await initResponse.text();
      throw new Error(`Init failed: ${error}`);
    }

    const { uploadId, videoId } = await initResponse.json();
    console.log(`   Upload ID: ${uploadId}`);
    console.log(`   Video ID: ${videoId}`);

    // Upload chunks
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    console.log(`\n2. Uploading ${totalChunks} chunks...`);

    const fileBuffer = fs.readFileSync(testFile);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = fileBuffer.slice(start, end);

      const formData = new FormData();
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', i.toString());
      formData.append('chunk', chunk, {
        filename: `chunk-${i}`,
        contentType: 'application/octet-stream'
      });

      const chunkResponse = await fetch(`${API_URL}/videos/upload/chunk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!chunkResponse.ok) {
        const error = await chunkResponse.text();
        throw new Error(`Chunk ${i} upload failed: ${error}`);
      }

      const result = await chunkResponse.json();
      console.log(`   Chunk ${i + 1}/${totalChunks} uploaded: ${result.received ? 'OK' : 'FAILED'}`);
    }

    // Complete upload
    console.log('\n3. Completing upload...');
    const completeResponse = await fetch(`${API_URL}/videos/upload/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ uploadId })
    });

    if (!completeResponse.ok) {
      const error = await completeResponse.text();
      throw new Error(`Complete failed: ${error}`);
    }

    const completeResult = await completeResponse.json();
    console.log('   Upload completed successfully!');
    console.log('   Video ID:', completeResult.videoId);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testVideoUpload();