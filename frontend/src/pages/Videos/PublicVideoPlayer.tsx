import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  RiLoader4Line,
  RiPlayCircleLine,
  RiUserLine,
  RiMailLine,
  RiPhoneLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { apiConfig } from '../../config/api.config';
import VideoPlayer from '../../components/VideoPlayer';

interface StudentInfo {
  name: string;
  email: string;
  phone?: string;
}

interface PublicVideo {
  id: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  streamUrl?: string;
  status: string;
}

export default function PublicVideoPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [video, setVideo] = useState<PublicVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [showIdentificationForm, setShowIdentificationForm] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    // Check if student info is already stored in session
    const storedInfo = sessionStorage.getItem('publicVideoStudentInfo');
    if (storedInfo) {
      const info = JSON.parse(storedInfo);
      setStudentInfo(info);
      setShowIdentificationForm(false);
      fetchVideo();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${apiConfig.baseURL}/videos/${id}/public`, {
        headers: {
          'X-Student-Info': JSON.stringify(studentInfo || formData)
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Video no encontrado');
          return;
        }
        throw new Error('Error al cargar el video');
      }

      const data = await response.json();
      setVideo(data);
    } catch (error) {
      console.error('Error fetching video:', error);
      toast.error('Error al cargar el video');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitIdentification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Por favor ingrese su nombre');
      return;
    }
    
    if (!formData.email.trim()) {
      toast.error('Por favor ingrese su correo electrónico');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Por favor ingrese un correo electrónico válido');
      return;
    }

    // Save to session storage
    const info = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone
    };
    
    sessionStorage.setItem('publicVideoStudentInfo', JSON.stringify(info));
    setStudentInfo(info);
    setShowIdentificationForm(false);
    
    // Fetch video
    await fetchVideo();
  };

  const handleVideoComplete = async () => {
    toast.success('¡Video completado!', {
      icon: '🎉',
      duration: 5000
    });
    
    // Track completion
    try {
      await fetch(`${apiConfig.baseURL}/videos/${id}/track-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Student-Info': JSON.stringify(studentInfo)
        }
      });
    } catch (error) {
      console.error('Error tracking completion:', error);
    }
  };

  if (showIdentificationForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <RiPlayCircleLine className="text-4xl text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Video de Capacitación
            </h2>
            <p className="text-gray-400">
              Por favor, identifíquese para continuar
            </p>
          </div>

          <form onSubmit={handleSubmitIdentification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <RiUserLine className="inline w-4 h-4 mr-1" />
                Nombre completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <RiMailLine className="inline w-4 h-4 mr-1" />
                Correo electrónico *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="juan@ejemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <RiPhoneLine className="inline w-4 h-4 mr-1" />
                Teléfono (opcional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="+52 123 456 7890"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
            >
              Comenzar Video
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            Su información será utilizada únicamente para seguimiento de capacitación
          </p>
        </div>
      </div>
    );
  }

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
            Video no disponible
          </h2>
          <p className="text-gray-400">
            Este video no está disponible públicamente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Minimal Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">
            {video.title}
          </h1>
          <div className="text-sm text-gray-400">
            Estudiante: {studentInfo?.name}
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-black rounded-lg overflow-hidden shadow-2xl">
          {video.status === 'ready' && video.streamUrl ? (
            <VideoPlayer
              videoId={video.id}
              src={video.streamUrl}
              poster={video.thumbnailUrl}
              title={video.title}
              onEnded={handleVideoComplete}
              onError={(error) => {
                toast.error('Error al reproducir el video');
                console.error('Video playback error:', error);
              }}
            />
          ) : (
            <div className="aspect-video flex items-center justify-center bg-gray-800">
              <div className="text-center text-gray-400">
                <p>El video no está disponible</p>
              </div>
            </div>
          )}
        </div>

        {/* Video Description */}
        {video.description && (
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-3">Descripción</h3>
            <p className="text-gray-300 whitespace-pre-wrap">
              {video.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}