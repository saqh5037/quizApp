import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  RiArrowLeftLine, 
  RiPlayCircleLine,
  RiFullscreenLine,
  RiLoader4Line,
  RiLockLine,
  RiCheckLine,
  RiTimeLine,
  RiBookOpenLine,
  RiAwardLine,
  RiQrCodeLine
} from 'react-icons/ri';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { apiConfig } from '../config/api.config';
import { useAuthStore } from '../stores/authStore';
import VideoPlayer from '../components/VideoPlayer';
import VideoShareModal from '../components/video/VideoShareModal';

interface Video {
  id: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  status: string;
  viewCount: number;
  publishedAt?: string;
  streamUrl?: string;
  progress?: {
    lastPositionSeconds: number;
    completionPercentage: number;
    completed: boolean;
  };
  category?: {
    name: string;
  };
  creator?: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  relatedVideos?: Array<{
    id: number;
    title: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
  }>;
}

export default function VideoPlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Check if user is admin or teacher
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const canManage = isAdmin || isTeacher;

  useEffect(() => {
    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    try {
      const headers: HeadersInit = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${apiConfig.baseURL}/videos/${id}`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Video no encontrado');
          navigate('/videos');
          return;
        }
        if (response.status === 403) {
          toast.error('No tiene acceso a este video');
          navigate('/videos');
          return;
        }
        throw new Error('Error al cargar el video');
      }

      const data = await response.json();
      console.log('Video loaded:', data.title, 'Progress:', data.progress);
      setVideo(data);
      setCompleted(data.progress?.completed || false);
    } catch (error) {
      console.error('Error fetching video:', error);
      toast.error('Error al cargar el video');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoComplete = () => {
    setCompleted(true);
    toast.success('¡Felicidades! Has completado el video', {
      icon: '🎉',
      duration: 5000
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RiLoader4Line className="animate-spin text-6xl text-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">Cargando video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Video no encontrado
          </h2>
          <Link 
            to="/videos"
            className="text-orange-500 hover:text-orange-400 flex items-center justify-center gap-2"
          >
            <RiArrowLeftLine />
            Volver a la biblioteca
          </Link>
        </div>
      </div>
    );
  }

  const canPlay = video.status === 'ready';

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Minimal Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              to="/videos"
              className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"
            >
              <RiArrowLeftLine />
              Biblioteca de Videos
            </Link>
            
            <div className="flex items-center gap-4">
              {/* Share Button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
              >
                <RiQrCodeLine className="w-4 h-4" />
                <span>Compartir</span>
              </button>
              
              {/* Admin/Teacher Management Button */}
              {canManage && (
                <button
                  onClick={() => navigate(`/videos/${id}`)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                >
                  {isAdmin ? '👑' : '👨‍🏫'}
                  <span>Administrar Video</span>
                </button>
              )}
              
              {/* Progress Indicator */}
              {video.progress && (
                <div className="flex items-center gap-3">
                  {completed ? (
                    <span className="text-green-500 flex items-center gap-1 text-sm">
                      <RiCheckLine className="w-4 h-4" />
                      Completado
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">
                      Progreso: {Math.round(video.progress.completionPercentage)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Player - Takes 3 columns */}
          <div className="lg:col-span-3">
            {/* Player Container */}
            <div className="bg-black rounded-lg overflow-hidden shadow-2xl">
              {canPlay && video.streamUrl ? (
                <VideoPlayer
                  videoId={video.id}
                  src={video.streamUrl}
                  poster={video.thumbnailUrl}
                  title={video.title}
                  startTime={video.progress?.lastPositionSeconds || 0}
                  onTimeUpdate={(currentTime, duration) => {
                    // Progress is saved automatically
                  }}
                  onEnded={handleVideoComplete}
                  onError={(error) => {
                    toast.error('Error al reproducir el video');
                    console.error('Video playback error:', error);
                  }}
                />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-gray-800">
                  {video.status === 'processing' ? (
                    <div className="text-center text-white">
                      <RiLoader4Line className="animate-spin text-4xl mx-auto mb-2" />
                      <p>Procesando video...</p>
                    </div>
                  ) : (
                    <div className="text-center text-red-400">
                      <p>El video no está disponible</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video Title and Description */}
            <div className="mt-6 bg-gray-800 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-white mb-3">
                {video.title}
              </h1>
              
              {/* Video Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                <span>{video.viewCount} reproducciones</span>
                {video.publishedAt && (
                  <span>
                    Publicado {formatDistanceToNow(new Date(video.publishedAt), { 
                      addSuffix: true, 
                      locale: es 
                    })}
                  </span>
                )}
                {video.durationSeconds && (
                  <span className="flex items-center gap-1">
                    <RiTimeLine />
                    {formatDuration(video.durationSeconds)}
                  </span>
                )}
              </div>

              {/* Description */}
              {video.description && (
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {video.description}
                  </p>
                </div>
              )}

              {/* Instructor Info */}
              {video.creator && (
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-700">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                    {video.creator.firstName?.[0] || video.creator.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {video.creator.firstName && video.creator.lastName
                        ? `${video.creator.firstName} ${video.creator.lastName}`
                        : 'Instructor'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {video.category?.name || 'Capacitación'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="lg:col-span-1">
            {/* Course Progress Card */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <RiAwardLine className="text-orange-500" />
                Tu Progreso
              </h3>
              
              {video.progress ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Completado</span>
                      <span className="text-white">
                        {Math.round(video.progress.completionPercentage)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${video.progress.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  {completed && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
                      <RiCheckLine className="text-green-500 text-2xl mx-auto mb-1" />
                      <p className="text-green-400 text-sm font-medium">
                        ¡Video Completado!
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Comienza a ver el video para registrar tu progreso
                </p>
              )}
            </div>

            {/* Learning Tips */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <RiBookOpenLine className="text-orange-500" />
                Consejos de Aprendizaje
              </h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Toma notas mientras ves el video</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Pausa y repite las secciones importantes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Usa los controles de velocidad según tu ritmo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Activa pantalla completa para mejor concentración</span>
                </li>
              </ul>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-gray-800 rounded-lg p-6 mt-6">
              <h3 className="text-white font-semibold mb-4">
                Atajos de Teclado
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Espacio</span>
                  <span className="text-gray-500">Play/Pausa</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>← →</span>
                  <span className="text-gray-500">±10 seg</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>↑ ↓</span>
                  <span className="text-gray-500">Volumen</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>F</span>
                  <span className="text-gray-500">Pantalla completa</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>M</span>
                  <span className="text-gray-500">Silenciar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && video && (
        <VideoShareModal
          videoId={video.id}
          videoTitle={video.title}
          isInteractive={false}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

function formatDistanceToNow(date: Date, options: any) {
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const diff = (date.getTime() - Date.now()) / 1000;
  
  if (Math.abs(diff) < 60) return 'hace un momento';
  if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (Math.abs(diff) < 2592000) return rtf.format(Math.round(diff / 86400), 'day');
  if (Math.abs(diff) < 31536000) return rtf.format(Math.round(diff / 2592000), 'month');
  return rtf.format(Math.round(diff / 31536000), 'year');
}