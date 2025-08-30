const { Client } = require('minio');
const path = require('path');

const minioClient = new Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'aristotest',
  secretKey: 'AristoTest2024!'
});

const BUCKET_NAME = 'aristotest-videos';

async function fixPlaylist(videoId, quality) {
  try {
    // Download existing playlist
    const stream = await minioClient.getObject(BUCKET_NAME, `videos/hls/${videoId}/${quality}/playlist.m3u8`);
    let data = '';
    stream.on('data', chunk => { data += chunk; });
    
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    
    // Replace relative URLs with absolute URLs
    const lines = data.split('\n');
    const fixedLines = lines.map(line => {
      if (line.endsWith('.ts')) {
        return `http://192.168.1.125:9000/${BUCKET_NAME}/videos/hls/${videoId}/${quality}/${line}`;
      }
      return line;
    });
    
    const fixedContent = fixedLines.join('\n');
    
    // Upload fixed playlist
    await minioClient.putObject(
      BUCKET_NAME,
      `videos/hls/${videoId}/${quality}/playlist.m3u8`,
      Buffer.from(fixedContent),
      {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=3600'
      }
    );
    
    console.log(`Fixed ${quality} playlist for video ${videoId}`);
  } catch (error) {
    console.error(`Error fixing ${quality} playlist for video ${videoId}:`, error.message);
  }
}

async function main() {
  const videos = [28, 29, 30];
  const qualities = ['360p', '480p', '720p'];
  
  for (const videoId of videos) {
    for (const quality of qualities) {
      await fixPlaylist(videoId, quality);
    }
  }
  
  console.log('All playlists fixed!');
}

main().catch(console.error);
