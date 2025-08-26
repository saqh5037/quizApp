import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  RiLoader4Line,
  RiPlayCircleLine,
  RiUserLine,
  RiMailLine,
  RiPhoneLine,
  RiCheckLine,
  RiAwardLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { apiConfig } from '../../config/api.config';
import InteractiveVideoWrapper from '../../components/videos/InteractiveVideoWrapper';

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

export default function PublicInteractiveVideo() {
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

  useEffect(() => {
    // Check if student info is already stored in session
    const storedInfo = sessionStorage.getItem('publicInteractiveVideoStudentInfo');
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
      
      const response = await fetch(`${apiConfig.baseURL}/videos/${id}/public-interactive`, {
        headers: {
          'X-Student-Info': JSON.stringify(studentInfo || formData)
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Video no encontrado');
          return;
        }
        if (response.status === 403) {
          toast.error('Este video no está disponible públicamente');
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
    
    sessionStorage.setItem('publicInteractiveVideoStudentInfo', JSON.stringify(info));
    setStudentInfo(info);
    setShowIdentificationForm(false);
    
    // Fetch video
    await fetchVideo();
  };

  const handleVideoComplete = async (completionData: any) => {
    console.log('Video completed with data:', completionData);
    
    // Save results
    const videoResults: VideoResults = {
      score: completionData.result?.score || 0,
      totalQuestions: completionData.result?.totalQuestions || 0,
      correctAnswers: completionData.result?.correctAnswers || 0,
      passed: completionData.result?.passed || false,
      answers: completionData.result?.answers || []
    };
    
    setResults(videoResults);
    setShowResults(true);
    
    // Send results to backend
    try {
      await fetch(`${apiConfig.baseURL}/videos/${id}/interactive-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentInfo,
          results: videoResults,
          completedAt: new Date().toISOString()
        })
      });
      
      toast.success('¡Resultados guardados exitosamente!');
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Error al guardar los resultados');
    }
  };

  const handleRetry = () => {
    setShowResults(false);
    setResults(null);
    // Reload the page to restart the video
    window.location.reload();
  };

  if (showIdentificationForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <RiPlayCircleLine className="text-4xl text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Video Interactivo
            </h2>
            <p className="text-gray-400">
              Este video contiene preguntas de evaluación
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
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="+52 123 456 7890"
              />
            </div>

            <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-4">
              <p className="text-sm text-purple-200">
                <strong>Importante:</strong> Durante el video aparecerán preguntas. 
                Debe responder correctamente para continuar.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Comenzar Video Interactivo
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            Sus respuestas serán registradas para evaluación
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RiLoader4Line className="animate-spin text-6xl text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Preparando video interactivo...</p>
        </div>
      </div>
    );
  }

  if (!video || !video.interactiveLayer) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Video no disponible
          </h2>
          <p className="text-gray-400">
            Este video interactivo no está disponible públicamente
          </p>
        </div>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className={`w-24 h-24 ${results.passed ? 'bg-green-500' : 'bg-red-500'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {results.passed ? (
                <RiCheckLine className="text-5xl text-white" />
              ) : (
                <RiAwardLine className="text-5xl text-white" />
              )}
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">
              {results.passed ? '¡Felicidades!' : 'Video Completado'}
            </h2>
            
            <p className="text-gray-400">
              {studentInfo?.name}
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-gray-400 text-sm mb-1">Puntuación</p>
                <p className="text-3xl font-bold text-white">
                  {results.score.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Respuestas Correctas</p>
                <p className="text-3xl font-bold text-white">
                  {results.correctAnswers}/{results.totalQuestions}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Estado</p>
                <p className={`text-xl font-bold ${results.passed ? 'text-green-400' : 'text-red-400'}`}>
                  {results.passed ? 'Aprobado' : 'No Aprobado'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Intentar Nuevamente
            </button>
            
            <button
              onClick={() => window.close()}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
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
            {video.title} - Modo Interactivo
          </h1>
          <div className="text-sm text-gray-400">
            Estudiante: {studentInfo?.name}
          </div>
        </div>
      </div>

      {/* Interactive Video Player */}
      <div className="container mx-auto px-4 py-6">
        <InteractiveVideoWrapper
          videoId={video.id}
          videoUrl={video.streamUrl || ''}
          videoTitle={video.title}
          onComplete={handleVideoComplete}
        />
      </div>
    </div>
  );
}