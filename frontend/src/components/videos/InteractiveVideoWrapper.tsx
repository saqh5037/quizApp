import React, { useState, useEffect, useRef } from 'react';
import VideoPlayer from './VideoPlayer';
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

  const videoRef = useRef<any>(null);
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
      setSession(newSession);
      
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
    
    if (interactiveLayer?.autoPause && videoRef.current) {
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
    setCurrentMoment(null);
    
    if (videoRef.current && isPaused) {
      videoRef.current.play();
      setIsPaused(false);
    }
  };

  const handleVideoProgress = (time: number) => {
    setCurrentTime(time);
  };

  const handleVideoDuration = (dur: number) => {
    setDuration(dur);
  };

  const handleVideoEnd = async () => {
    if (!session) return;

    const watchTimeSeconds = Math.floor((Date.now() - watchTimeStart) / 1000);
    
    try {
      const results = await interactiveVideoService.completeSession(session.sessionId, {
        watchTimeSeconds,
        totalPauses
      });

      if (onComplete) {
        onComplete(results);
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
          videoUrl={videoUrl}
          title={videoTitle}
          onProgress={handleVideoProgress}
          onDuration={handleVideoDuration}
          onEnded={handleVideoEnd}
          ref={videoRef}
        />
      </div>
    );
  }

  const progress = session ? {
    totalQuestions: interactiveLayer?.aiGeneratedContent?.keyMoments?.length || 0,
    answeredQuestions: answeredMoments.size,
    correctAnswers: session.correctAnswers,
    currentScore: session.finalScore || 0
  } : null;

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <VideoPlayer
        videoUrl={videoUrl}
        title={videoTitle}
        onProgress={handleVideoProgress}
        onDuration={handleVideoDuration}
        onEnded={handleVideoEnd}
        ref={videoRef}
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
            {session.finalScore !== null && (
              <p>Puntuación: {session.finalScore.toFixed(1)}%</p>
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
    </div>
  );
};

export default InteractiveVideoWrapper;