import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  codec: string;
  format: string;
  fps: number;
  fileSize: number;
}

interface ProcessingOptions {
  quality: string;
  generateThumbnail: boolean;
  generateHLS: boolean;
  generatePreview: boolean;
  extractAudio: boolean;
}

interface QualityPreset {
  width: number;
  height: number;
  bitrate: string;
  audioBitrate: string;
}

class FFmpegService {
  private ffmpegPath: string;
  private qualityPresets: Record<string, QualityPreset> = {
    '360p': { width: 640, height: 360, bitrate: '800k', audioBitrate: '96k' },
    '480p': { width: 854, height: 480, bitrate: '1400k', audioBitrate: '128k' },
    '720p': { width: 1280, height: 720, bitrate: '2800k', audioBitrate: '128k' },
    '1080p': { width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '192k' }
  };

  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || '/opt/homebrew/bin/ffmpeg';
    ffmpeg.setFfmpegPath(this.ffmpegPath);
  }

  async getMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          bitrate: parseInt(metadata.format.bit_rate || '0'),
          codec: videoStream.codec_name || '',
          format: metadata.format.format_name || '',
          fps: eval(videoStream.r_frame_rate || '0'),
          fileSize: metadata.format.size || 0
        });
      });
    });
  }

  async generateThumbnail(
    inputPath: string,
    outputPath: string,
    timestamp = '00:00:01'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '1280x720'
        })
        .on('end', () => resolve(outputPath))
        .on('error', reject);
    });
  }

  async generateMultipleThumbnails(
    inputPath: string,
    outputDir: string,
    count = 5
  ): Promise<string[]> {
    const metadata = await this.getMetadata(inputPath);
    const duration = metadata.duration;
    const interval = duration / (count + 1);
    const thumbnails: string[] = [];

    for (let i = 1; i <= count; i++) {
      const timestamp = interval * i;
      const outputPath = path.join(outputDir, `thumb_${i}.jpg`);
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .seekInput(timestamp)
          .frames(1)
          .size('1280x720')
          .output(outputPath)
          .on('end', () => {
            thumbnails.push(outputPath);
            resolve();
          })
          .on('error', reject)
          .run();
      });
    }

    return thumbnails;
  }

  async convertToHLS(
    inputPath: string,
    outputDir: string,
    quality = '720p',
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const preset = this.qualityPresets[quality];
    const playlistPath = path.join(outputDir, 'playlist.m3u8');

    await mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-codec:v libx264',
          '-codec:a aac',
          `-b:v ${preset.bitrate}`,
          `-b:a ${preset.audioBitrate}`,
          `-vf scale=${preset.width}:${preset.height}`,
          '-hls_time 10',
          '-hls_list_size 0',
          '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
          '-f hls'
        ])
        .output(playlistPath)
        .on('end', () => resolve(playlistPath))
        .on('error', reject)
        .on('progress', (progress) => {
          const percent = Math.round(progress.percent || 0);
          console.log(`Processing ${quality}: ${percent}% done`);
          if (onProgress) {
            onProgress(percent);
          }
        })
        .run();
    });
  }

  async generateMultiQualityHLS(
    inputPath: string,
    outputDir: string,
    qualities: string[] = ['360p', '480p', '720p'],
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    const playlists: Array<{ quality: string; path: string; bandwidth: number }> = [];

    // Process each quality
    let currentQualityIndex = 0;
    for (const quality of qualities) {
      const qualityDir = path.join(outputDir, quality);
      
      // Calculate progress for this quality
      const progressPerQuality = 100 / qualities.length;
      const startProgress = currentQualityIndex * progressPerQuality;
      
      const playlistPath = await this.convertToHLS(
        inputPath, 
        qualityDir, 
        quality,
        (localProgress) => {
          if (onProgress) {
            // Calculate overall progress
            const overallProgress = startProgress + (localProgress * progressPerQuality / 100);
            onProgress(Math.round(overallProgress));
          }
        }
      );
      
      const preset = this.qualityPresets[quality];
      
      playlists.push({
        quality,
        path: `./${quality}/playlist.m3u8`,
        bandwidth: parseInt(preset.bitrate) * 1000
      });
      
      currentQualityIndex++;
    }

    // Create master playlist
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';
    for (const playlist of playlists) {
      const preset = this.qualityPresets[playlist.quality];
      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${playlist.bandwidth},RESOLUTION=${preset.width}x${preset.height}\n`;
      masterContent += `${playlist.path}\n`;
    }

    await fs.promises.writeFile(masterPlaylistPath, masterContent);
    return masterPlaylistPath;
  }

  async transcodeVideo(
    inputPath: string,
    outputPath: string,
    quality = '720p'
  ): Promise<string> {
    const preset = this.qualityPresets[quality];

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-codec:v libx264',
          '-codec:a aac',
          `-b:v ${preset.bitrate}`,
          `-b:a ${preset.audioBitrate}`,
          `-vf scale=${preset.width}:${preset.height}`,
          '-preset medium',
          '-crf 23',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .on('progress', (progress) => {
          console.log(`Transcoding: ${progress.percent}% done`);
        })
        .run();
    });
  }

  async extractAudio(
    inputPath: string,
    outputPath: string,
    format = 'mp3'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec(format === 'mp3' ? 'libmp3lame' : 'aac')
        .audioBitrate('128k')
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  async generatePreviewClip(
    inputPath: string,
    outputPath: string,
    startTime = 0,
    duration = 30
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .duration(duration)
        .outputOptions([
          '-codec:v libx264',
          '-codec:a aac',
          '-b:v 1000k',
          '-b:a 128k',
          '-vf scale=854:480',
          '-preset fast',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  async addWatermark(
    inputPath: string,
    outputPath: string,
    watermarkPath: string,
    position = 'bottomright'
  ): Promise<string> {
    const positions: Record<string, string> = {
      topleft: '10:10',
      topright: 'main_w-overlay_w-10:10',
      bottomleft: '10:main_h-overlay_h-10',
      bottomright: 'main_w-overlay_w-10:main_h-overlay_h-10',
      center: '(main_w-overlay_w)/2:(main_h-overlay_h)/2'
    };

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .input(watermarkPath)
        .complexFilter([
          {
            filter: 'overlay',
            options: positions[position] || positions.bottomright
          }
        ])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  async concatenateVideos(
    inputPaths: string[],
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      inputPaths.forEach(path => {
        command.input(path);
      });

      command
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .mergeToFile(outputPath);
    });
  }

  async splitVideo(
    inputPath: string,
    outputDir: string,
    segmentDuration = 300 // 5 minutes
  ): Promise<string[]> {
    const outputPattern = path.join(outputDir, 'segment_%03d.mp4');

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c copy',
          '-map 0',
          '-segment_time', segmentDuration.toString(),
          '-f segment',
          '-reset_timestamps 1'
        ])
        .output(outputPattern)
        .on('end', async () => {
          const files = await fs.promises.readdir(outputDir);
          const segments = files
            .filter(f => f.startsWith('segment_'))
            .map(f => path.join(outputDir, f));
          resolve(segments);
        })
        .on('error', reject)
        .run();
    });
  }

  async optimizeForWeb(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-codec:v libx264',
          '-codec:a aac',
          '-crf 23',
          '-preset medium',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
          '-profile:v baseline',
          '-level 3.0'
        ])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  async getVideoFrameRate(inputPath: string): Promise<number> {
    const metadata = await this.getMetadata(inputPath);
    return metadata.fps;
  }

  async changeVideoSpeed(
    inputPath: string,
    outputPath: string,
    speed = 1.0
  ): Promise<string> {
    const videoFilter = speed !== 1.0 ? `setpts=${1/speed}*PTS` : null;
    const audioFilter = speed !== 1.0 ? `atempo=${speed}` : null;

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath);

      if (videoFilter) {
        command.videoFilters(videoFilter);
      }
      if (audioFilter && speed >= 0.5 && speed <= 2.0) {
        command.audioFilters(audioFilter);
      }

      command
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  async generateGif(
    inputPath: string,
    outputPath: string,
    startTime = 0,
    duration = 5,
    width = 480
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .duration(duration)
        .outputOptions([
          `-vf fps=10,scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
          '-loop 0'
        ])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
}

export default new FFmpegService();