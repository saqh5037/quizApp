import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  RiLoader4Line,
  RiPlayCircleLine,
  RiUserLine,
  RiMailLine,
  RiPhoneLine,
  RiShieldCheckLine,
  RiVideoLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { apiConfig } from '../../config/api.config';
import PublicInteractiveVideoWrapperEnhanced from '../../components/videos/PublicInteractiveVideoWrapperEnhanced';

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
  streamUrl?: string;
  hlsPlaylistUrl?: string;
  status: string;
  interactiveLayer?: any;
}

interface VideoResults {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  passed: boolean;
  answers: any[];
}

export default function PublicInteractiveVideoEnhanced() {
  const { id } = useParams();
  
  const [video, setVideo] = useState<PublicVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [showIdentificationForm, setShowIdentificationForm] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<VideoResults | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [formErrors, setFormErrors] = useState<any>({});

  useEffect(() => {
    // Check if student info is already stored
    const storedInfo = sessionStorage.getItem('publicInteractiveVideoStudentInfo');
    if (storedInfo) {
      const info = JSON.parse(storedInfo);
      setStudentInfo(info);
      setShowIdentificationForm(false);
      fetchVideo();
    } else {
      setLoading(false);
    }

    // Prevent navigation away from the page
    const preventNavigation = (e: BeforeUnloadEvent) => {
      if (!showResults) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', preventNavigation);
    
    return () => {
      window.removeEventListener('beforeunload', preventNavigation);
    };
  }, [id, showResults]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${apiConfig.baseURL}/videos/${id}/public-interactive`, {
        headers: {
          'X-Student-Info': JSON.stringify(studentInfo || formData)
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Video no encontrado');
        } else if (response.status === 403) {
          toast.error('Video no disponible públicamente');
        } else {
          toast.error('Error al cargar el video');
        }
        return;
      }

      const data = await response.json();
      setVideo(data.data);
    } catch (error) {
      console.error('Error fetching video:', error);
      toast.error('Error al cargar el video');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: any = {};
    
    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'El nombre debe tener al menos 3 caracteres';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Correo electrónico inválido';
    }
    
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Teléfono inválido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitIdentification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const info = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone?.trim() || undefined
    };

    sessionStorage.setItem('publicInteractiveVideoStudentInfo', JSON.stringify(info));
    setStudentInfo(info);
    setShowIdentificationForm(false);
    fetchVideo();
  };

  const handleVideoComplete = (videoResults: any) => {
    setResults(videoResults.result);
    setShowResults(true);
    
    // Send results to backend
    try {
      fetch(`${apiConfig.baseURL}/videos/${id}/interactive-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentInfo,
          results: videoResults.result,
          completedAt: new Date().toISOString()
        })
      });
      
      toast.success('¡Evaluación completada!');
    } catch (error) {
      console.error('Error saving results:', error);
    }
  };

  // Identification Form View - Mobile Responsive
  if (showIdentificationForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8">
          {/* Logo and Title */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <RiVideoLine className="text-3xl md:text-4xl text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              Video Interactivo
            </h2>
            <p className="text-sm md:text-base text-gray-400">
              Complete sus datos para iniciar la evaluación
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmitIdentification} className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <RiUserLine className="inline w-4 h-4 mr-1" />
                Nombre completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({...formData, name: e.target.value});
                  if (formErrors.name) {
                    setFormErrors({...formErrors, name: ''});
                  }
                }}
                className={`w-full px-4 py-2 bg-gray-700 border ${formErrors.name ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                placeholder="Juan Pérez"
                required
              />
              {formErrors.name && (
                <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <RiMailLine className="inline w-4 h-4 mr-1" />
                Correo electrónico *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({...formData, email: e.target.value});
                  if (formErrors.email) {
                    setFormErrors({...formErrors, email: ''});
                  }
                }}
                className={`w-full px-4 py-2 bg-gray-700 border ${formErrors.email ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                placeholder="juan@ejemplo.com"
                required
              />
              {formErrors.email && (
                <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <RiPhoneLine className="inline w-4 h-4 mr-1" />
                Teléfono (opcional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({...formData, phone: e.target.value});
                  if (formErrors.phone) {
                    setFormErrors({...formErrors, phone: ''});
                  }
                }}
                className={`w-full px-4 py-2 bg-gray-700 border ${formErrors.phone ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                placeholder="+52 123 456 7890"
              />
              {formErrors.phone && (
                <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3 md:p-4">
              <div className="flex items-start space-x-2">
                <RiShieldCheckLine className="text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-200 font-medium mb-1">
                    Evaluación Interactiva
                  </p>
                  <p className="text-xs text-blue-300">
                    El video pausará automáticamente para mostrar preguntas.
                    Debe responder para continuar.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02]"
            >
              <RiPlayCircleLine className="inline w-5 h-5 mr-2" />
              Comenzar Evaluación
            </button>
          </form>

          {/* Footer */}
          <p className="text-xs text-gray-500 text-center mt-6">
            Sus datos serán utilizados únicamente para fines de evaluación
          </p>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RiLoader4Line className="animate-spin text-5xl md:text-6xl text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Preparando video interactivo...</p>
        </div>
      </div>
    );
  }

  // Video Not Available
  if (!video || !video.interactiveLayer) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <RiVideoLine className="text-4xl text-red-400" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            Video no disponible
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            Este video interactivo no está disponible públicamente o ha sido eliminado
          </p>
        </div>
      </div>
    );
  }

  // Main Video View - No Navigation, Mobile Responsive
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Minimal Header - Mobile Responsive */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 md:py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-base md:text-lg font-semibold text-white truncate">
              {video.title}
            </h1>
            <div className="text-xs md:text-sm text-gray-400">
              <RiUserLine className="inline w-3 h-3 mr-1" />
              {studentInfo?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Video Container - Full Height, Mobile Responsive */}
      <div className="flex-1 flex items-center justify-center p-2 md:p-4 lg:p-6">
        <div className="w-full max-w-6xl">
          <PublicInteractiveVideoWrapperEnhanced
            videoId={video.id}
            videoUrl={video.streamUrl || video.hlsPlaylistUrl || ''}
            videoTitle={video.title}
            layerId={video.interactiveLayer?.id}
            studentInfo={studentInfo!}
            onComplete={handleVideoComplete}
            isPublicView={true}
          />
        </div>
      </div>

      {/* Mobile-specific styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          .min-h-screen {
            min-height: 100vh;
            min-height: -webkit-fill-available;
          }
        }
      `}</style>
    </div>
  );
}