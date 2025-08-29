import { useState, useRef, useEffect, FC } from 'react';
import VideoPlayer from '../VideoPlayer';
import InteractiveOverlay from './InteractiveOverlay';
import { interactiveVideoService } from '../../services/interactive-video.service';
import toast from 'react-hot-toast';

interface PublicInteractiveVideoWrapperProps {
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
}

const PublicInteractiveVideoWrapper: FC<PublicInteractiveVideoWrapperProps> = ({
  videoId,
  videoUrl,
  videoTitle = 'Video',
  layerId,
  studentInfo,
  onComplete
}) => {
  const videoRef = useRef<any>(null);
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
  const [completedResults, setCompletedResults] = useState<any>(null);
  
  const responseStartTime = useRef<number>(0);
  const watchTimeStart = Date.now();

  useEffect(() => {
    initializePublicSession();
  }, [videoId, layerId]);

  useEffect(() => {
    if (currentTime > 0 && duration > 0 && interactiveLayer?.aiGeneratedContent?.keyMoments) {
      checkForKeyMoments();
    }
  }, [currentTime]);

  const initializePublicSession = async () => {
    try {
      setIsLoading(true);

      // Obtener la capa interactiva pública
      const layer = await interactiveVideoService.getPublicInteractiveLayer(videoId);
      if (!layer || !layer.aiGeneratedContent) {
        throw new Error('No hay contenido interactivo disponible');
      }
      setInteractiveLayer(layer);

      // Iniciar sesión pública
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
    if (!session) return;

    const watchTimeSeconds = Math.floor((Date.now() - watchTimeStart) / 1000);
    
    try {
      const totalQuestions = interactiveLayer?.aiGeneratedContent?.keyMoments?.length || 0;
      const correctAnswers = session.correctAnswers || 0;
      const calculatedScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      
      const results = {
        sessionId: session.sessionId,
        totalQuestions,
        answeredQuestions: answeredMoments.size,
        correctAnswers,
        currentScore: calculatedScore,
        watchTimeSeconds,
        totalPauses
      };
      
      setCompletedResults(results);
      setVideoCompleted(true);
      
    } catch (error) {
      console.error('Error preparing results:', error);
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!completedResults || !session) return;

    try {
      const finalResults = await interactiveVideoService.completePublicSession(session.sessionId, {
        watchTimeSeconds: completedResults.watchTimeSeconds,
        totalPauses: completedResults.totalPauses
      });

      if (onComplete) {
        onComplete({
          result: {
            score: finalResults.finalScore,
            totalQuestions: finalResults.totalQuestions,
            correctAnswers: finalResults.correctAnswers,
            passed: finalResults.passed,
            answers: session.detailedResponses?.answers || []
          },
          sessionData: finalResults
        });
      }
    } catch (error) {
      console.error('Error completing public session:', error);
      toast.error('Error al completar la evaluación');
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
    <div className="relative bg-gray-900 rounded-lg overflow-hidden" data-vjs-player>
      <div className="relative w-full h-full">
        <VideoPlayer
          ref={videoRef}
          videoId={videoId}
          src={videoUrl}
          title={videoTitle}
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={handleVideoEnd}
        />
        
        {currentMoment && (
          <InteractiveOverlay
            moment={currentMoment}
            onAnswer={handleAnswer}
            onSkip={!interactiveLayer?.requireAnswers ? handleSkip : undefined}
            progress={progress}
          />
        )}
        
        {/* Indicador de progreso */}
        {session && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg z-50">
            <div className="text-sm">
              <p>Preguntas: {answeredMoments.size} / {interactiveLayer?.aiGeneratedContent?.keyMoments?.length || 0}</p>
              <p>Correctas: {session.correctAnswers || 0}</p>
              {session.finalScore !== null && session.finalScore !== undefined && (
                <p>Puntuación: {Number(session.finalScore).toFixed(1)}%</p>
              )}
            </div>
          </div>
        )}

        {/* Marcadores en la línea de tiempo */}
        {duration > 0 && (
          <div className="absolute bottom-16 left-0 right-0 h-2 bg-black bg-opacity-50 mx-4 z-40">
            {interactiveLayer?.aiGeneratedContent?.keyMoments?.map((moment: any) => {
              const position = (moment.timestamp / duration) * 100;
              const isAnswered = answeredMoments.has(moment.id);
              return (
                <div
                  key={moment.id}
                  className={`absolute w-3 h-3 rounded-full transform -translate-y-0.5 ${
                    isAnswered ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  style={{ left: `${position}%` }}
                  title={moment.title}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Overlay de finalización */}
      {videoCompleted && completedResults && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Video Completado!</h3>
              <p className="text-gray-600 mb-6">Has terminado de ver el video y responder las preguntas.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Total de preguntas:</span>
                  <span className="font-medium">{completedResults.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Preguntas respondidas:</span>
                  <span className="font-medium">{completedResults.answeredQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Respuestas correctas:</span>
                  <span className="font-medium text-green-600">{completedResults.correctAnswers}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Puntuación final:</span>
                  <span className={completedResults.currentScore >= 70 ? 'text-green-600' : 'text-red-600'}>
                    {completedResults.currentScore.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmitEvaluation}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Finalizar Evaluación
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicInteractiveVideoWrapper;