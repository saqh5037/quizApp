import { useState, useRef, useEffect, FC } from 'react';
import { createPortal } from 'react-dom';
import VideoPlayer from '../VideoPlayer';
import InteractiveOverlayEnhanced from './InteractiveOverlayEnhanced';
import { interactiveVideoService } from '../../services/interactive-video.service';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Trophy, RefreshCw } from 'lucide-react';

interface PublicInteractiveVideoWrapperEnhancedProps {
  videoId: number;
  videoUrl: string;
  videoTitle?: string;
  layerId: number;
  studentInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  onComplete?: (results: any) => void;
  isPublicView?: boolean;
}

const PublicInteractiveVideoWrapperEnhanced: FC<PublicInteractiveVideoWrapperEnhancedProps> = ({
  videoId,
  videoUrl,
  videoTitle = 'Video',
  layerId,
  studentInfo,
  onComplete,
  isPublicView = true
}) => {
  const videoRef = useRef<any>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const [interactiveLayer, setInteractiveLayer] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [currentMoment, setCurrentMoment] = useState<any>(null);
  const [answeredMoments, setAnsweredMoments] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [totalPauses, setTotalPauses] = useState(0);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [finalResults, setFinalResults] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const responseStartTime = useRef<number>(0);
  const watchTimeStart = useRef<number>(Date.now());

  useEffect(() => {
    initializePublicSession();
    
    // Enhanced fullscreen detection
    const handleFullscreenChange = () => {
      const isFS = !!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement
      );
      console.log('Fullscreen state changed:', isFS);
      setIsFullscreen(isFS);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Initial check
    handleFullscreenChange();
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [videoId, layerId]);

  useEffect(() => {
    if (currentTime > 0 && duration > 0 && interactiveLayer?.aiGeneratedContent?.keyMoments) {
      checkForKeyMoments();
    }
  }, [currentTime]);

  const initializePublicSession = async () => {
    try {
      setIsLoading(true);

      // Get public interactive layer
      const layer = await interactiveVideoService.getPublicInteractiveLayer(videoId);
      if (!layer || !layer.aiGeneratedContent) {
        throw new Error('No hay contenido interactivo disponible');
      }
      setInteractiveLayer(layer);

      // Start public session
      const sessionData = await interactiveVideoService.startPublicSession(layerId, {
        studentName: studentInfo.name,
        studentEmail: studentInfo.email,
        studentPhone: studentInfo.phone
      });

      setSession(sessionData.result);
      toast.success('Sesión interactiva iniciada');
    } catch (error) {
      console.error('Error initializing public session:', error);
      toast.error('Error al iniciar sesión interactiva');
    } finally {
      setIsLoading(false);
    }
  };

  const checkForKeyMoments = () => {
    if (!interactiveLayer?.aiGeneratedContent?.keyMoments || currentMoment) {
      return;
    }

    const currentMomentCheck = interactiveLayer.aiGeneratedContent.keyMoments.find((moment: any) => {
      const timeDiff = Math.abs(currentTime - moment.timestamp);
      return timeDiff < 1 && !answeredMoments.has(moment.id);
    });

    if (currentMomentCheck && !currentMoment) {
      triggerKeyMoment(currentMomentCheck);
    }
  };

  const triggerKeyMoment = (moment: any) => {
    console.log('Triggering key moment:', moment);
    setCurrentMoment(moment);
    responseStartTime.current = Date.now();
    
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPaused(true);
      setTotalPauses(prev => prev + 1);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!session || !currentMoment) return;

    const responseTime = Math.floor((Date.now() - responseStartTime.current) / 1000);

    try {
      const result = await interactiveVideoService.submitPublicAnswer(session.sessionId, {
        momentId: currentMoment.id,
        questionText: currentMoment.question.text,
        userAnswer: answer,
        correctAnswer: currentMoment.question.correctAnswer,
        responseTimeSeconds: responseTime
      });

      setAnsweredMoments(prev => new Set(prev).add(currentMoment.id));
      
      if (result.currentScore !== undefined) {
        setSession(prev => ({
          ...prev,
          correctAnswers: result.progress.correctAnswers,
          totalQuestions: result.progress.totalQuestions,
          finalScore: result.currentScore
        }));
      }

      const isCorrect = result.isCorrect;
      toast(isCorrect ? '¡Correcto!' : 'Incorrecto', {
        icon: isCorrect ? '✅' : '❌',
        duration: 2000
      });
      
      setTimeout(() => {
        setCurrentMoment(null);
        if (videoRef.current && isPaused) {
          videoRef.current.play();
          setIsPaused(false);
        }
      }, isCorrect ? 2000 : 3000);

    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Error al enviar respuesta');
    }
  };

  const handleSkip = () => {
    if (!currentMoment) return;
    
    setAnsweredMoments(prev => new Set(prev).add(currentMoment.id));
    
    setTimeout(() => {
      setCurrentMoment(null);
      if (videoRef.current && isPaused) {
        videoRef.current.play();
        setIsPaused(false);
      }
    }, 500);
  };

  const handleVideoTimeUpdate = (time: number, dur: number) => {
    setCurrentTime(time);
    setDuration(dur);
  };

  const handleVideoEnd = async () => {
    if (!session || videoCompleted) return;
    
    setVideoCompleted(true);
    const watchTimeSeconds = Math.floor((Date.now() - watchTimeStart.current) / 1000);
    
    try {
      // Complete the session automatically
      const finalResults = await interactiveVideoService.completePublicSession(session.sessionId, {
        watchTimeSeconds,
        totalPauses
      });

      setFinalResults({
        score: finalResults.finalScore,
        totalQuestions: finalResults.totalQuestions,
        correctAnswers: finalResults.correctAnswers,
        passed: finalResults.passed,
        answers: session.detailedResponses?.answers || []
      });

      // Show results after a brief delay
      setTimeout(() => {
        setShowFinalResults(true);
        if (onComplete) {
          onComplete({
            result: finalResults,
            sessionData: finalResults
          });
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Error al completar la evaluación');
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleClose = () => {
    // Just close the modal, don't redirect
    setShowFinalResults(false);
    // If in a popup/new tab, try to close it
    if (window.opener) {
      window.close();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando contenido interactivo...</p>
        </div>
      </div>
    );
  }

  const progress = session ? {
    totalQuestions: interactiveLayer?.aiGeneratedContent?.keyMoments?.length || 0,
    answeredQuestions: answeredMoments.size,
    correctAnswers: session.correctAnswers || 0,
    currentScore: Number(session.finalScore) || 0
  } : null;

  return (
    <>
      <div className="relative bg-gray-900 rounded-lg overflow-hidden" data-vjs-player>
        <div className="relative w-full h-full" ref={overlayContainerRef}>
          <VideoPlayer
            ref={videoRef}
            videoId={videoId}
            src={videoUrl}
            autoplay={false}
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnd}
          />
          
          {/* Progress indicator in corner */}
          {progress && !currentMoment && (
            <div className={`absolute top-4 right-4 z-50 ${isFullscreen ? 'fullscreen-progress' : ''}`}>
              <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-green-400">{progress.correctAnswers}</span>
                    <span>/</span>
                    <span>{progress.totalQuestions}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-500"></div>
                  <div className="text-blue-400">{Math.round(progress.currentScore)}%</div>
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

          {/* Interactive overlay - regular mode */}
          {currentMoment && !isFullscreen && (
            <div className="absolute inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
              <InteractiveOverlayEnhanced
                moment={currentMoment}
                onAnswer={handleAnswer}
                onSkip={handleSkip}
                progress={progress}
                isFullscreen={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Final Results Modal */}
      {showFinalResults && finalResults && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10000] p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className={`w-24 h-24 ${finalResults.passed ? 'bg-green-500' : 'bg-orange-500'} rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in`}>
                {finalResults.passed ? (
                  <Trophy className="w-12 h-12 text-white" />
                ) : (
                  <CheckCircle className="w-12 h-12 text-white" />
                )}
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2">
                {finalResults.passed ? '¡Excelente trabajo!' : 'Video Completado'}
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
                    {finalResults.score.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Respuestas Correctas</p>
                  <p className="text-4xl font-bold text-white">
                    {finalResults.correctAnswers}/{finalResults.totalQuestions}
                  </p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Estado</p>
                  <p className={`text-2xl font-bold ${finalResults.passed ? 'text-green-300' : 'text-orange-300'}`}>
                    {finalResults.passed ? 'APROBADO' : 'COMPLETADO'}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            {finalResults.answers && finalResults.answers.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
                <h3 className="text-white font-semibold mb-3">Resumen de Respuestas</h3>
                <div className="space-y-2">
                  {finalResults.answers.map((answer: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">Pregunta {index + 1}</span>
                      {answer.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={handleRetry}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Intentar Nuevamente
              </button>
              
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>

            {/* Footer note */}
            <p className="text-xs text-gray-500 text-center mt-6">
              Los resultados han sido guardados y enviados al instructor
            </p>
          </div>
        </div>
      )}

      {/* Enhanced styles for fullscreen and mobile */}
      <style jsx>{`
        .fullscreen-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 2147483647 !important;
          background: rgba(0, 0, 0, 0.8) !important;
          backdrop-filter: blur(4px) !important;
        }
        
        .fullscreen-progress {
          position: fixed !important;
          top: 20px !important;
          right: 20px !important;
          z-index: 2147483646 !important;
        }
        
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        
        /* Mobile specific improvements */
        @media (max-width: 768px) {
          .fullscreen-overlay {
            padding: 10px !important;
          }
          
          .fullscreen-progress {
            top: 10px !important;
            right: 10px !important;
            transform: scale(0.9);
          }
        }
        
        /* Ensure video controls don't interfere */
        .video-js .vjs-control-bar {
          z-index: 1000 !important;
        }
        
        .video-js .vjs-big-play-button {
          z-index: 1000 !important;
        }
      `}</style>

      {/* Fullscreen progress indicator using Portal */}
      {progress && isFullscreen && !currentMoment && createPortal(
        <div 
          className="fixed top-5 right-5 z-[2147483646]"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 2147483646
          }}
        >
          <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-green-400">{progress.correctAnswers}</span>
                <span>/</span>
                <span>{progress.totalQuestions}</span>
              </div>
              <div className="w-px h-4 bg-gray-500"></div>
              <div className="text-blue-400">{Math.round(progress.currentScore)}%</div>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${(progress.answeredQuestions / progress.totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Fullscreen overlay using Portal */}
      {currentMoment && isFullscreen && createPortal(
        <div 
          className="fixed inset-0 z-[2147483647] bg-black bg-opacity-85 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm"
          style={{ 
            pointerEvents: 'auto',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
        >
          <InteractiveOverlayEnhanced
            moment={currentMoment}
            onAnswer={handleAnswer}
            onSkip={handleSkip}
            progress={progress}
            isFullscreen={true}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default PublicInteractiveVideoWrapperEnhanced;