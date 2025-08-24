import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  RiVideoLine, 
  RiUploadCloud2Line, 
  RiPlayCircleLine,
  RiTimeLine,
  RiEyeLine,
  RiBookmarkLine,
  RiSearchLine,
  RiFilterLine,
  RiGridFill,
  RiListUnordered,
  RiFolderLine,
  RiErrorWarningLine,
  RiLoader4Line
} from 'react-icons/ri';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiConfig } from '../config/api.config';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface VideoCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
}

interface Video {
  id: number;
  uuid: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  status: string;
  isPublic: boolean;
  viewCount: number;
  createdAt: string;
  publishedAt?: string;
  creator?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  category?: VideoCategory;
}

export default function Videos() {
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Check user role
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const canManage = isAdmin || isTeacher;

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch videos
  useEffect(() => {
    fetchVideos();
  }, [page, selectedCategory, searchTerm]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${apiConfig.baseURL}/videos/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        status: 'ready'
      });

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const headers: HeadersInit = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${apiConfig.baseURL}/videos?${params}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
        setTotalPages(data.totalPages || 1);
      } else {
        toast.error('Error al cargar los videos');
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
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

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Listo';
      case 'processing':
        return 'Procesando';
      case 'uploading':
        return 'Subiendo';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-white p-5 rounded-xl border border-blue-100">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <RiVideoLine className="text-blue-600" />
              Biblioteca de Videos
            </h1>
            <p className="text-gray-600 text-sm mt-2">
              Explora nuestra colección de videos educativos
            </p>
          </div>
          <Link
            to="/videos/upload"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
          >
            <RiUploadCloud2Line className="w-4 h-4" />
            Subir Video
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-4">
            <RiFilterLine className="text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <RiGridFill className={viewMode === 'grid' ? 'text-blue-600' : 'text-gray-500'} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <RiListUnordered className={viewMode === 'list' ? 'text-blue-600' : 'text-gray-500'} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Grid/List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-100">
          <div className="flex flex-col items-center justify-center">
            <RiLoader4Line className="animate-spin text-3xl text-blue-600 mb-3" />
            <p className="text-gray-600 text-sm">Cargando videos...</p>
          </div>
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
          <RiVideoLine className="mx-auto text-5xl text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-2">
            No se encontraron videos
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Sé el primero en subir un video'}
          </p>
          {!searchTerm && (
            <Link
              to="/videos/upload"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
            >
              <RiUploadCloud2Line className="w-4 h-4" />
              Subir el primer video
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map(video => (
            <div
              key={video.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow group relative border border-gray-100"
            >
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {video.thumbnailUrl ? (
                  <img 
                    src={video.thumbnailUrl} 
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                    <RiVideoLine className="w-10 h-10 text-white/50" />
                  </div>
                )}
                
                {/* Duration Badge */}
                {video.durationSeconds && (
                  <span className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.durationSeconds)}
                  </span>
                )}

                {/* Status Badge */}
                {video.status !== 'ready' && (
                  <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded ${getStatusColor(video.status)}`}>
                    {getStatusText(video.status)}
                  </span>
                )}

                {/* Play Overlay - Clickable */}
                <Link 
                  to={`/videos/${video.id}/play`}
                  className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <RiPlayCircleLine className="w-12 h-12 text-white" />
                </Link>
              </div>

              <div className="p-3">
                {/* Admin/Teacher Quick Actions */}
                {canManage && (
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      {isAdmin ? '👑 Admin' : '👨‍🏫 Profesor'}
                    </span>
                    <Link
                      to={`/videos/${video.id}`}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Administrar
                    </Link>
                  </div>
                )}
                <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                  {video.title}
                </h3>
                
                {video.creator && (
                  <p className="text-xs text-gray-600 mb-2">
                    {video.creator.firstName && video.creator.lastName
                      ? `${video.creator.firstName} ${video.creator.lastName}`
                      : video.creator.email}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <RiEyeLine className="w-4 h-4" />
                    {formatViews(video.viewCount)} vistas
                  </span>
                  <span>
                    {video.publishedAt 
                      ? formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true, locale: es })
                      : 'No publicado'}
                  </span>
                </div>

                {video.category && (
                  <div className="mt-2">
                    <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      <RiFolderLine className="w-3 h-3 mr-1" />
                      {video.category.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200">
            {videos.map(video => (
              <Link
                key={video.id}
                to={`/videos/${video.id}/play`}
                className="flex items-center p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-40 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {video.thumbnailUrl ? (
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                      <RiVideoLine className="w-8 h-8 text-white/50" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="ml-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {video.creator && (
                          <span>
                            {video.creator.firstName && video.creator.lastName
                              ? `${video.creator.firstName} ${video.creator.lastName}`
                              : video.creator.email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <RiEyeLine className="w-4 h-4" />
                          {formatViews(video.viewCount)}
                        </span>
                        {video.durationSeconds && (
                          <span className="flex items-center gap-1">
                            <RiTimeLine className="w-4 h-4" />
                            {formatDuration(video.durationSeconds)}
                          </span>
                        )}
                        <span>
                          {video.publishedAt 
                            ? formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true, locale: es })
                            : 'No publicado'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(video.status)}`}>
                        {getStatusText(video.status)}
                      </span>
                      {video.category && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {video.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          
          <span className="px-4 py-2">
            Página {page} de {totalPages}
          </span>
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}