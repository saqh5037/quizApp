const { Client } = require('minio');

const minioClient = new Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'aristotest',
  secretKey: 'AristoTest2024!'
});

const BUCKET_NAME = 'aristotest-videos';

async function fixMasterPlaylist(videoId) {
  // Create corrected master.m3u8 content with absolute URLs
  const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
http://192.168.1.125:9000/${BUCKET_NAME}/videos/hls/${videoId}/360p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
http://192.168.1.125:9000/${BUCKET_NAME}/videos/hls/${videoId}/480p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
http://192.168.1.125:9000/${BUCKET_NAME}/videos/hls/${videoId}/720p/playlist.m3u8
`;

  // Upload corrected master.m3u8
  await minioClient.putObject(
    BUCKET_NAME,
    `videos/hls/${videoId}/master.m3u8`,
    Buffer.from(masterContent),
    {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'public, max-age=3600'
    }
  );
  
  console.log(`Fixed master.m3u8 for video ${videoId}`);
}

// Fix all videos
async function main() {
  for (const videoId of [28, 29, 30]) {
    await fixMasterPlaylist(videoId);
  }
  console.log('All master playlists fixed!');
}

main().catch(console.error);
