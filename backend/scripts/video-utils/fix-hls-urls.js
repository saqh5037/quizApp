const { Client } = require('minio');
const fs = require('fs').promises;

const minioClient = new Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'aristotest',
  secretKey: 'AristoTest2024!'
});

const BUCKET_NAME = 'aristotest-videos';
const VIDEO_ID = process.argv[2] || '32';
const BASE_URL = 'http://localhost:9000/aristotest-videos';

async function updateMasterPlaylist() {
  const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
${BASE_URL}/videos/hls/${VIDEO_ID}/360p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
${BASE_URL}/videos/hls/${VIDEO_ID}/480p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
${BASE_URL}/videos/hls/${VIDEO_ID}/720p/playlist.m3u8
`;

  await minioClient.putObject(
    BUCKET_NAME,
    `videos/hls/${VIDEO_ID}/master.m3u8`,
    masterContent,
    { 'Content-Type': 'application/vnd.apple.mpegurl' }
  );
  
  console.log(`Updated master.m3u8 for video ${VIDEO_ID}`);
}

async function updateQualityPlaylist(quality) {
  // Read the local playlist to get segment count
  const localPath = `/Users/samuelquiroz/Documents/proyectos/quiz-app/backend/storage/processed/${VIDEO_ID}/hls/${quality}/playlist.m3u8`;
  const localContent = await fs.readFile(localPath, 'utf-8');
  
  // Parse and update segment URLs
  const lines = localContent.split('\n');
  const updatedLines = lines.map(line => {
    if (line.endsWith('.ts')) {
      return `${BASE_URL}/videos/hls/${VIDEO_ID}/${quality}/${line}`;
    }
    return line;
  });
  
  const updatedContent = updatedLines.join('\n');
  
  await minioClient.putObject(
    BUCKET_NAME,
    `videos/hls/${VIDEO_ID}/${quality}/playlist.m3u8`,
    updatedContent,
    { 'Content-Type': 'application/vnd.apple.mpegurl' }
  );
  
  console.log(`Updated ${quality}/playlist.m3u8 for video ${VIDEO_ID}`);
}

async function main() {
  try {
    await updateMasterPlaylist();
    await updateQualityPlaylist('360p');
    await updateQualityPlaylist('480p');
    await updateQualityPlaylist('720p');
    
    console.log(`\nAll playlists updated for video ${VIDEO_ID}`);
    console.log(`Video URL: ${BASE_URL}/videos/hls/${VIDEO_ID}/master.m3u8`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();