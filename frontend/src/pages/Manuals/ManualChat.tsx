import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { 
  RiArrowLeftLine,
  RiSendPlaneLine,
  RiChat3Line,
  RiRobotLine,
  RiUserLine,
  RiLoader4Line,
  RiFilePdfLine,
  RiFullscreenLine,
  RiCloseLine,
  RiSideBarLine,
  RiSparklingLine,
  RiQuestionLine,
  RiBookOpenLine,
  RiTimeLine,
  RiLightbulbLine,
  RiMagicLine,
  RiExternalLinkLine,
  RiRefreshLine
} from 'react-icons/ri';
import { apiGet } from '../../utils/api.utils';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface ChatHistory {
  sessionId: string;
  manualId: number;
  manualTitle: string;
  conversation: ChatMessage[];
}

interface Manual {
  id: number;
  title: string;
  description?: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  status: string;
  pageCount?: number;
}

const ManualChat: React.FC = () => {
  const { manualId } = useParams<{ manualId: string }>();
  const navigate = useNavigate();
  const device = useDeviceDetect();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showPdfPanel, setShowPdfPanel] = useState(false);
  const [showFullscreenPdf, setShowFullscreenPdf] = useState(false);
  const [pdfCanLoad, setPdfCanLoad] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Helper function to get PDF URL
  const getPdfUrl = (id: number | string, options?: string) => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const url = `${baseUrl}/api/v1/manuals/${id}/view`;
    return options ? `${url}${options}` : url;
  };

  // Fetch manual data
  const { data: manual, isLoading: isLoadingManual } = useQuery({
    queryKey: ['manual', manualId],
    queryFn: async () => {
      const response = await apiGet(`/manuals/${manualId}`);
      return response.data;
    },
    enabled: !!manualId
  });

  // Start chat session
  const { data: sessionData, isLoading: isStartingSession } = useQuery({
    queryKey: ['chatSession', manualId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/ai/manuals/${manualId}/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to start chat session');
      }
      
      return response.json();
    },
    enabled: !!manualId
  });

  // Load chat history
  const { data: chatHistoryResponse, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['chatHistory', manualId, sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/ai/manuals/${manualId}/chat/${sessionId}/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }
      
      const data = await response.json();
      return data;
    },
    enabled: !!sessionId && !!manualId,
    refetchInterval: 3000 // Auto-refresh every 3 seconds
  });
  
  const chatHistory = chatHistoryResponse?.data as ChatHistory;

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await fetch(`/api/v1/ai/manuals/${manualId}/chat/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ message: messageText })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatHistory', manualId, sessionId] });
      setMessage('');
      toast.success('Mensaje enviado');
    },
    onError: () => {
      toast.error('Error al enviar mensaje');
    }
  });

  // Set session ID when session data loads
  useEffect(() => {
    if (sessionData?.data?.sessionId) {
      setSessionId(sessionData.data.sessionId);
    }
  }, [sessionData]);

  // Test if PDF can load
  useEffect(() => {
    if (manual && manual.status === 'ready') {
      const testPdfLoad = async () => {
        try {
          const response = await fetch(getPdfUrl(manual.id), {
            method: 'HEAD'
          });
          if (response.ok && response.headers.get('content-type') === 'application/pdf') {
            setPdfCanLoad(true);
            setShowPdfPanel(!device.isMobile);
          } else {
            setPdfCanLoad(false);
            setShowPdfPanel(false);
          }
        } catch (error) {
          console.log('PDF not accessible, hiding panel');
          setPdfCanLoad(false);
          setShowPdfPanel(false);
        }
      };
      
      testPdfLoad();
    }
  }, [manual, device.isMobile]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory?.conversation]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !sessionId || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(message.trim());
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const suggestedQuestions = [
    "¿Cuál es el tema principal de este manual?",
    "Hazme un resumen de los puntos más importantes",
    "¿Qué procedimientos se explican aquí?",
    "¿Hay alguna información sobre seguridad?"
  ];

  if (isStartingSession || isLoadingManual) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <RiLoader4Line className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Iniciando chat inteligente...</p>
          <p className="text-gray-500 text-sm mt-2">Preparando el asistente de IA</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/manuals/${manualId}`)}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors group"
          >
            <RiArrowLeftLine className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Volver</span>
          </button>
          
          <div className="h-6 w-px bg-gray-300"></div>
          
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-2 rounded-lg">
              <RiSparklingLine className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Chat Inteligente</h1>
              <p className="text-sm text-gray-600 truncate max-w-xs">
                {manual?.title || 'Cargando...'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!device.isMobile && pdfCanLoad && (
            <button
              onClick={() => setShowPdfPanel(!showPdfPanel)}
              className={`p-2 rounded-lg transition-colors ${
                showPdfPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Toggle PDF panel"
            >
              <RiSideBarLine className="h-5 w-5" />
            </button>
          )}
          
          {pdfCanLoad && (
            <button
              onClick={() => window.open(getPdfUrl(manual?.id || ''), '_blank')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Abrir PDF en nueva ventana"
            >
              <RiExternalLinkLine className="h-5 w-5" />
            </button>
          )}
          
          <button
            onClick={() => refetchHistory()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh chat"
          >
            <RiRefreshLine className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* PDF Panel - Left Side */}
        {showPdfPanel && manual && pdfCanLoad && (
          <div className="w-full lg:w-1/2 xl:w-2/5 bg-gray-50 border-r border-gray-200 flex flex-col">
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Documento</h3>
                <div className="flex gap-2">
                  {device.isMobile && (
                    <button
                      onClick={() => setShowPdfPanel(false)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <RiCloseLine className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowFullscreenPdf(true)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Fullscreen"
                  >
                    <RiFullscreenLine className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => window.open(getPdfUrl(manual.id), '_blank')}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Open in new tab"
                  >
                    <RiExternalLinkLine className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <RiFilePdfLine className="h-4 w-4 text-red-500" />
                  <span className="text-gray-600">{formatFileSize(manual.size)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiBookOpenLine className="h-4 w-4 text-blue-500" />
                  <span className="text-gray-600">{manual.pageCount || 0} páginas</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 bg-white m-4 rounded-lg border border-gray-200 overflow-hidden">
              {manual.status === 'ready' ? (
                <object
                  data={getPdfUrl(manual.id, '#toolbar=0&navpanes=0&scrollbar=0')}
                  type="application/pdf"
                  className="w-full h-full"
                >
                  <embed
                    src={getPdfUrl(manual.id, '#toolbar=0&navpanes=0&scrollbar=0')}
                    type="application/pdf"
                    className="w-full h-full"
                  />
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <RiFilePdfLine className="h-16 w-16 text-red-500 mx-auto mb-4" />
                      <p className="text-gray-700 mb-2">No se puede mostrar el PDF</p>
                      <button
                        onClick={() => window.open(getPdfUrl(manual.id), '_blank')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Abrir PDF en nueva ventana
                      </button>
                    </div>
                  </div>
                </object>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <RiFilePdfLine className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Manual en procesamiento...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Panel - Right Side */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <RiLoader4Line className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                    <p className="text-gray-600">Cargando conversación...</p>
                  </div>
                </div>
              ) : !chatHistory?.conversation?.length ? (
                <div className="text-center py-12">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 max-w-lg mx-auto">
                    <div className="bg-gradient-to-br from-blue-100 to-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <RiMagicLine className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      ¡Hola! Soy tu asistente inteligente
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      Estoy aquí para ayudarte a entender y analizar el contenido de tu manual. 
                      Puedes hacerme cualquier pregunta sobre el documento.
                    </p>
                    
                    {pdfCanLoad === false && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 text-orange-800 text-sm">
                          <RiFilePdfLine className="h-4 w-4" />
                          <span>El PDF no se puede visualizar aquí, pero puedes </span>
                          <button
                            onClick={() => window.open(getPdfUrl(manual?.id || ''), '_blank')}
                            className="underline hover:text-orange-900 font-medium"
                          >
                            abrirlo en una nueva ventana
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-3">💡 Preguntas sugeridas:</p>
                      {suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => setMessage(question)}
                          className="block w-full text-left p-3 text-sm bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all group"
                        >
                          <RiQuestionLine className="h-4 w-4 text-blue-500 inline mr-2 group-hover:text-blue-600" />
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {chatHistory.conversation.map((chat, index) => (
                    <div key={chat.id} className="space-y-4">
                      {/* User Message */}
                      <div className="flex justify-end">
                        <div className="max-w-2xl">
                          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-lg px-5 py-3">
                            <p className="text-sm leading-relaxed">{chat.message}</p>
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-1 px-1">
                            <RiUserLine className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {formatTime(chat.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* AI Response */}
                      <div className="flex justify-start">
                        <div className="max-w-2xl">
                          <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-lg px-5 py-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-1.5 rounded-lg">
                                <RiRobotLine className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-xs font-medium text-gray-700">Asistente IA</span>
                            </div>
                            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {chat.response}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Typing Indicator */}
              {sendMessageMutation.isPending && (
                <div className="flex justify-start mt-6">
                  <div className="max-w-2xl">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-lg px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-1.5 rounded-lg">
                          <RiRobotLine className="h-3 w-3 text-blue-600" />
                        </div>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">Pensando...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 bg-white">
            <div className="max-w-4xl mx-auto p-4">
              <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Pregúntame cualquier cosa sobre el manual..."
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 min-h-[48px]"
                    disabled={sendMessageMutation.isPending || !sessionId}
                    rows={1}
                    style={{
                      height: 'auto',
                      minHeight: '48px',
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                    }}
                  />
                  {message.trim() && (
                    <div className="absolute right-2 bottom-2">
                      <button
                        type="submit"
                        disabled={sendMessageMutation.isPending || !sessionId}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors"
                      >
                        <RiSendPlaneLine className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {!message.trim() && (
                  <button
                    type="submit"
                    disabled={true}
                    className="bg-gray-200 text-gray-400 p-3 rounded-xl cursor-not-allowed"
                  >
                    <RiSendPlaneLine className="h-5 w-5" />
                  </button>
                )}
              </form>
              
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-xs text-gray-500">
                  Presiona Enter para enviar, Shift + Enter para nueva línea
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <RiTimeLine className="h-3 w-3" />
                  <span>IA en tiempo real</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen PDF Modal */}
      {showFullscreenPdf && manual && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{manual.title}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(getPdfUrl(manual.id), '_blank')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                title="Abrir en nueva pestaña"
              >
                <RiExternalLinkLine className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowFullscreenPdf(false)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1">
            <object
              data={getPdfUrl(manual.id)}
              type="application/pdf"
              className="w-full h-full"
            >
              <embed
                src={getPdfUrl(manual.id)}
                type="application/pdf"
                className="w-full h-full"
              />
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RiFilePdfLine className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <p className="text-white mb-2">No se puede mostrar el PDF</p>
                  <button
                    onClick={() => window.open(getPdfUrl(manual.id), '_blank')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Abrir PDF en nueva ventana
                  </button>
                </div>
              </div>
            </object>
          </div>
        </div>
      )}

      {/* Mobile PDF Toggle Button */}
      {device.isMobile && manual && pdfCanLoad && (
        <button
          onClick={() => setShowPdfPanel(!showPdfPanel)}
          className="fixed bottom-20 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
        >
          <RiFilePdfLine className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default ManualChat;