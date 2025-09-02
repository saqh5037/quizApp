import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Target,
  Clock,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Circle,
  Brain,
  Sparkles,
  Trophy,
  TrendingUp,
  Award,
  Zap,
  Sun,
  Moon,
  Play,
  Pause,
  Timer,
  Coffee,
  BarChart3,
  Layers,
  Map,
  User,
  Calendar,
  Download,
  Share2
} from 'lucide-react';
import educationalResourcesService from '../../services/educationalResourcesService';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface StudySection {
  id: string;
  title: string;
  content: string;
  level: number;
  completed: boolean;
  timeEstimate?: number;
  objectives?: string[];
  keyPoints?: string[];
}

const StudyGuideGlass: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  
  // State
  const [darkMode, setDarkMode] = useState(false);
  const [sections, setSections] = useState<StudySection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [studyTime, setStudyTime] = useState(0);
  const [isStudying, setIsStudying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes
  const [focusMode, setFocusMode] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Fetch study guide data
  const { data: guideData, isLoading, error } = useQuery({
    queryKey: ['studyGuide', resourceId],
    queryFn: () => educationalResourcesService.getResource('study_guide', resourceId!),
    enabled: !!resourceId
  });

  // Parse content into sections
  useEffect(() => {
    if (guideData?.content) {
      const parsedSections = parseContentToSections(guideData.content);
      setSections(parsedSections);
      // Auto-expand first section
      if (parsedSections.length > 0) {
        setExpandedSections(new Set([parsedSections[0].id]));
        setCurrentSection(parsedSections[0].id);
      }
    }
  }, [guideData]);

  // Study timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStudying) {
      interval = setInterval(() => {
        setStudyTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStudying]);

  // Pomodoro timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(prev => prev - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      setPomodoroActive(false);
      toast.success('¡Tiempo de descanso! Toma 5 minutos');
      setPomodoroTime(25 * 60);
    }
    return () => clearInterval(interval);
  }, [pomodoroActive, pomodoroTime]);

  const parseContentToSections = (content: string): StudySection[] => {
    const lines = content.split('\n');
    const sections: StudySection[] = [];
    let currentSection: StudySection | null = null;
    let sectionIndex = 0;

    lines.forEach(line => {
      const headerMatch = line.match(/^(#{1,3})\s+(.+)/);
      if (headerMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          id: `section-${sectionIndex++}`,
          title: headerMatch[2],
          content: '',
          level: headerMatch[1].length,
          completed: false,
          timeEstimate: Math.floor(Math.random() * 10) + 5,
          objectives: [],
          keyPoints: []
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
    setCurrentSection(sectionId);
  };

  const toggleSectionComplete = (sectionId: string) => {
    const newCompleted = new Set(completedSections);
    if (newCompleted.has(sectionId)) {
      newCompleted.delete(sectionId);
    } else {
      newCompleted.add(sectionId);
      
      // Check if all sections completed
      if (newCompleted.size === sections.length) {
        setShowConfetti(true);
        toast.success('¡Felicidades! Has completado toda la guía de estudio 🎉');
        setTimeout(() => setShowConfetti(false), 5000);
      }
    }
    setCompletedSections(newCompleted);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPomodoroTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = sections.length > 0 
    ? (completedSections.size / sections.length) * 100 
    : 0;

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'from-green-400 to-emerald-500';
      case 'intermediate': return 'from-yellow-400 to-orange-500';
      case 'advanced': return 'from-red-400 to-pink-500';
      default: return 'from-blue-400 to-indigo-500';
    }
  };

  const handleDownload = () => {
    if (!guideData?.content) return;
    
    const blob = new Blob([guideData.content], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${guideData.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Guía descargada');
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'} flex items-center justify-center`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <GraduationCap className="h-16 w-16 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'} p-6`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8">
            <h2 className="text-red-600 font-bold text-2xl mb-2">Error</h2>
            <p className="text-red-500">No se pudo cargar la guía de estudio.</p>
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
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'}`}>
      {showConfetti && <Confetti />}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-white/10 backdrop-blur-xl border-b border-white/20"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/manuals/${guideData?.manual?.id}/resources`)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
              </button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {guideData?.title || 'Guía de Estudio'}
                </h1>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {guideData?.manual?.title}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getDifficultyColor(guideData?.difficulty_level || 'beginner')} text-white`}>
                    {guideData?.difficulty_level || 'Intermedio'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Focus Mode */}
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${
                  focusMode ? 'bg-blue-500/20 text-blue-600' : 'bg-white/10'
                }`}
              >
                <Target className="h-5 w-5" />
                <span className="text-sm">Focus</span>
              </button>

              {/* Download */}
              <button
                onClick={handleDownload}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <Download className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
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

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Progreso: {completedSections.size} de {sections.length} secciones
              </span>
              <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className={`grid ${focusMode ? 'grid-cols-1' : 'grid-cols-12'} gap-8`}>
          {/* Left Sidebar - Study Tools */}
          {!focusMode && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="col-span-3"
            >
              {/* Study Timer */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-4">
                <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ⏱️ Tiempo de Estudio
                </h3>
                <div className="text-center">
                  <div className={`text-3xl font-mono font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatTime(studyTime)}
                  </div>
                  <button
                    onClick={() => setIsStudying(!isStudying)}
                    className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${
                      isStudying
                        ? 'bg-red-500/20 text-red-600 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-600 hover:bg-green-500/30'
                    }`}
                  >
                    {isStudying ? (
                      <>
                        <Pause className="h-5 w-5 inline mr-2" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 inline mr-2" />
                        Iniciar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Pomodoro Timer */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-4">
                <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🍅 Pomodoro
                </h3>
                <div className="text-center">
                  <div className={`text-3xl font-mono font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatPomodoroTime(pomodoroTime)}
                  </div>
                  <button
                    onClick={() => setPomodoroActive(!pomodoroActive)}
                    className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${
                      pomodoroActive
                        ? 'bg-orange-500/20 text-orange-600 hover:bg-orange-500/30'
                        : 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30'
                    }`}
                  >
                    {pomodoroActive ? (
                      <>
                        <Coffee className="h-5 w-5 inline mr-2" />
                        Detener
                      </>
                    ) : (
                      <>
                        <Timer className="h-5 w-5 inline mr-2" />
                        Iniciar Pomodoro
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Learning Stats */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📊 Estadísticas
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Tiempo estimado
                    </span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {guideData?.estimated_time || 60} min
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Completado
                    </span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Secciones
                    </span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {completedSections.size}/{sections.length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${focusMode ? 'col-span-12 max-w-4xl mx-auto' : 'col-span-6'}`}
          >
            {/* Learning Objectives */}
            {guideData?.learning_objectives && guideData.learning_objectives.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6"
              >
                <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Target className="h-5 w-5 text-blue-500" />
                  Objetivos de Aprendizaje
                </h3>
                <ul className="space-y-2">
                  {guideData.learning_objectives.map((objective: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {objective}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Content Sections */}
            <div className="space-y-4">
              {sections.map((section, index) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden ${
                    currentSection === section.id ? 'ring-2 ring-blue-500/50' : ''
                  }`}
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSectionComplete(section.id);
                        }}
                        className="flex-shrink-0"
                      >
                        {completedSections.has(section.id) ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <Circle className={`h-6 w-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        )}
                      </button>
                      <div className="text-left">
                        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {section.title}
                        </h3>
                        {section.timeEstimate && (
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              ~{section.timeEstimate} min
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedSections.has(section.id) ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    </motion.div>
                  </button>

                  {/* Section Content */}
                  <AnimatePresence>
                    {expandedSections.has(section.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="px-6 pb-6"
                      >
                        <div className={`prose prose-lg max-w-none ${darkMode ? 'prose-invert' : ''}`}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={atomDark}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {section.content}
                          </ReactMarkdown>
                        </div>

                        {/* Section Notes */}
                        <div className="mt-6 p-4 bg-yellow-500/10 rounded-xl">
                          <h4 className={`font-medium mb-2 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                            📝 Tus Notas
                          </h4>
                          <textarea
                            value={notes[section.id] || ''}
                            onChange={(e) => setNotes({ ...notes, [section.id]: e.target.value })}
                            placeholder="Escribe tus notas aquí..."
                            className={`w-full p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur ${
                              darkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-600'
                            } resize-none`}
                            rows={3}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => {
                  const currentIdx = sections.findIndex(s => s.id === currentSection);
                  if (currentIdx > 0) {
                    const prevSection = sections[currentIdx - 1];
                    setCurrentSection(prevSection.id);
                    setExpandedSections(new Set([prevSection.id]));
                  }
                }}
                className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/20 transition-colors"
              >
                ← Sección Anterior
              </button>
              <button
                onClick={() => {
                  const currentIdx = sections.findIndex(s => s.id === currentSection);
                  if (currentIdx < sections.length - 1) {
                    const nextSection = sections[currentIdx + 1];
                    setCurrentSection(nextSection.id);
                    setExpandedSections(new Set([nextSection.id]));
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                Siguiente Sección →
              </button>
            </div>
          </motion.div>

          {/* Right Sidebar - Progress & Achievements */}
          {!focusMode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="col-span-3"
            >
              {/* Mind Map */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-4">
                <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🗺️ Mapa de Contenido
                </h3>
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setCurrentSection(section.id);
                        setExpandedSections(new Set([section.id]));
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        currentSection === section.id
                          ? 'bg-blue-500/20 text-blue-600'
                          : completedSections.has(section.id)
                          ? 'bg-green-500/10 text-green-600'
                          : 'hover:bg-white/10'
                      }`}
                      style={{ paddingLeft: `${section.level * 12}px` }}
                    >
                      <div className="flex items-center gap-2">
                        {completedSections.has(section.id) ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                        <span className={`text-sm truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {section.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Achievements */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🏆 Logros
                </h3>
                <div className="space-y-3">
                  {/* First Section */}
                  <motion.div
                    animate={{ scale: completedSections.size >= 1 ? 1 : 0.9 }}
                    className={`p-3 rounded-xl ${
                      completedSections.size >= 1
                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20'
                        : 'bg-gray-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className={`h-6 w-6 ${completedSections.size >= 1 ? 'text-green-500' : 'text-gray-400'}`} />
                      <div>
                        <p className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Iniciado
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Primera sección
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Half Way */}
                  <motion.div
                    animate={{ scale: completedSections.size >= Math.floor(sections.length / 2) ? 1 : 0.9 }}
                    className={`p-3 rounded-xl ${
                      completedSections.size >= Math.floor(sections.length / 2)
                        ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20'
                        : 'bg-gray-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className={`h-6 w-6 ${
                        completedSections.size >= Math.floor(sections.length / 2) ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                      <div>
                        <p className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Progreso
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          50% completado
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Complete */}
                  <motion.div
                    animate={{ scale: completedSections.size === sections.length ? 1 : 0.9 }}
                    className={`p-3 rounded-xl ${
                      completedSections.size === sections.length
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20'
                        : 'bg-gray-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Trophy className={`h-6 w-6 ${
                        completedSections.size === sections.length ? 'text-purple-500' : 'text-gray-400'
                      }`} />
                      <div>
                        <p className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Maestría
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Guía completa
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Study Time */}
                  <motion.div
                    animate={{ scale: studyTime >= 1800 ? 1 : 0.9 }}
                    className={`p-3 rounded-xl ${
                      studyTime >= 1800
                        ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20'
                        : 'bg-gray-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Zap className={`h-6 w-6 ${studyTime >= 1800 ? 'text-orange-500' : 'text-gray-400'}`} />
                      <div>
                        <p className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Dedicado
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          30+ minutos
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyGuideGlass;