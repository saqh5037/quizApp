import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  RiArrowLeftLine, 
  RiPlayLine, 
  RiDownloadLine, 
  RiShareLine,
  RiThumbUpLine,
  RiThumbUpFill,
  RiBookmarkLine,
  RiBookmarkFill,
  RiEyeLine,
  RiTimeLine,
  RiCalendarLine,
  RiUserLine,
  RiFolderLine,
  RiEditLine,
  RiDeleteBinLine,
  RiGamepadLine,
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
  uuid: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  status: string;
  processingProgress?: number;
  isPublic: boolean;
  allowDownload: boolean;
  viewCount: number;
  likeCount: number;
  tags?: string[];
  language?: string;
  createdAt: string;
  publishedAt?: string;
  creator?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  streamUrl?: string;
  qualities?: Array<{
    quality: string;
    width: number;
    height: number;
    fileSizeBytes: number;
  }>;
}

const VideoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    try {
      const response = await fetch(`${apiConfig.baseURL}/videos/${id}`, {
        headers: accessToken ? {
          'Authorization': `Bearer ${accessToken}`
        } : {}
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Video no encontrado');
          navigate('/videos');
          return;
        }
        throw new Error('Error al cargar el video');
      }

      const data = await response.json();
      console.log('Video data received:', {
        id: data.id,
        status: data.status,
        streamUrl: data.streamUrl,
        hlsPlaylistUrl: data.hlsPlaylistUrl
      });
      setVideo(data);
    } catch (error) {
      console.error('Error fetching video:', error);
      toast.error('Error al cargar el video');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    if (!accessToken) {
      toast.error('Debe iniciar sesión para dar like');
      return;
    }
    setLiked(!liked);
    // TODO: Implement API call
  };

  const handleBookmark = () => {
    if (!accessToken) {
      toast.error('Debe iniciar sesión para guardar');
      return;
    }
    setBookmarked(!bookmarked);
    // TODO: Implement API call
  };

  const handleDownload = async () => {
    if (!video?.allowDownload) {
      toast.error('Este video no permite descargas');
      return;
    }
    // TODO: Implement download
    toast.success('Descarga iniciada');
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleEdit = () => {
    navigate(`/videos/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('¿Está seguro de eliminar este video?')) return;
    
    try {
      const response = await fetch(`${apiConfig.baseURL}/videos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el video');
      }

      toast.success('Video eliminado exitosamente');
      navigate('/videos');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Error al eliminar el video');
    }
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Video no encontrado
          </h2>
          <Link 
            to="/videos"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Volver a videos
          </Link>
        </div>
      </div>
    );
  }

  // Check permissions based on role
  const isOwner = user?.id === video.creator?.id;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const canEdit = isOwner || isAdmin || isTeacher;
  const canPlay = video.status === 'ready';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/videos')}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <RiArrowLeftLine className="w-5 h-5 mr-2" />
                Volver a videos
              </button>
              
              {canPlay && (
                <button
                  onClick={() => navigate(`/videos/${id}/play`)}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md font-semibold"
                >
                  <RiPlayLine className="w-5 h-5" />
                  Modo Reproducción
                </button>
              )}
            </div>
            
            {canEdit && (
              <div className="flex items-center space-x-3">
                {/* Role indicator */}
                {(isAdmin || isTeacher) && (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    {isAdmin ? '👑 Admin' : '👨‍🏫 Profesor'}
                  </span>
                )}
                
                <button
                  onClick={() => navigate(`/videos/${id}/interactive`)}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md font-semibold"
                >
                  <RiGamepadLine className="w-4 h-4 mr-1" />
                  Gestión Interactiva
                </button>
                
                <button
                  onClick={handleEdit}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-all duration-200 font-semibold"
                >
                  <RiEditLine className="w-4 h-4 mr-1" />
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md font-semibold"
                >
                  <RiDeleteBinLine className="w-4 h-4 mr-1" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player Area */}
          <div className="lg:col-span-2">
            {/* Video Player or Placeholder */}
            <div className="bg-black rounded-lg overflow-hidden">
              {console.log('Rendering video player:', { canPlay, streamUrl: video.streamUrl })}
              {canPlay && video.streamUrl ? (
                <VideoPlayer
                  videoId={video.id}
                  src={video.streamUrl}
                  poster={video.thumbnailUrl}
                  title={video.title}
                  startTime={video.progress?.lastPositionSeconds || 0}
                  onTimeUpdate={(currentTime, duration) => {
                    // Progress is saved automatically by the VideoPlayer
                  }}
                  onEnded={() => {
                    toast.success('Video completado');
                  }}
                  onError={(error) => {
                    toast.error('Error al reproducir el video');
                    console.error('Video playback error:', error);
                  }}
                />
              ) : canPlay ? (
                <div className="aspect-video flex items-center justify-center">
                  <div className="text-white text-center">
                    <RiPlayLine className="w-20 h-20 mx-auto mb-4" />
                    <p>Preparando video...</p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center text-white text-center">
                  {video.status === 'processing' ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                      <p>Procesando video...</p>
                      {video.processingProgress && (
                        <div className="w-64 mx-auto mt-4">
                          <div className="bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${video.processingProgress}%` }}
                            />
                          </div>
                          <p className="text-sm mt-2">{video.processingProgress}%</p>
                        </div>
                      )}
                    </>
                  ) : video.status === 'uploading' ? (
                    <>
                      <div className="animate-pulse">
                        <RiTimeLine className="w-20 h-20 mx-auto mb-4" />
                      </div>
                      <p>Subiendo video...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-red-400">Error al procesar el video</p>
                      <p className="text-sm text-gray-400 mt-2">Estado: {video.status}</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="mt-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {video.title}
              </h1>
              
              {/* Stats and Actions */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center">
                    <RiEyeLine className="w-4 h-4 mr-1" />
                    {video.viewCount} vistas
                  </span>
                  <span className="flex items-center">
                    <RiCalendarLine className="w-4 h-4 mr-1" />
                    {video.publishedAt 
                      ? format(new Date(video.publishedAt), 'PPP', { locale: es })
                      : 'No publicado'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleLike}
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {liked ? (
                      <RiThumbUpFill className="w-5 h-5 text-blue-600" />
                    ) : (
                      <RiThumbUpLine className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={handleBookmark}
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {bookmarked ? (
                      <RiBookmarkFill className="w-5 h-5 text-blue-600" />
                    ) : (
                      <RiBookmarkLine className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 relative group"
                  >
                    <RiQrCodeLine className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Compartir con QR
                    </span>
                  </button>
                  {video.allowDownload && (
                    <button
                      onClick={handleDownload}
                      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <RiDownloadLine className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {video.description && (
                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Descripción
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {video.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Video Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Detalles del video
              </h3>
              
              <div className="space-y-3">
                {video.creator && (
                  <div className="flex items-start">
                    <RiUserLine className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Creador</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {video.creator.firstName && video.creator.lastName
                          ? `${video.creator.firstName} ${video.creator.lastName}`
                          : video.creator.email}
                      </p>
                    </div>
                  </div>
                )}

                {video.category && (
                  <div className="flex items-start">
                    <RiFolderLine className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Categoría</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {video.category.name}
                      </p>
                    </div>
                  </div>
                )}

                {video.durationSeconds && (
                  <div className="flex items-start">
                    <RiTimeLine className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Duración</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDuration(video.durationSeconds)}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tamaño</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatFileSize(video.fileSizeBytes)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estado</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    video.status === 'ready' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : video.status === 'processing'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : video.status === 'error'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {video.status === 'ready' ? 'Listo' :
                     video.status === 'processing' ? 'Procesando' :
                     video.status === 'uploading' ? 'Subiendo' :
                     video.status === 'error' ? 'Error' : video.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Visibilidad</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {video.isPublic ? 'Público' : 'Privado'}
                  </p>
                </div>

                {video.tags && video.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Etiquetas</p>
                    <div className="flex flex-wrap gap-1">
                      {video.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {video.qualities && video.qualities.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Calidades disponibles</p>
                    <div className="space-y-1">
                      {video.qualities.map((quality, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {quality.quality}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            ({quality.width}x{quality.height})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
};

export default VideoDetail;