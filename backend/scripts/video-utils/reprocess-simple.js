const path = require('path');
const videoUploadService = require('./dist/services/video-upload.service').default;
const { sequelize } = require('./dist/config/database');

async function reprocessVideo(videoId) {
  try {
    console.log(`🎬 Starting reprocessing for video ${videoId}...`);
    
    // Query database directly
    const [results] = await sequelize.query(
      'SELECT * FROM videos WHERE id = :id',
      {
        replacements: { id: videoId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!results || results.length === 0) {
      console.error(`❌ Video ${videoId} not found`);
      return;
    }
    
    const video = results;
    console.log('📹 Video found:', {
      id: video.id,
      title: video.title,
      originalPath: video.original_path,
      status: video.status,
      processingProgress: video.processing_progress
    });
    
    // Check if original file exists
    const fullPath = path.join(__dirname, video.original_path);
    console.log('📂 Full path:', fullPath);
    
    // Update to processing status
    await sequelize.query(
      'UPDATE videos SET status = :status, processing_progress = :progress, error_message = NULL WHERE id = :id',
      {
        replacements: { 
          id: videoId,
          status: 'processing',
          progress: 10
        }
      }
    );
    console.log('✅ Updated status to processing');
    
    // Process the video with progress callback
    console.log('🔄 Starting video processing...');
    const result = await videoUploadService.processVideo(
      fullPath,
      videoId,
      {
        generateThumbnail: true,
        generateHLS: true,
        generateMultipleQualities: true,
        qualities: ['360p', '480p', '720p'],
        onProgress: async (percent) => {
          // Map FFmpeg progress (0-100) to our progress (10-90)
          const mappedProgress = Math.floor(10 + (percent * 0.8));
          console.log(`🔄 FFmpeg progress: ${percent}% => Mapped: ${mappedProgress}%`);
          
          // Update progress in database directly
          await sequelize.query(
            'UPDATE videos SET processing_progress = :progress WHERE id = :id',
            {
              replacements: {
                id: videoId,
                progress: mappedProgress
              }
            }
          );
          
          // Verify the update
          const [[updated]] = await sequelize.query(
            'SELECT processing_progress FROM videos WHERE id = :id',
            {
              replacements: { id: videoId },
              type: sequelize.QueryTypes.SELECT
            }
          );
          console.log(`✅ Verified progress in DB: ${updated.processing_progress}%`);
        }
      }
    );
    
    console.log('📊 Processing complete, result:', result);
    
    // Update video with results
    await sequelize.query(
      'UPDATE videos SET hls_playlist_url = :hls, thumbnail_url = :thumb, status = :status, processing_progress = :progress WHERE id = :id',
      {
        replacements: {
          id: videoId,
          hls: result.hlsPath,
          thumb: result.thumbnail,
          status: 'ready',
          progress: 100
        }
      }
    );
    
    console.log('✅ Video processed successfully!');
    console.log('🎥 HLS URL:', result.hlsPath);
    console.log('🖼️ Thumbnail:', result.thumbnail);
    
  } catch (error) {
    console.error('❌ Error processing video:', error);
    
    // Update video with error
    try {
      await sequelize.query(
        'UPDATE videos SET status = :status, error_message = :error WHERE id = :id',
        {
          replacements: {
            id: videoId,
            status: 'error',
            error: error.message
          }
        }
      );
    } catch (updateError) {
      console.error('❌ Error updating video status:', updateError);
    }
  }
  
  process.exit(0);
}

// Get video ID from command line
const videoId = process.argv[2];
if (!videoId) {
  console.error('Usage: node reprocess-simple.js <video-id>');
  process.exit(1);
}

reprocessVideo(parseInt(videoId));