import { useState, useRef, useEffect, FC } from 'react';
import { createPortal } from 'react-dom';
import VideoPlayer from '../VideoPlayer';
import InteractiveOverlayEnhanced from './InteractiveOverlayEnhanced';
import MobileInteractiveOverlay from './MobileInteractiveOverlay';
import { useInteractiveVideoStore } from '../../stores/interactiveVideoStore';
import { CheckCircle, Trophy, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface PublicInteractiveVideoPlayerProps {
  videoId: number;
  videoUrl: string;
  videoTitle?: string;
  layerId: number;
  studentInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  isPublicView?: boolean;
}

const PublicInteractiveVideoPlayer: FC<PublicInteractiveVideoPlayerProps> = ({
  videoId,
  videoUrl,
  videoTitle = 'Video',
  layerId,
  studentInfo,
  isPublicView = true
}) => {
  const videoRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Zustand store
  const {
    // State
    session,
    questions,
    currentQuestion,
    answers,
    answeredQuestionIds,
    isFullscreen,
    isPaused,
    isLoading,
    showResults,
    showCompleteButton,
    results,
    currentTime,
    videoDuration,
    
    // Actions
    initializeSession,
    startSession,
    setCurrentQuestion,
    submitAnswer,
    skipQuestion,
    updateVideoTime,
    setFullscreen,
    setPaused,
    calculateResults,
    completeAndExit,
    reset
  } = useInteractiveVideoStore();
  
  // Initialize session on mount
  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const init = async () => {
      try {
        await initializeSession(videoId, layerId, studentInfo);
        await startSession();
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing:', error);
        toast.error('Error al inicializar el video interactivo');
      }
    };
    
    init();
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', checkMobile);
      reset();
    };
  }, [videoId, layerId]);
  
  // Enhanced fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
                               (document as any).webkitFullscreenElement || 
                               (document as any).mozFullScreenElement || 
                               (document as any).msFullscreenElement;
      
      // Also check if video.js is in fullscreen
      const videoJsElement = document.querySelector('.vjs-fullscreen');
      const isFS = !!fullscreenElement || !!videoJsElement;
      
      setFullscreen(isFS);
    };
    
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Observe video.js class changes
    const observer = new MutationObserver(() => {
      handleFullscreenChange();
    });
    
    setTimeout(() => {
      const videoJsContainer = document.querySelector('.video-js');
      if (videoJsContainer) {
        observer.observe(videoJsContainer, { 
          attributes: true, 
          attributeFilter: ['class'] 
        });
      }
    }, 1000);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      observer.disconnect();
    };
  }, [setFullscreen]);
  
  // Check for key moments based on video time
  useEffect(() => {
    if (!questions.length || currentQuestion || !currentTime) return;
    
    const currentMoment = questions.find(q => {
      const timeDiff = Math.abs(currentTime - q.timestamp);
      return timeDiff < 1 && !answeredQuestionIds.has(q.id);
    });
    
    if (currentMoment) {
      setCurrentQuestion(currentMoment);
      if (videoRef.current) {
        videoRef.current.pause();
        // For mobile, ensure video stays paused
        if (isMobile) {
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.pause();
            }
          }, 100);
        }
      }
    }
  }, [currentTime, questions, currentQuestion, answeredQuestionIds, setCurrentQuestion, isMobile]);
  
  // Handle video time update
  const handleVideoTimeUpdate = (time: number, dur: number) => {
    updateVideoTime(time, dur);
  };
  
  // Handle video end
  const handleVideoEnd = () => {
    if (!results) {
      calculateResults();
      // Show complete button
      useInteractiveVideoStore.setState({ showCompleteButton: true });
      toast('Video completado. Presione "Finalizar Evaluación" para enviar sus respuestas.', {
        icon: '📋',
        duration: 4000
      });
    }
  };
  
  // Handle answer submission
  const handleAnswer = async (answer: string) => {
    await submitAnswer(answer);
    
    // Resume video after answer - shorter delay for mobile
    const delay = isMobile ? 1500 : 2500;
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play();
        // Ensure the video resumes on mobile
        if (isMobile) {
          setTimeout(() => {
            if (videoRef.current && videoRef.current.paused()) {
              videoRef.current.play();
            }
          }, 200);
        }
      }
    }, delay);
  };
  
  // Handle skip
  const handleSkip = () => {
    skipQuestion();
    if (videoRef.current && isPaused) {
      videoRef.current.play();
    }
  };
  
  // Handle complete evaluation
  const handleCompleteEvaluation = async () => {
    await completeAndExit();
  };
  
  // Calculate progress
  const progress = {
    totalQuestions: questions.length,
    answeredQuestions: answers.length,
    correctAnswers: answers.filter(a => a.isCorrect).length,
    currentScore: questions.length > 0 
      ? Math.round((answers.filter(a => a.isCorrect).length / questions.length) * 100)
      : 0
  };
  
  if (isLoading || !isReady) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando contenido interactivo...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className={`relative bg-black ${isPublicView ? 'w-full h-full min-h-screen' : 'bg-gray-900 rounded-lg overflow-hidden'}`}>
        <div className="relative w-full h-full">
          <VideoPlayer
            ref={videoRef}
            videoId={videoId}
            src={videoUrl}
            autoplay={false}
            controls={true}
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnd}
          />
          
          {/* Progress indicator - compact for mobile */}
          {!currentQuestion && !showCompleteButton && !isMobile && (
            <div className={`absolute top-4 right-4 z-50 ${isFullscreen ? 'scale-110' : ''}`}>
              <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-green-400">{progress.correctAnswers}</span>
                    <span>/</span>
                    <span>{progress.totalQuestions}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-500"></div>
                  <div className="text-blue-400">{progress.currentScore}%</div>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                  <div
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.answeredQuestions / progress.totalQuestions) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Mobile progress indicator - minimal */}
          {!currentQuestion && !showCompleteButton && isMobile && (
            <div className="absolute top-2 right-2 z-50">
              <div className="bg-black/80 text-white px-2 py-1 rounded text-xs">
                {progress.answeredQuestions}/{progress.totalQuestions} • {progress.currentScore}%
              </div>
            </div>
          )}
          
          {/* Interactive overlay for questions */}
          {currentQuestion && (
            <>
              {/* Mobile overlay - render using Portal for fullscreen compatibility */}
              {isMobile ? (
                createPortal(
                  <MobileInteractiveOverlay
                    moment={{
                      id: currentQuestion.id,
                      title: `Pregunta ${answers.length + 1}`,
                      question: currentQuestion
                    }}
                    onAnswer={handleAnswer}
                    onSkip={handleSkip}
                    progress={progress}
                  />,
                  document.body
                )
              ) : (
                /* Desktop overlay - keep as is */
                <div className={`absolute inset-0 ${isFullscreen ? 'z-[2147483647]' : 'z-[9999]'}`}>
                  <InteractiveOverlayEnhanced
                    moment={{
                      id: currentQuestion.id,
                      title: `Pregunta ${answers.length + 1}`,
                      description: '',
                      type: 'exercise',
                      question: currentQuestion
                    }}
                    onAnswer={handleAnswer}
                    onSkip={handleSkip}
                    progress={progress}
                    isFullscreen={isFullscreen}
                  />
                </div>
              )}
            </>
          )}
          
          {/* Complete Evaluation Button */}
          {showCompleteButton && !showResults && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[10000]">
              <div className="bg-gray-800 rounded-xl p-6 md:p-8 max-w-md w-full mx-4 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                    ¡Video Completado!
                  </h3>
                  <p className="text-gray-400">
                    Has visto todo el contenido del video.
                  </p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>Preguntas respondidas: <span className="text-white font-semibold">{progress.answeredQuestions}/{progress.totalQuestions}</span></p>
                    <p>Respuestas correctas: <span className="text-green-400 font-semibold">{progress.correctAnswers}</span></p>
                    <p>Puntuación actual: <span className="text-blue-400 font-semibold">{progress.currentScore}%</span></p>
                  </div>
                </div>
                
                <button
                  onClick={handleCompleteEvaluation}
                  className="w-full py-3 px-6 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  Finalizar y Enviar Evaluación
                </button>
              </div>
            </div>
          )}
          
          {/* Final Results Modal */}
          {showResults && results && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10001] p-4">
              <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className={`w-24 h-24 ${results.passed ? 'bg-green-500' : 'bg-orange-500'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                  
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {results.passed ? '¡Excelente trabajo!' : 'Video Completado'}
                  </h2>
                  
                  <p className="text-gray-400 text-lg">
                    {studentInfo?.name}
                  </p>
                </div>

                {/* Score Card */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-white/80 text-sm mb-1">Puntuación Final</p>
                      <p className="text-4xl font-bold text-white">
                        {results.score}%
                      </p>
                    </div>
                    <div>
                      <p className="text-white/80 text-sm mb-1">Respuestas Correctas</p>
                      <p className="text-4xl font-bold text-white">
                        {results.correctAnswers}/{results.totalQuestions}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/80 text-sm mb-1">Estado</p>
                      <p className={`text-2xl font-bold ${results.passed ? 'text-green-300' : 'text-orange-300'}`}>
                        {results.passed ? 'APROBADO' : 'COMPLETADO'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer note */}
                <p className="text-xs text-gray-500 text-center mt-6">
                  Los resultados han sido guardados y enviados al instructor.
                  <br />
                  <span className="text-yellow-400">La ventana se cerrará automáticamente en 3 segundos...</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Styles */}
      <style jsx>{`
        /* Ensure video fills container */
        .video-js {
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Keep controls visible */
        .video-js .vjs-control-bar {
          z-index: 10 !important;
        }
        
        @media (max-width: 768px) {
          .video-js .vjs-control-bar {
            font-size: 1.2em !important;
            height: 3em !important;
          }
        }
      `}</style>
    </>
  );
};

export default PublicInteractiveVideoPlayer;