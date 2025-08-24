import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  RiArrowLeftLine, 
  RiSaveLine, 
  RiVideoLine,
  RiLoader4Line,
  RiInformationLine,
  RiLockLine,
  RiGlobalLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { apiConfig } from '../config/api.config';
import { useAuthStore } from '../stores/authStore';

interface VideoCategory {
  id: number;
  name: string;
  slug: string;
}

interface Video {
  id: number;
  title: string;
  description?: string;
  categoryId?: number;
  tags?: string[];
  language?: string;
  isPublic: boolean;
  allowDownload: boolean;
  requiresAuth: boolean;
  status: string;
  creatorId: number;
}

export default function VideoEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [video, setVideo] = useState<Video | null>(null);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: 1,
    tags: [] as string[],
    tagInput: '',
    language: 'es',
    isPublic: true,
    allowDownload: false,
    requiresAuth: false
  });

  useEffect(() => {
    if (!accessToken) {
      toast.error('Debe iniciar sesión para editar videos');
      navigate('/login');
      return;
    }
    
    fetchCategories();
    fetchVideo();
  }, [id, accessToken]);

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

  const fetchVideo = async () => {
    try {
      const response = await fetch(`${apiConfig.baseURL}/videos/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Video no encontrado');
          navigate('/videos');
          return;
        }
        if (response.status === 403) {
          toast.error('No tiene permisos para editar este video');
          navigate('/videos');
          return;
        }
        throw new Error('Error al cargar el video');
      }

      const data = await response.json();
      
      // Check permissions based on role
      const isOwner = data.creatorId === user?.id;
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      const isTeacher = user?.role === 'teacher';
      const canEdit = isOwner || isAdmin || isTeacher;
      
      if (!canEdit) {
        toast.error('No tiene permisos para editar este video. Solo el propietario, administradores o profesores pueden editar.');
        navigate('/videos');
        return;
      }
      
      setVideo(data);
      
      // Set form data
      setFormData({
        title: data.title || '',
        description: data.description || '',
        categoryId: data.categoryId || 1,
        tags: data.tags || [],
        tagInput: '',
        language: data.language || 'es',
        isPublic: data.isPublic || false,
        allowDownload: data.allowDownload || false,
        requiresAuth: data.requiresAuth || false
      });
    } catch (error) {
      console.error('Error fetching video:', error);
      toast.error('Error al cargar el video');
      navigate('/videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    setSaving(true);
    
    try {
      const response = await fetch(`${apiConfig.baseURL}/videos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          categoryId: formData.categoryId,
          tags: formData.tags,
          language: formData.language,
          isPublic: formData.isPublic,
          allowDownload: formData.allowDownload,
          requiresAuth: formData.requiresAuth
        })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el video');
      }

      toast.success('Video actualizado correctamente');
      navigate(`/videos/${id}`);
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error('Error al actualizar el video');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    const tag = formData.tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag],
        tagInput: ''
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RiLoader4Line className="animate-spin text-4xl text-orange-500" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Video no encontrado
          </h2>
          <button
            onClick={() => navigate('/videos')}
            className="text-orange-500 hover:text-orange-600"
          >
            Volver a videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/videos/${id}`)}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <RiArrowLeftLine className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <RiVideoLine className="text-orange-500" />
                Editar Video
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RiInformationLine className="text-orange-500" />
              Información Básica
            </h2>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Título del video"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Descripción del video"
                />
              </div>

              {/* Category and Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Idioma
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etiquetas
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.tagInput}
                    onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                    onKeyPress={handleKeyPress}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Añadir etiqueta y presionar Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    Añadir
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-orange-600 hover:text-orange-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RiLockLine className="text-orange-500" />
              Configuración de Privacidad
            </h2>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  <RiGlobalLine className="inline mr-1" />
                  Video público (visible para todos)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allowDownload}
                  onChange={(e) => setFormData({ ...formData, allowDownload: e.target.checked })}
                  className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Permitir descargas
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.requiresAuth}
                  onChange={(e) => setFormData({ ...formData, requiresAuth: e.target.checked })}
                  className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Requiere autenticación para ver
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/videos/${id}`)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RiLoader4Line className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <RiSaveLine />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}