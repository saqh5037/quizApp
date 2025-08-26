import React, { useState, useEffect, useRef } from 'react';
import VideoPlayer, { VideoPlayerHandle } from '../VideoPlayer';
import InteractiveOverlay from './InteractiveOverlay';
import { interactiveVideoService } from '../../services/interactive-video.service';
import type { InteractiveLayer, InteractiveSession } from '../../services/interactive-video.service';

interface InteractiveVideoWrapperProps {
  videoId: number;
  videoUrl: string;
  videoTitle?: string;
  onComplete?: (results: any) => void;
}

const InteractiveVideoWrapper: React.FC<InteractiveVideoWrapperProps> = ({
  videoId,
  videoUrl,
  videoTitle,
  onComplete
}) => {
  const [interactiveLayer, setInteractiveLayer] = useState<InteractiveLayer | null>(null);
  const [session, setSession] = useState<InteractiveSession | null>(null);
  const [currentMoment, setCurrentMoment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [answeredMoments, setAnsweredMoments] = useState<Set<string>>(new Set());
  const [watchTimeStart, setWatchTimeStart] = useState(Date.now());
  const [totalPauses, setTotalPauses] = useState(0);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [completedResults, setCompletedResults] = useState<any>(null);

  const videoRef = useRef<VideoPlayerHandle>(null);
  const responseStartTime = useRef<number>(0);

  useEffect(() => {
    loadInteractiveLayer();
  }, [videoId]);

  useEffect(() => {
    if (interactiveLayer?.aiGeneratedContent?.keyMoments && currentTime > 0) {
      checkForKeyMoment();
    }
  }, [currentTime, interactiveLayer]);

  const loadInteractiveLayer = async () => {
    try {
      setIsLoading(true);
      const layer = await interactiveVideoService.getInteractiveLayer(videoId);
      
      if (!layer) {
        setError('No se encontró capa interactiva para este video');
        setIsLoading(false);
        return;
      }

      if (!layer.isEnabled) {
        setError('La capa interactiva no está habilitada');
        setIsLoading(false);
        return;
      }

      if (layer.processingStatus !== 'ready') {
        setError(`El contenido interactivo está ${layer.processingStatus === 'processing' ? 'procesándose' : 'pendiente'}`);
        setIsLoading(false);
        return;
      }

      setInteractiveLayer(layer);
      
      // Iniciar sesión
      const newSession = await interactiveVideoService.startInteractiveSession(layer.id);
      
      // Asegurar que totalQuestions esté correcta basado en los keyMoments
      const totalQuestions = layer.aiGeneratedContent?.keyMoments?.length || 0;
      setSession({
        ...newSession,
        totalQuestions
      });
      
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error loading interactive layer:', err);
      setError('Error al cargar la capa interactiva');
      setIsLoading(false);
    }
  };

  const checkForKeyMoment = () => {
    if (!interactiveLayer?.aiGeneratedContent?.keyMoments) return;

    const moments = interactiveLayer.aiGeneratedContent.keyMoments;
    const currentMomentCheck = moments.find((moment: any) => {
      const momentTime = moment.timestamp;
      const isWithinRange = Math.abs(currentTime - momentTime) < 1;
      const notAnswered = !answeredMoments.has(moment.id);
      return isWithinRange && notAnswered;
    });

    if (currentMomentCheck && !currentMoment) {
      triggerKeyMoment(currentMomentCheck);
    }
  };

  const triggerKeyMoment = (moment: any) => {
    console.log('Triggering key moment:', moment);
    setCurrentMoment(moment);
    responseStartTime.current = Date.now();
    
    // Siempre pausar el video cuando aparece una pregunta
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
      const result = await interactiveVideoService.submitAnswer(session.sessionId, {
        momentId: currentMoment.id,
        questionText: currentMoment.question.text,
        userAnswer: answer,
        correctAnswer: currentMoment.question.correctAnswer,
        responseTimeSeconds: responseTime
      });

      // Marcar momento como respondido
      setAnsweredMoments(prev => new Set(prev).add(currentMoment.id));
      
      // Actualizar la sesión local con el nuevo puntaje
      if (session && result.currentScore !== undefined) {
        setSession(prev => prev ? {
          ...prev,
          correctAnswers: result.progress.correctAnswers,
          finalScore: result.currentScore
        } : null);
      }
      
      // Mostrar resultado brevemente
      setTimeout(() => {
        setCurrentMoment(null);
        if (videoRef.current && isPaused) {
          videoRef.current.play();
          setIsPaused(false);
        }
      }, result.isCorrect ? 2000 : 3000);

    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleSkip = () => {
    if (!currentMoment) return;
    
    setAnsweredMoments(prev => new Set(prev).add(currentMoment.id));
    
    // Limpiar el momento actual y continuar el video después de un breve delay
    setTimeout(() => {
      setCurrentMoment(null);
      if (videoRef.current && isPaused) {
        videoRef.current.play();
        setIsPaused(false);
      }
    }, 500); // Medio segundo de delay para que el usuario vea que saltó la pregunta
  };

  const handleVideoTimeUpdate = (time: number, dur: number) => {
    setCurrentTime(time);
    setDuration(dur);
  };

  const handleVideoEnd = async () => {
    if (!session) return;

    const watchTimeSeconds = Math.floor((Date.now() - watchTimeStart) / 1000);
    
    try {
      // Preparar los resultados pero no completar la sesión aún
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
      const finalResults = await interactiveVideoService.completeSession(session.sessionId, {
        watchTimeSeconds: completedResults.watchTimeSeconds,
        totalPauses: completedResults.totalPauses
      });

      if (onComplete) {
        // Enviar los datos en el formato esperado por PublicInteractiveVideo
        onComplete({
          result: {
            score: completedResults.currentScore,
            totalQuestions: completedResults.totalQuestions,
            correctAnswers: completedResults.correctAnswers,
            passed: completedResults.currentScore >= 70,
            answers: session.detailedResponses || []
          },
          sessionData: finalResults
        });
      }
    } catch (error) {
      console.error('Error completing session:', error);
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

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-8">
        <VideoPlayer
          ref={videoRef}
          videoId={videoId}
          src={videoUrl}
          title={videoTitle}
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={handleVideoEnd}
        />
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
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
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

      {/* Progress indicator */}
      {session && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg">
          <div className="text-sm">
            <p>Preguntas: {answeredMoments.size} / {interactiveLayer?.aiGeneratedContent?.keyMoments?.length || 0}</p>
            <p>Correctas: {session.correctAnswers}</p>
            {session.finalScore !== null && session.finalScore !== undefined && (
              <p>Puntuación: {Number(session.finalScore).toFixed(1)}%</p>
            )}
          </div>
        </div>
      )}

      {/* Timeline markers */}
      {duration > 0 && (
        <div className="absolute bottom-16 left-0 right-0 h-2 bg-black bg-opacity-50 mx-4">
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

export default InteractiveVideoWrapper;