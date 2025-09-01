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
  FileText,
  Calendar,
  User,
  Loader2,
  Download,
  Share2,
  BookOpen,
  Clock,
  Hash,
  Sun,
  Moon,
  Sparkles,
  ChevronUp,
  Bookmark,
  Copy,
  Check,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import educationalResourcesService from '../../services/educationalResourcesService';
import toast from 'react-hot-toast';

const ViewSummaryGlass: React.FC = () => {
  const { summaryId } = useParams<{ summaryId: string }>();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [showTableOfContents, setShowTableOfContents] = useState(true);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [bookmarkedSections, setBookmarkedSections] = useState<string[]>([]);
  const [readingProgress, setReadingProgress] = useState(0);
  const [focusMode, setFocusMode] = useState(false);

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['summary', summaryId],
    queryFn: () => educationalResourcesService.getResource('summary', summaryId!),
    enabled: !!summaryId,
    refetchInterval: (data) => {
      return data?.status === 'generating' ? 2000 : false;
    }
  });

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setReadingProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSummaryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      brief: '✨ Resumen Breve',
      detailed: '📚 Resumen Detallado',
      key_points: '🎯 Puntos Clave'
    };
    return labels[type] || '📄 Resumen';
  };

  const handleCopySection = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    toast.success('Sección copiada al portapapeles');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const toggleBookmark = (sectionId: string) => {
    setBookmarkedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleDownload = () => {
    if (!summary?.content) return;
    
    const blob = new Blob([summary.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Resumen descargado');
  };

  const handleShare = async () => {
    if (navigator.share && summary) {
      try {
        await navigator.share({
          title: summary.title,
          text: summary.content?.substring(0, 200) + '...',
          url: window.location.href
        });
      } catch (err) {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Enlace copiado al portapapeles');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  // Parse content into sections
  const parseSections = (content: string) => {
    const sections = content.split(/(?=^#{1,3}\s)/m);
    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const titleMatch = lines[0]?.match(/^(#{1,3})\s(.+)/);
      const level = titleMatch ? titleMatch[1].length : 0;
      const title = titleMatch ? titleMatch[2] : '';
      const content = lines.slice(1).join('\n');
      return { id: `section-${index}`, level, title, content };
    }).filter(s => s.title || s.content);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'} flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          </motion.div>
          <p className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Cargando resumen...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'} p-6`}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8"
          >
            <h2 className="text-red-600 font-bold text-2xl mb-2">Error al cargar el resumen</h2>
            <p className="text-red-500">No se pudo cargar el resumen solicitado.</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-6 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
            >
              ← Volver
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (summary?.status === 'generating') {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'} flex items-center justify-center p-6`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-20 w-20 text-blue-500 mx-auto mb-6" />
              </motion.div>
              <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Generando Resumen con IA
              </h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-8`}>
                Nuestro asistente de IA está analizando el contenido y creando un resumen personalizado.
              </p>
              <div className="flex justify-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    className="w-3 h-3 bg-blue-500 rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const sections = parseSections(summary?.content || '');

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'}`}>
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200/20 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

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
                onClick={() => navigate(`/manuals/${summary?.manual?.id}/resources`)}
                className={`p-2 rounded-xl hover:bg-white/10 transition-colors ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {getSummaryTypeLabel(summary?.summary_type || '')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Focus Mode */}
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={`p-2 rounded-xl hover:bg-white/10 transition-colors ${focusMode ? 'bg-blue-500/20' : ''}`}
                title="Modo Focus"
              >
                <Eye className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
              </button>
              
              {/* Font Size Controls */}
              <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                <button
                  onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ZoomOut className={`h-4 w-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
                </button>
                <span className={`px-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{fontSize}px</span>
                <button
                  onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ZoomIn className={`h-4 w-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
                </button>
              </div>

              {/* Download */}
              <button
                onClick={handleDownload}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="Descargar resumen"
              >
                <Download className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
              </button>
              
              {/* Share */}
              <button
                onClick={handleShare}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="Compartir resumen"
              >
                <Share2 className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
              </button>

              {/* Dark Mode Toggle */}
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className={`grid ${focusMode ? 'grid-cols-1' : 'grid-cols-12'} gap-8`}>
          {/* Table of Contents - Sticky Sidebar */}
          {!focusMode && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="col-span-3"
              >
                <div className="sticky top-24">
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                    <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      📚 Tabla de Contenidos
                    </h3>
                    <div className="space-y-2">
                      {sections.map((section, index) => (
                        <motion.a
                          key={section.id}
                          href={`#${section.id}`}
                          whileHover={{ x: 4 }}
                          className={`block py-2 px-3 rounded-lg hover:bg-white/10 transition-colors ${
                            darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                          }`}
                          style={{ paddingLeft: `${section.level * 12}px` }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm truncate">{section.title || `Sección ${index + 1}`}</span>
                            {bookmarkedSections.includes(section.id) && (
                              <Bookmark className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  </div>

                  {/* Reading Stats */}
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mt-4">
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      📊 Estadísticas
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Palabras</span>
                        <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {summary?.word_count || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tiempo lectura</span>
                        <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          ~{Math.ceil((summary?.word_count || 0) / 200)} min
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Progreso</span>
                        <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {Math.round(readingProgress)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${focusMode ? 'col-span-12 max-w-4xl mx-auto' : 'col-span-9'}`}
          >
            {/* Title and Meta */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}
              >
                {summary?.title}
              </motion.h1>
              
              {/* Manual Info */}
              {summary?.manual && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 mb-4"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <span className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Manual origen:</span>
                    <Link 
                      to={`/manuals/${summary.manual.id}`}
                      className="text-blue-500 hover:text-blue-600 hover:underline"
                    >
                      {summary.manual.title}
                    </Link>
                  </div>
                </motion.div>
              )}
              
              {/* Metadata */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap items-center gap-6 text-sm"
              >
                {summary?.user && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
                      <User className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {summary.user.firstName} {summary.user.lastName}
                    </span>
                  </div>
                )}
                {summary?.created_at && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg">
                      <Calendar className="h-4 w-4 text-green-500" />
                    </div>
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {formatDate(summary.created_at)}
                    </span>
                  </div>
                )}
                {summary?.word_count && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg">
                      <Hash className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {summary.word_count} palabras
                    </span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Summary Content with Sections */}
            <div className="space-y-6">
              {sections.map((section, index) => (
                <motion.div
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 group"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {/* Section Header */}
                  {section.title && (
                    <div className="flex items-start justify-between mb-4">
                      <h2 className={`text-${4 - section.level}xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {section.title}
                      </h2>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleBookmark(section.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Marcar sección"
                        >
                          <Bookmark
                            className={`h-4 w-4 ${
                              bookmarkedSections.includes(section.id)
                                ? 'text-blue-500 fill-blue-500'
                                : darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleCopySection(section.content, section.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Copiar sección"
                        >
                          {copiedSection === section.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Section Content with Markdown */}
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
                        },
                        p: ({ children }) => (
                          <p className={`mb-4 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 italic bg-blue-500/10 rounded-r-lg">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {section.content}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 flex justify-center gap-4"
            >
              <button
                onClick={() => navigate(`/manuals/${summary?.manual?.id}/resources`)}
                className="px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 text-gray-700 dark:text-gray-300 rounded-2xl hover:bg-white/20 transition-all duration-300 font-semibold"
              >
                Ver Todos los Recursos
              </button>
              <button
                onClick={() => navigate(`/manuals/${summary?.manual?.id}/generate-summary`)}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-semibold"
              >
                Generar Nuevo Recurso
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {readingProgress > 20 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300"
          >
            <ChevronUp className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewSummaryGlass;