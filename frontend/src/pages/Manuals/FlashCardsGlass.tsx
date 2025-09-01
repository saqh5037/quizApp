import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useSpring as useReactSpring, animated } from '@react-spring/web';
import Confetti from 'react-confetti';
import {
  ArrowLeft,
  Shuffle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Zap,
  Trophy,
  Brain,
  Target,
  Sparkles,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Play,
  Pause,
  SkipForward,
  Info,
  Check,
  X,
  Star,
  Award,
  TrendingUp,
  Clock,
  Hash
} from 'lucide-react';
import educationalResourcesService from '../../services/educationalResourcesService';
import toast from 'react-hot-toast';

interface FlashCard {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  learned?: boolean;
}

const FlashCardsGlass: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  
  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [learnedCards, setLearnedCards] = useState<Set<string>>(new Set());
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [stats, setStats] = useState({
    correct: 0,
    incorrect: 0,
    streak: 0,
    bestStreak: 0,
    startTime: Date.now()
  });
  
  // Refs for audio
  const flipSound = useRef<HTMLAudioElement | null>(null);
  const correctSound = useRef<HTMLAudioElement | null>(null);
  const wrongSound = useRef<HTMLAudioElement | null>(null);
  
  // Fetch flash cards data
  const { data: flashCardsData, isLoading, error } = useQuery({
    queryKey: ['flashCards', resourceId],
    queryFn: () => educationalResourcesService.getResource('flash_cards', resourceId!),
    enabled: !!resourceId
  });

  // Initialize cards
  useEffect(() => {
    if (flashCardsData?.cards) {
      const formattedCards: FlashCard[] = flashCardsData.cards.map((card: any, index: number) => ({
        id: `card-${index}`,
        front: card.front || card.question,
        back: card.back || card.answer,
        category: card.category,
        difficulty: card.difficulty || 'medium',
        learned: false
      }));
      setCards(formattedCards);
    }
  }, [flashCardsData]);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && !isFlipped) {
      const timer = setTimeout(() => {
        handleFlip();
      }, 3000);
      return () => clearTimeout(timer);
    } else if (autoPlay && isFlipped) {
      const timer = setTimeout(() => {
        handleNext();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isFlipped, currentIndex]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleFlip();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 's':
          handleShuffle();
          break;
        case 'r':
          handleReset();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, cards]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (soundEnabled && flipSound.current) {
      flipSound.current.play().catch(() => {});
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setSwipeDirection('left');
      setTimeout(() => setSwipeDirection(null), 300);
    } else {
      // Completed all cards
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setSwipeDirection('right');
      setTimeout(() => setSwipeDirection(null), 300);
    }
  };

  const handleShuffle = () => {
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffledCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShuffled(true);
    toast.success('¡Tarjetas barajadas!');
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setLearnedCards(new Set());
    setStats({
      correct: 0,
      incorrect: 0,
      streak: 0,
      bestStreak: 0,
      startTime: Date.now()
    });
    toast.success('¡Progreso reiniciado!');
  };

  const handleMarkAsLearned = () => {
    const currentCard = cards[currentIndex];
    const newLearnedCards = new Set(learnedCards);
    
    if (learnedCards.has(currentCard.id)) {
      newLearnedCards.delete(currentCard.id);
      setStats(prev => ({
        ...prev,
        incorrect: prev.incorrect + 1,
        streak: 0
      }));
      if (soundEnabled && wrongSound.current) {
        wrongSound.current.play().catch(() => {});
      }
      toast.error('Marcada como no aprendida');
    } else {
      newLearnedCards.add(currentCard.id);
      const newStreak = stats.streak + 1;
      setStats(prev => ({
        ...prev,
        correct: prev.correct + 1,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak)
      }));
      if (soundEnabled && correctSound.current) {
        correctSound.current.play().catch(() => {});
      }
      toast.success('¡Marcada como aprendida!');
    }
    
    setLearnedCards(newLearnedCards);
    
    // Auto advance after marking
    setTimeout(() => {
      handleNext();
    }, 1000);
  };

  const handleComplete = () => {
    setShowConfetti(true);
    const elapsedTime = Math.floor((Date.now() - stats.startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    
    toast.success(
      <div>
        <h3 className="font-bold text-lg mb-2">¡Sesión Completada! 🎉</h3>
        <p>Tarjetas aprendidas: {learnedCards.size}/{cards.length}</p>
        <p>Mejor racha: {stats.bestStreak} 🔥</p>
        <p>Tiempo: {minutes}:{seconds.toString().padStart(2, '0')}</p>
      </div>,
      { duration: 5000 }
    );
    
    setTimeout(() => setShowConfetti(false), 5000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'from-green-400 to-emerald-500';
      case 'medium': return 'from-yellow-400 to-orange-500';
      case 'hard': return 'from-red-400 to-pink-500';
      default: return 'from-blue-400 to-indigo-500';
    }
  };

  const progress = ((currentIndex + 1) / cards.length) * 100;
  const currentCard = cards[currentIndex];

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'} flex items-center justify-center`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Brain className="h-16 w-16 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (error || !cards.length) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'} p-6`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8">
            <h2 className="text-red-600 font-bold text-2xl mb-2">Error</h2>
            <p className="text-red-500">No se pudieron cargar las tarjetas de estudio.</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-6 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600"
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'} relative overflow-hidden`}>
      {/* Confetti Effect */}
      {showConfetti && <Confetti />}
      
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)',
            ]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute inset-0"
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-white/10 backdrop-blur-xl border-b border-white/20"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/manuals/${flashCardsData?.manual?.id}/resources`)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
              </button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {flashCardsData?.set_title || 'Tarjetas de Estudio'}
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {flashCardsData?.manual?.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                {soundEnabled ? (
                  <Volume2 className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
                ) : (
                  <VolumeX className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
                )}
              </button>
              
              {/* Dark Mode */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-yellow-400" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Tarjeta {currentIndex + 1} de {cards.length}
            </span>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {Math.round(progress)}% completado
            </span>
          </div>
          <div className="h-2 bg-white/20 backdrop-blur rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Stats Panel */}
          <div className="col-span-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sticky top-24"
            >
              <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📊 Estadísticas
              </h3>
              
              <div className="space-y-4">
                {/* Learned Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Aprendidas</span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {learnedCards.size}/{cards.length}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      animate={{ width: `${(learnedCards.size / cards.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Streak */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Racha actual</span>
                  </div>
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {stats.streak}
                  </span>
                </div>

                {/* Best Streak */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-orange-500" />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mejor racha</span>
                  </div>
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {stats.bestStreak}
                  </span>
                </div>

                {/* Success Rate */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Precisión</span>
                  </div>
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {stats.correct + stats.incorrect > 0
                      ? `${Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100)}%`
                      : '0%'}
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tiempo</span>
                  </div>
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {Math.floor((Date.now() - stats.startTime) / 60000)}:
                    {((Date.now() - stats.startTime) % 60000 / 1000).toFixed(0).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={handleShuffle}
                  className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Shuffle className="h-4 w-4" />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Barajar</span>
                </button>
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Reiniciar</span>
                </button>
                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`w-full px-4 py-2 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    autoPlay ? 'bg-blue-500/20 hover:bg-blue-500/30' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {autoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {autoPlay ? 'Pausar' : 'Auto Play'}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Flash Card */}
          <div className="col-span-6">
            <AnimatePresence mode="wait">
              {currentCard && (
                <motion.div
                  key={currentCard.id}
                  initial={{ opacity: 0, scale: 0.8, rotateY: -180 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    rotateY: 0,
                    x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0
                  }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.8,
                    x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="relative h-[500px] cursor-pointer"
                  onClick={handleFlip}
                  style={{ perspective: 1000 }}
                >
                  <motion.div
                    className="absolute inset-0 w-full h-full"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Front of Card */}
                    <div
                      className="absolute inset-0 w-full h-full backface-hidden"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className={`h-full bg-gradient-to-br ${getDifficultyColor(currentCard.difficulty || 'medium')} p-1 rounded-3xl`}>
                        <div className="h-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl p-8 flex flex-col">
                          {/* Card Header */}
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                              <Brain className="h-5 w-5 text-blue-500" />
                              <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Pregunta
                              </span>
                            </div>
                            {currentCard.category && (
                              <span className="px-3 py-1 bg-blue-500/20 text-blue-600 text-xs font-medium rounded-full">
                                {currentCard.category}
                              </span>
                            )}
                          </div>

                          {/* Card Content */}
                          <div className="flex-1 flex items-center justify-center">
                            <h2 className={`text-2xl md:text-3xl font-bold text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {currentCard.front}
                            </h2>
                          </div>

                          {/* Card Footer */}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {['easy', 'medium', 'hard'].map((level) => (
                                <div
                                  key={level}
                                  className={`w-2 h-2 rounded-full ${
                                    level === currentCard.difficulty
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                                      : 'bg-gray-300/30'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              Click para voltear
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Back of Card */}
                    <div
                      className="absolute inset-0 w-full h-full backface-hidden"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <div className="h-full bg-gradient-to-br from-purple-500 to-pink-500 p-1 rounded-3xl">
                        <div className="h-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl p-8 flex flex-col">
                          {/* Card Header */}
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-purple-500" />
                              <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Respuesta
                              </span>
                            </div>
                            {learnedCards.has(currentCard.id) && (
                              <span className="px-3 py-1 bg-green-500/20 text-green-600 text-xs font-medium rounded-full flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Aprendida
                              </span>
                            )}
                          </div>

                          {/* Card Content */}
                          <div className="flex-1 flex items-center justify-center">
                            <p className={`text-xl md:text-2xl text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {currentCard.back}
                            </p>
                          </div>

                          {/* Card Footer */}
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsLearned();
                              }}
                              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                                learnedCards.has(currentCard.id)
                                  ? 'bg-gray-500/20 text-gray-600'
                                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg'
                              }`}
                            >
                              {learnedCards.has(currentCard.id) ? (
                                <>
                                  <X className="h-5 w-5 inline mr-2" />
                                  No aprendida
                                </>
                              ) : (
                                <>
                                  <Check className="h-5 w-5 inline mr-2" />
                                  ¡La sé!
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  currentIndex === 0
                    ? 'bg-gray-300/20 text-gray-400 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/20 text-gray-700 dark:text-gray-300'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
                Anterior
              </button>

              <div className="flex items-center gap-2">
                {cards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentIndex(index);
                      setIsFlipped(false);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-500'
                        : learnedCards.has(`card-${index}`)
                        ? 'bg-green-500'
                        : 'bg-gray-300/30'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={currentIndex === cards.length - 1}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  currentIndex === cards.length - 1
                    ? 'bg-gray-300/20 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                }`}
              >
                Siguiente
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Achievements Panel */}
          <div className="col-span-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
            >
              <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                🏆 Logros
              </h3>
              
              <div className="space-y-3">
                {/* First Card */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: learnedCards.size >= 1 ? 1 : 0.8 }}
                  className={`p-3 rounded-xl ${
                    learnedCards.size >= 1
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20'
                      : 'bg-gray-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Star className={`h-8 w-8 ${learnedCards.size >= 1 ? 'text-yellow-500' : 'text-gray-400'}`} />
                    <div>
                      <p className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Primera Tarjeta
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Aprende tu primera tarjeta
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Half Way */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: learnedCards.size >= cards.length / 2 ? 1 : 0.8 }}
                  className={`p-3 rounded-xl ${
                    learnedCards.size >= cards.length / 2
                      ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20'
                      : 'bg-gray-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className={`h-8 w-8 ${learnedCards.size >= cards.length / 2 ? 'text-blue-500' : 'text-gray-400'}`} />
                    <div>
                      <p className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Mitad del Camino
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        50% completado
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Master */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: learnedCards.size === cards.length ? 1 : 0.8 }}
                  className={`p-3 rounded-xl ${
                    learnedCards.size === cards.length
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20'
                      : 'bg-gray-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Award className={`h-8 w-8 ${learnedCards.size === cards.length ? 'text-purple-500' : 'text-gray-400'}`} />
                    <div>
                      <p className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Maestro
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Todas las tarjetas aprendidas
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Streak 5 */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: stats.bestStreak >= 5 ? 1 : 0.8 }}
                  className={`p-3 rounded-xl ${
                    stats.bestStreak >= 5
                      ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20'
                      : 'bg-gray-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Zap className={`h-8 w-8 ${stats.bestStreak >= 5 ? 'text-orange-500' : 'text-gray-400'}`} />
                    <div>
                      <p className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        En Racha
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        5 respuestas seguidas
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className={`font-medium text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  ⌨️ Atajos de Teclado
                </h4>
                <div className={`space-y-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  <div>Espacio - Voltear tarjeta</div>
                  <div>← → - Navegar</div>
                  <div>S - Barajar</div>
                  <div>R - Reiniciar</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Hidden Audio Elements */}
      <audio ref={flipSound} src="/sounds/flip.mp3" preload="auto" />
      <audio ref={correctSound} src="/sounds/correct.mp3" preload="auto" />
      <audio ref={wrongSound} src="/sounds/wrong.mp3" preload="auto" />
    </div>
  );
};

export default FlashCardsGlass;