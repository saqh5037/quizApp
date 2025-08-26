import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import { apiConfig } from '../config/api.config';
import { useAuthStore } from '../stores/authStore';

interface VideoPlayerProps {
  videoId: number;
  src: string;
  poster?: string;
  title?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  autoplay?: boolean;
  controls?: boolean;
  fluid?: boolean;
  aspectRatio?: string;
  startTime?: number;
}

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  currentTime: () => number | undefined;
  duration: () => number | undefined;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({
  videoId,
  src,
  poster,
  title,
  onTimeUpdate,
  onEnded,
  onError,
  autoplay = false,
  controls = true,
  fluid = true,
  aspectRatio = '16:9',
  startTime = 0
}, ref) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const { accessToken } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    play: () => {
      if (playerRef.current && !playerRef.current.paused()) {
        return;
      }
      playerRef.current?.play();
    },
    pause: () => {
      if (playerRef.current && playerRef.current.paused()) {
        return;
      }
      playerRef.current?.pause();
    },
    currentTime: () => playerRef.current?.currentTime(),
    duration: () => playerRef.current?.duration()
  }), []);

  useEffect(() => {
    // Initialize Video.js player
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video');
      videoElement.classList.add('video-js', 'vjs-big-play-centered', 'vjs-theme-city');
      videoRef.current.appendChild(videoElement);

      const player = videojs(videoElement, {
        autoplay,
        controls,
        fluid,
        aspectRatio,
        responsive: true,
        preload: 'auto',
        poster,
        sources: [{
          src,
          type: 'video/mp4'  // Force MP4 type for now
        }],
        controlBar: {
          volumePanel: {
            inline: false
          },
          currentTimeDisplay: true,
          timeDivider: true,
          durationDisplay: true,
          remainingTimeDisplay: false,
          playbackRateMenuButton: {
            playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2]
          },
          fullscreenToggle: true,
          pictureInPictureToggle: true
        },
        userActions: {
          hotkeys: true
        }
      });

      // Add authentication header if needed
      if (accessToken && src.includes(apiConfig.baseURL)) {
        player.ready(() => {
          const tech = player.tech({ IWillNotUseThisInPlugins: true });
          if (tech && tech.el_) {
            tech.el_.addEventListener('loadstart', () => {
              if (tech.el_ && 'setRequestHeader' in tech.el_) {
                (tech.el_ as any).setRequestHeader('Authorization', `Bearer ${accessToken}`);
              }
            });
          }
        });
      }

      // Set up event listeners
      player.on('ready', () => {
        setIsReady(true);
        if (startTime > 0) {
          player.currentTime(startTime);
        }
      });

      player.on('timeupdate', () => {
        if (onTimeUpdate && player.duration() > 0) {
          onTimeUpdate(player.currentTime() || 0, player.duration() || 0);
        }
      });

      player.on('ended', () => {
        if (onEnded) {
          onEnded();
        }
      });

      player.on('error', (error) => {
        console.error('Video player error:', error);
        if (onError) {
          onError(error);
        }
      });

      // Keyboard shortcuts
      player.on('keydown', (event: KeyboardEvent) => {
        const currentTime = player.currentTime() || 0;
        const duration = player.duration() || 0;
        
        switch(event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            player.currentTime(Math.max(0, currentTime - 10));
            break;
          case 'ArrowRight':
            event.preventDefault();
            player.currentTime(Math.min(duration, currentTime + 10));
            break;
          case 'ArrowUp':
            event.preventDefault();
            player.volume(Math.min(1, (player.volume() || 0) + 0.1));
            break;
          case 'ArrowDown':
            event.preventDefault();
            player.volume(Math.max(0, (player.volume() || 0) - 0.1));
            break;
          case ' ':
          case 'k':
            event.preventDefault();
            if (player.paused()) {
              player.play();
            } else {
              player.pause();
            }
            break;
          case 'f':
            event.preventDefault();
            if (!player.isFullscreen()) {
              player.requestFullscreen();
            } else {
              player.exitFullscreen();
            }
            break;
          case 'm':
            event.preventDefault();
            player.muted(!player.muted());
            break;
          case '0':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            event.preventDefault();
            const percent = parseInt(event.key) * 0.1;
            player.currentTime(duration * percent);
            break;
        }
      });

      playerRef.current = player;
    }

    // Update source if it changes
    if (playerRef.current && isReady) {
      const currentSrc = playerRef.current.currentSrc();
      if (currentSrc !== src) {
        playerRef.current.src({
          src,
          type: 'video/mp4'  // Force MP4 type for now
        });
      }
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
        setIsReady(false);
      }
    };
  }, [src, poster, autoplay, controls, fluid, aspectRatio, accessToken, startTime]);

  // Save progress periodically
  useEffect(() => {
    if (!isReady || !onTimeUpdate) return;

    const saveProgress = () => {
      if (playerRef.current && !playerRef.current.paused()) {
        const currentTime = playerRef.current.currentTime() || 0;
        const duration = playerRef.current.duration() || 0;
        
        if (duration > 0) {
          // Save progress to backend
          fetch(`${apiConfig.baseURL}/videos/${videoId}/progress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              currentTime,
              duration
            })
          }).catch(err => console.error('Error saving progress:', err));
        }
      }
    };

    // Save progress every 10 seconds
    const interval = setInterval(saveProgress, 10000);

    // Save progress when page is about to unload
    const handleBeforeUnload = () => {
      saveProgress();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveProgress(); // Save one last time on unmount
    };
  }, [isReady, videoId, accessToken, onTimeUpdate]);

  return (
    <div className="video-player-wrapper">
      <style>
        {`
          .video-js {
            width: 100%;
            height: 100%;
          }
          .vjs-theme-city {
            --vjs-theme-city--primary: rgb(249, 115, 22);
            --vjs-theme-city--secondary: rgb(251, 146, 60);
          }
          .vjs-poster {
            background-size: cover;
          }
          .vjs-big-play-button {
            background-color: rgba(249, 115, 22, 0.8);
            border: none;
            border-radius: 50%;
            font-size: 4em;
          }
          .vjs-big-play-button:hover {
            background-color: rgba(249, 115, 22, 1);
          }
          .vjs-control-bar {
            background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
          }
          .vjs-play-progress,
          .vjs-volume-level {
            background-color: rgb(249, 115, 22);
          }
          .vjs-load-progress {
            background-color: rgba(255, 255, 255, 0.3);
          }
          .vjs-remaining-time {
            display: none;
          }
          .vjs-playback-rate .vjs-menu-button-popup .vjs-menu {
            width: 4em;
            left: -1em;
          }
        `}
      </style>
      <div ref={videoRef} className="w-full" />
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;