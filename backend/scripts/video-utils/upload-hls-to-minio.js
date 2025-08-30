const { Client } = require('minio');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// MinIO configuration
const minioClient = new Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'aristotest',
  secretKey: 'AristoTest2024!'
});

const BUCKET_NAME = 'aristotest-videos';
// Get video ID from command line argument
const VIDEO_ID = process.argv[2] ? parseInt(process.argv[2]) : 32;

async function uploadFile(localPath, minioPath) {
  const fileStream = fs.createReadStream(localPath);
  const fileStat = await stat(localPath);
  
  let contentType = 'application/octet-stream';
  if (minioPath.endsWith('.m3u8')) {
    contentType = 'application/vnd.apple.mpegurl';
  } else if (minioPath.endsWith('.ts')) {
    contentType = 'video/MP2T';
  } else if (minioPath.endsWith('.jpg')) {
    contentType = 'image/jpeg';
  }
  
  console.log(`Uploading ${localPath} to ${minioPath} (${contentType})`);
  
  await minioClient.putObject(
    BUCKET_NAME,
    minioPath,
    fileStream,
    fileStat.size,
    {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    }
  );
}

async function uploadDirectory(localDir, minioPrefix) {
  const files = await readdir(localDir);
  
  for (const file of files) {
    const filePath = path.join(localDir, file);
    const stats = await stat(filePath);
    
    if (stats.isDirectory()) {
      await uploadDirectory(filePath, path.join(minioPrefix, file));
    } else {
      const minioPath = path.join(minioPrefix, file);
      await uploadFile(filePath, minioPath);
    }
  }
}

async function main() {
  try {
    // Check if bucket exists
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`Bucket ${BUCKET_NAME} created.`);
    }
    
    const baseDir = `/Users/samuelquiroz/Documents/proyectos/quiz-app/backend/storage/processed/${VIDEO_ID}`;
    
    // Upload HLS files
    const hlsDir = path.join(baseDir, 'hls');
    console.log('Uploading HLS files...');
    await uploadDirectory(hlsDir, `videos/hls/${VIDEO_ID}`);
    
    // Upload thumbnail
    const thumbnailPath = path.join(baseDir, 'thumbnail.jpg');
    if (fs.existsSync(thumbnailPath)) {
      await uploadFile(thumbnailPath, `videos/thumbnails/${VIDEO_ID}/thumbnail.jpg`);
    }
    
    // Set bucket policy for public read access
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetBucketLocation', 's3:ListBucket'],
          Resource: [`arn:aws:s3:::${BUCKET_NAME}`]
        },
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
        }
      ]
    };
    
    await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
    
    console.log('Upload complete!');
    console.log(`HLS URL: http://localhost:9000/${BUCKET_NAME}/videos/hls/${VIDEO_ID}/master.m3u8`);
    console.log(`Thumbnail URL: http://localhost:9000/${BUCKET_NAME}/videos/thumbnails/${VIDEO_ID}/thumbnail.jpg`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
