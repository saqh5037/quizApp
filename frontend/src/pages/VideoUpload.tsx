import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiUploadCloud2Line,
  RiVideoLine,
  RiCloseLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiLoader4Line,
  RiPlayCircleLine,
  RiInformationLine,
  RiDeleteBin6Line
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import VideoUploadService from '../services/videoUpload.service';
import { apiConfig } from '../config/api.config';

interface VideoFile {
  file: File;
  preview?: string;
  uploadProgress: number;
  uploadId?: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface VideoMetadata {
  title: string;
  description: string;
  category: string;
  categoryId?: number;
  tags: string[];
  isPublic: boolean;
  allowDownload: boolean;
  linkedQuizId?: number;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ALLOWED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];

export default function VideoUpload() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata>({
    title: '',
    description: '',
    category: 'capacitacion',
    tags: [],
    isPublic: true,  // Default to public
    allowDownload: false
  });
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const uploadServiceRef = useRef<VideoUploadService | null>(null);

  const categories = [
    { id: 1, value: 'capacitacion', label: 'Capacitación', icon: '🎓' },
    { id: 2, value: 'tutoriales', label: 'Tutoriales', icon: '💡' },
    { id: 3, value: 'webinars', label: 'Webinars', icon: '📹' },
    { id: 4, value: 'documentacion', label: 'Documentación', icon: '📚' },
    { id: 5, value: 'casos-estudio', label: 'Casos de Estudio', icon: '📊' }
  ];

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!ALLOWED_FORMATS.includes(file.type)) {
      toast.error('Formato de archivo no permitido. Use MP4, MOV, AVI, MKV o WebM.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('El archivo es demasiado grande. Máximo 2GB.');
      return;
    }

    // Create video preview
    const videoUrl = URL.createObjectURL(file);
    
    setVideoFile({
      file,
      preview: videoUrl,
      uploadProgress: 0,
      status: 'pending'
    });

    // Auto-fill title from filename
    if (!metadata.title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setMetadata(prev => ({ ...prev, title: nameWithoutExt }));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeVideo = () => {
    if (videoFile?.preview) {
      URL.revokeObjectURL(videoFile.preview);
    }
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const uploadChunk = async (
    file: File,
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    token: string
  ): Promise<void> => {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('chunk', chunk);

    const response = await fetch(`${apiConfig.baseURL}/videos/upload/chunk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Error uploading chunk ${chunkIndex + 1}`);
    }
  };

  const handleUpload = async () => {
    if (!videoFile || !metadata.title) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    // Validate file size
    if (videoFile.file.size === 0) {
      toast.error('El archivo seleccionado está vacío');
      return;
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(videoFile.file.type)) {
      toast.error('Formato de video no soportado. Use MP4, WebM, MOV o AVI.');
      return;
    }

    if (!accessToken) {
      toast.error('Debe iniciar sesión para subir videos');
      navigate('/login');
      return;
    }

    setIsUploading(true);
    setVideoFile(prev => prev ? { ...prev, status: 'uploading' } : null);

    try {
      // Find categoryId from category value
      const selectedCategory = categories.find(cat => cat.value === metadata.category);
      const categoryId = selectedCategory?.id || 1;

      console.log('Token:', accessToken ? `Present (${accessToken.substring(0, 20)}...)` : 'Missing');
      console.log('API URL:', `${apiConfig.baseURL}/videos/upload/init`);

      // Initialize upload
      const initResponse = await fetch(`${apiConfig.baseURL}/videos/upload/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          filename: videoFile.file.name,
          fileSize: videoFile.file.size,
          mimeType: videoFile.file.type,
          metadata: {
            ...metadata,
            categoryId
          }
        })
      });

      console.log('Response status:', initResponse.status);
      
      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error('Upload init error:', errorText);
        throw new Error('Error al iniciar la carga');
      }

      const { uploadId, chunkSize } = await initResponse.json();
      
      setVideoFile(prev => prev ? { ...prev, uploadId } : null);

      // Calculate chunks
      const totalChunks = Math.ceil(videoFile.file.size / CHUNK_SIZE);
      
      // Upload chunks
      console.log(`Starting upload of ${totalChunks} chunks for file size ${videoFile.file.size}`);
      
      for (let i = 0; i < totalChunks; i++) {
        try {
          await uploadChunk(videoFile.file, uploadId, i, totalChunks, accessToken);
          
          // Update progress
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          setVideoFile(prev => prev ? { ...prev, uploadProgress: progress } : null);
          
          console.log(`Chunk ${i + 1}/${totalChunks} uploaded successfully`);
        } catch (chunkError) {
          console.error(`Failed to upload chunk ${i + 1}:`, chunkError);
          throw new Error(`Error al subir el fragmento ${i + 1} de ${totalChunks}`);
        }
      }

      // Complete upload
      setVideoFile(prev => prev ? { ...prev, status: 'processing' } : null);
      
      const completeResponse = await fetch(`${apiConfig.baseURL}/videos/upload/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ uploadId })
      });

      if (!completeResponse.ok) {
        throw new Error('Error al completar la carga');
      }

      const { videoId } = await completeResponse.json();

      setVideoFile(prev => prev ? { ...prev, status: 'completed' } : null);
      toast.success('Video subido exitosamente');
      
      // Redirect to video detail page after a short delay
      setTimeout(() => {
        navigate(`/videos/${videoId}`);
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setVideoFile(prev => prev ? { 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      } : null);
      toast.error('Error al subir el video');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 flex items-center gap-3">
          <RiUploadCloud2Line className="text-blue-600" />
          Subir Video
        </h1>
        <p className="text-gray-600 text-lg mt-2">
          Sube videos educativos para tu biblioteca de contenido
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {!videoFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging 
                ? 'border-blue-600 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <RiVideoLine className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Arrastra y suelta tu video aquí
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              o haz clic para seleccionar un archivo
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-semibold"
            >
              Seleccionar Video
            </button>
            <div className="mt-6 text-xs text-gray-500">
              <p>Formatos soportados: MP4, MOV, AVI, MKV, WebM</p>
              <p>Tamaño máximo: 2GB</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video Preview */}
            <div className="relative">
              <video
                src={videoFile.preview}
                controls
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '400px' }}
              />
              {videoFile.status === 'pending' && (
                <button
                  onClick={removeVideo}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                >
                  <RiDeleteBin6Line className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Upload Progress */}
            {videoFile.status === 'uploading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subiendo video...</span>
                  <span>{videoFile.uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${videoFile.uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Processing Status */}
            {videoFile.status === 'processing' && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <RiLoader4Line className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <p className="font-medium text-blue-900">Procesando video...</p>
                  <p className="text-sm text-blue-700">Esto puede tomar algunos minutos</p>
                </div>
              </div>
            )}

            {/* Success Status */}
            {videoFile.status === 'completed' && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <RiCheckLine className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">¡Video subido exitosamente!</p>
                  <p className="text-sm text-green-700">Redirigiendo...</p>
                </div>
              </div>
            )}

            {/* Error Status */}
            {videoFile.status === 'error' && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <RiErrorWarningLine className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Error al subir el video</p>
                  <p className="text-sm text-red-700">{videoFile.error}</p>
                </div>
              </div>
            )}

            {/* File Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <RiVideoLine className="w-8 h-8 text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{videoFile.file.name}</p>
                <p className="text-sm text-gray-600">
                  {(videoFile.file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Form */}
      {videoFile && videoFile.status === 'pending' && (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Información del Video</h2>
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Ingresa el título del video"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={4}
              placeholder="Describe el contenido del video"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={metadata.category}
              onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etiquetas
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Agregar etiqueta"
              />
              <button
                onClick={addTag}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {metadata.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-orange-900"
                  >
                    <RiCloseLine className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={metadata.isPublic}
                onChange={(e) => setMetadata({ ...metadata, isPublic: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-600"
              />
              <span className="text-sm text-gray-700">Hacer público este video</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={metadata.allowDownload}
                onChange={(e) => setMetadata({ ...metadata, allowDownload: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-600"
              />
              <span className="text-sm text-gray-700">Permitir descargas</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => navigate('/videos')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || !metadata.title}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <RiLoader4Line className="w-5 h-5 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <RiUploadCloud2Line className="w-5 h-5" />
                  Subir Video
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <RiInformationLine className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Los videos se suben en chunks para mayor confiabilidad</li>
              <li>El procesamiento genera múltiples calidades automáticamente</li>
              <li>Se crean miniaturas y vista previa del video</li>
              <li>Los videos grandes pueden tardar varios minutos en procesarse</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}