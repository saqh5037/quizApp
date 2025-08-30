const videoUploadService = require('./dist/services/video-upload.service').default;
const { Video } = require('./dist/models');

async function processVideo34() {
  try {
    console.log('Starting processing for video 34...');
    
    const video = await Video.findByPk(34);
    if (!video) {
      console.log('Video 34 not found');
      return;
    }
    
    console.log('Video found:', video.title);
    console.log('Original path:', video.originalPath);
    
    // Update to processing
    await video.update({ 
      status: 'processing',
      processingProgress: 10 
    });
    
    // Process the video
    const result = await videoUploadService.processVideo(
      video.originalPath,
      34,
      {
        generateThumbnail: true,
        generateHLS: true,
        generateMultipleQualities: true,
        qualities: ['360p', '480p', '720p']
      }
    );
    
    console.log('Processing result:', result);
    
    // Update video with results
    await video.update({
      hlsPlaylistUrl: result.hlsPath,
      thumbnailUrl: result.thumbnail,
      status: 'ready',
      processingProgress: 100
    });
    
    console.log('Video 34 processed successfully!');
    console.log('HLS URL:', result.hlsPath);
    console.log('Thumbnail:', result.thumbnail);
    
  } catch (error) {
    console.error('Error processing video 34:', error);
    
    // Update video with error
    const video = await Video.findByPk(34);
    if (video) {
      await video.update({
        status: 'error',
        errorMessage: error.message
      });
    }
  }
  
  process.exit(0);
}

processVideo34();