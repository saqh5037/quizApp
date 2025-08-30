const { Video } = require('./dist/models');
const videoUploadService = require('./dist/services/video-upload.service').default;
const ffmpegService = require('./dist/services/ffmpeg.service').default;
const minioService = require('./dist/services/minio.service').default;
const path = require('path');

async function reprocessVideo(videoId) {
  try {
    console.log(`Starting reprocessing for video ${videoId}`);
    
    // Find video
    const video = await Video.findByPk(videoId);
    if (!video) {
      console.error(`Video ${videoId} not found`);
      return;
    }

    console.log(`Found video: ${video.title}`);
    
    // Reset status
    await video.update({
      status: 'processing',
      processingProgress: 0,
      errorMessage: null
    });

    // Get video path - check if it's a local file or MinIO
    const videoPath = video.originalPath;
    console.log(`Video path: ${videoPath}`);
    
    let tempPath;
    const fs = require('fs').promises;
    
    // Check if it's a local file
    const localPath = path.join(__dirname, videoPath);
    try {
      await fs.access(localPath);
      console.log(`Using local file: ${localPath}`);
      tempPath = localPath;
    } catch (localError) {
      console.log('Local file not found, checking MinIO...');
      
      // Check if file exists in MinIO
      const minioPath = videoPath.replace('storage/', '');
      console.log(`Checking MinIO path: ${minioPath}`);
      
      try {
        const stat = await minioService.statObject('aristotest-videos', minioPath);
        console.log(`File exists in MinIO: ${stat.size} bytes`);
        
        // Download video from MinIO to temp location
        tempPath = `/tmp/video_${videoId}_${Date.now()}.mp4`;
        const downloadUrl = await minioService.getPresignedUrl('aristotest-videos', minioPath);
        console.log(`Downloading video to: ${tempPath}`);
        
        // Use curl to download
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        await execAsync(`curl -o "${tempPath}" "${downloadUrl}"`);
        console.log('Video downloaded successfully');
      } catch (error) {
        console.error('File not found in MinIO:', error.message);
        await video.update({
          status: 'error',
          errorMessage: 'File not found in storage'
        });
        return;
      }
    }
    
    // Update progress
    await video.update({ processingProgress: 10 });
    
    // Get video metadata
    console.log('Getting video metadata...');
    const metadata = await ffmpegService.getMetadata(tempPath);
    console.log(`Video duration: ${metadata.duration}s, size: ${metadata.fileSize} bytes`);
    
    await video.update({ 
      processingProgress: 20,
      durationSeconds: Math.round(metadata.duration),
      fileSizeBytes: metadata.fileSize
    });
    
    // Generate thumbnail
    console.log('Generating thumbnail...');
    const thumbnailPath = `/tmp/thumbnail_${videoId}.jpg`;
    await ffmpegService.generateThumbnail(tempPath, thumbnailPath);
    
    // Upload thumbnail to MinIO
    const minioThumbPath = `videos/thumbnails/${videoId}/thumbnail.jpg`;
    await minioService.uploadFile(thumbnailPath, minioThumbPath);
    const thumbnailUrl = minioService.getPublicUrl(minioThumbPath);
    
    await video.update({ 
      processingProgress: 40,
      thumbnailUrl: thumbnailUrl
    });
    console.log(`Thumbnail generated: ${thumbnailUrl}`);
    
    // Generate HLS streams using processVideo service for better progress tracking
    console.log('Generating HLS streams with progress tracking...');
    
    const result = await videoUploadService.processVideo(
      tempPath,
      videoId,
      {
        generateThumbnail: false, // Already generated
        generateHLS: true,
        generateMultipleQualities: true,
        qualities: ['360p', '480p', '720p'],
        onProgress: async (percent) => {
          // Map FFmpeg progress (0-100) to our progress (40-90)
          const mappedProgress = Math.floor(40 + (percent * 0.5));
          console.log(`🔄 FFmpeg progress: ${percent}% => Mapped: ${mappedProgress}%`);
          
          // Update progress in database
          await video.update({ processingProgress: mappedProgress });
          
          // Log the actual DB value
          await video.reload();
          console.log(`✅ Verified progress in DB: ${video.processingProgress}%`);
        }
      }
    );
    
    // Use the result from processVideo
    console.log('Processing result:', result);
    
    await video.update({ 
      processingProgress: 90,
      hlsPlaylistUrl: result.hlsPath || `videos/hls/${videoId}/master.m3u8`,
      processedPath: `videos/hls/${videoId}/`
    });
    
    console.log(`HLS playlist generated: ${result.hlsPath}`);
    
    // Final update
    await video.update({
      status: 'ready',
      processingProgress: 100,
      publishedAt: new Date()
    });
    
    // Clean up temp files (only if we downloaded from MinIO)
    if (tempPath.startsWith('/tmp/')) {
      console.log('Cleaning up temp files...');
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      await execAsync(`rm -rf ${tempPath} ${thumbnailPath} /tmp/hls_${videoId}`);
    }
    
    console.log(`Video ${videoId} processed successfully!`);
    
  } catch (error) {
    console.error('Error processing video:', error);
    
    // Update video with error
    await Video.update(
      {
        status: 'error',
        errorMessage: error.message,
        processingProgress: 0
      },
      { where: { id: videoId } }
    );
  }
}

// Run if called directly
if (require.main === module) {
  const videoId = process.argv[2];
  if (!videoId) {
    console.error('Usage: node reprocess-video.js <videoId>');
    process.exit(1);
  }
  
  reprocessVideo(parseInt(videoId))
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { reprocessVideo };