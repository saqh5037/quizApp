import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send,
  MessageCircle,
  Bot,
  User,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

const ManualChat: React.FC = () => {
  const { manualId } = useParams<{ manualId: string }>();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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
  const { data: chatHistoryResponse, isLoading: isLoadingHistory } = useQuery({
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
    refetchInterval: 5000 // Auto-refresh every 5 seconds
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
      // Refresh chat history
      queryClient.invalidateQueries({ queryKey: ['chatHistory', manualId, sessionId] });
      setMessage('');
    }
  });

  // Set session ID when session data loads
  useEffect(() => {
    if (sessionData?.data?.sessionId) {
      setSessionId(sessionData.data.sessionId);
    }
  }, [sessionData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory?.conversation]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !sessionId) return;
    
    sendMessageMutation.mutate(message.trim());
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isStartingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Iniciando sesión de chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/manuals/${manualId}`)}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver
              </button>
              <div className="flex items-center">
                <MessageCircle className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Chat con IA
                  </h1>
                  <p className="text-sm text-gray-600">
                    {chatHistory?.manualTitle || sessionData?.data?.manualTitle}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingHistory ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Cargando historial...</p>
            </div>
          ) : !chatHistory?.conversation?.length ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¡Hola! Soy tu asistente de IA
              </h3>
              <p className="text-gray-600 mb-4">
                Puedo ayudarte a responder preguntas sobre el contenido de este manual.
              </p>
              <p className="text-sm text-gray-500">
                Envía un mensaje para comenzar la conversación
              </p>
            </div>
          ) : (
            chatHistory.conversation.map((chat) => (
              <div key={chat.id} className="space-y-3">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-xs lg:max-w-md">
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {chat.user?.firstName ? `${chat.user.firstName} ${chat.user.lastName || ''}` : 'Tú'}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatTime(chat.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{chat.message}</p>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start">
                  <div className="bg-white border rounded-lg px-4 py-2 max-w-xs lg:max-w-md shadow-sm">
                    <div className="flex items-center space-x-2 mb-1">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">
                        Asistente IA
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {chat.response}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Loading indicator for new message */}
          {sendMessageMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-lg px-4 py-2 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">
                    Pensando...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu pregunta sobre el manual..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sendMessageMutation.isPending || !sessionId}
            />
            <button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending || !sessionId}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManualChat;