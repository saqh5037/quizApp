import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, Award, Clock, Calendar, CheckCircle, 
  XCircle, Target, TrendingUp, FileText, Share2 
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { buildApiUrl } from '../config/api.config';

interface ResultDetail {
  id: number;
  result_type?: 'quiz' | 'video';
  content_title: string;
  // Quiz fields
  quiz_id?: number;
  participant_name?: string;
  participant_email?: string;
  participant_organization?: string;
  total_points?: number;
  earned_points?: number;
  time_spent_seconds?: number;
  started_at?: string;
  // Video fields  
  video_id?: number;
  student_name?: string;
  student_email?: string;
  student_phone?: string;
  duration_seconds?: number;
  layer_id?: number;
  // Common fields
  score: number;
  correct_answers: number;
  total_questions: number;
  completed_at: string;
  answers: Record<string, any>;
  passed?: boolean;
  category?: string;
  difficulty?: string;
  pass_percentage?: number;
}

interface Question {
  id: number;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answers: any[];
  points: number;
}

export default function ResultDetail() {
  const { id, resultType } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const certificateRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    fetchResultDetail();
  }, [id, resultType]);

  const fetchResultDetail = async () => {
    try {
      // Using the new endpoint without auth for testing
      const response = await fetch(
        buildApiUrl(`/results/public/detail/${resultType || 'quiz'}/${id}`),
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch result details');
      }

      const data = await response.json();
      const resultData = data.data.result;
      // Defensive: parse answers if backend returned a string
      if (typeof resultData.answers === 'string') {
        try { resultData.answers = JSON.parse(resultData.answers); }
        catch (e) { resultData.answers = {}; }
      }
      setResult(resultData);
      setQuestions(data.data.questions || []);
    } catch (error) {
      console.error('Error fetching result:', error);
      toast.error('Error al cargar los detalles del resultado');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number | null | undefined) => {
    if (seconds == null || isNaN(seconds)) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generatePDF = async () => {
    if (!result) {
      toast.error('No hay datos de resultado para generar el certificado');
      return;
    }

    try {
      console.log('Generating PDF for result:', result.participant_name || result.student_name);
      setShowCertificate(true);
      
      // Wait for the certificate to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!certificateRef.current) {
        throw new Error('Certificate element not found');
      }
      
      console.log('Capturing certificate element...');
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        logging: false,
        width: 1050,
        height: 750
      });
      
      console.log('Canvas created, generating PDF...');
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const participantName = result.participant_name || result.student_name || 'participante';
      const filename = `certificado_${participantName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      console.log('Saving PDF as:', filename);
      pdf.save(filename);
      
      setShowCertificate(false);
      toast.success('Certificado descargado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Error al generar el certificado: ${error.message}`);
      setShowCertificate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 mb-4">Resultado no encontrado</p>
        <button
          onClick={() => navigate('/public-results')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          Volver a Resultados
        </button>
      </div>
    );
  }

  // Use passed from backend, or calculate using pass_percentage (default 70)
  const passed = result.passed !== undefined
    ? result.passed
    : parseFloat(result.score.toString()) >= (result.pass_percentage || 70);
  const scorePercentage = parseFloat(result.score.toString());

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/public-results')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Detalle del Resultado</h1>
              <p className="text-gray-600">{result.content_title}</p>
            </div>
          </div>
          
          <button
            onClick={generatePDF}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Certificado</span>
          </button>
        </div>
      </div>

      {/* Main Score Card */}
      <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
            passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {passed ? (
              <Award className={`w-12 h-12 ${passed ? 'text-green-600' : 'text-red-600'}`} />
            ) : (
              <XCircle className="w-12 h-12 text-red-600" />
            )}
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {result.participant_name || result.student_name}
          </h2>
          <p className="text-gray-600">{result.participant_email || result.student_email}</p>
          {result.participant_organization && (
            <p className="text-sm text-gray-500">{result.participant_organization}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className={`text-4xl font-bold mb-2 ${
              passed ? 'text-green-600' : 'text-red-600'
            }`}>
              {scorePercentage.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Puntuación Final</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {result.correct_answers}/{result.total_questions}
            </div>
            <p className="text-sm text-gray-600">Respuestas Correctas</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {formatTime(result.time_spent_seconds || result.duration_seconds || 0)}
            </div>
            <p className="text-sm text-gray-600">Tiempo Total</p>
          </div>
          
          <div className="text-center">
            <div className={`text-xl font-bold mb-2 ${
              passed ? 'text-green-600' : 'text-red-600'
            }`}>
              {passed ? 'APROBADO' : 'NO APROBADO'}
            </div>
            <p className="text-sm text-gray-600">Estado</p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-primary" />
            Información del Quiz
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Categoría:</span>
              <span className="font-medium">{result.category || 'General'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Dificultad:</span>
              <span className="font-medium capitalize">{result.difficulty || 'Media'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total de Preguntas:</span>
              <span className="font-medium">{result.total_questions}</span>
            </div>
            {result.total_points && (
              <div className="flex justify-between">
                <span className="text-gray-600">Puntos Totales:</span>
                <span className="font-medium">{result.earned_points}/{result.total_points}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary" />
            Información de la Sesión
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Iniciado:</span>
              <span className="font-medium text-sm">{formatDate(result.started_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completado:</span>
              <span className="font-medium text-sm">{formatDate(result.completed_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duración:</span>
              <span className="font-medium">{formatTime(result.time_spent_seconds || result.duration_seconds || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ID de Resultado:</span>
              <span className="font-medium">#{result.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Review */}
      {questions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            Revisión de Respuestas
          </h3>
          <div className="space-y-4">
            {questions.map((question, index) => {
              // Support both number and string key lookups
              const answerData = result.answers?.[question.id] || result.answers?.[String(question.id)];
              // Support both formats: {isCorrect, userAnswer, points} and {correct, answer}
              const isCorrect = answerData?.isCorrect === true || answerData?.correct === true;
              const userRawAnswer = answerData?.userAnswer ?? answerData?.answer;
              const earnedPoints = answerData?.points ?? (isCorrect ? question.points : 0);

              return (
                <div key={question.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {index + 1}. {question.question_text}
                      </p>
                    </div>
                    <div className="ml-4">
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>

                  {question.options && question.options.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {question.options.map((option, optIndex) => {
                        // Handle both array of strings and array of objects (backend may return either)
                        const optionAny = option as any;
                        const optionText = typeof option === 'string' ? option : optionAny?.text || option;
                        // Match user's answer: could be letter ('a','b'), index (0,1), or uppercase ('A','B')
                        const optLetter = String.fromCharCode(97 + optIndex); // 'a','b','c'...
                        const optLetterUpper = String.fromCharCode(65 + optIndex); // 'A','B','C'...
                        const isUserAnswer = Array.isArray(userRawAnswer)
                          ? userRawAnswer.includes(optLetter) || userRawAnswer.includes(optLetterUpper) || userRawAnswer.includes(optIndex) || userRawAnswer.includes(String(optIndex))
                          : (userRawAnswer === optLetter || userRawAnswer === optLetterUpper || userRawAnswer === optIndex || userRawAnswer === String(optIndex));
                        const isCorrectOption = question.question_type === 'multiple_select'
                          ? question.correct_answers?.includes(optIndex)
                          : (typeof option !== 'string' && optionAny?.is_correct) || question.correct_answers?.includes(optIndex);

                        let bgClass = '';
                        if (isUserAnswer && isCorrect) {
                          bgClass = 'bg-green-50 border border-green-300';
                        } else if (isUserAnswer && !isCorrect) {
                          bgClass = 'bg-red-50 border border-red-300';
                        } else if (isCorrectOption && !isCorrect) {
                          // Show correct answer when user got it wrong
                          bgClass = 'bg-green-50 border border-green-200';
                        }

                        return (
                          <div key={optIndex} className={`p-2 rounded ${bgClass}`}>
                            <span className="text-sm">
                              {optLetterUpper}. {optionText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(question.question_type === 'multiple_choice_grid' || question.question_type === 'checkbox_grid') &&
                    (question.options as any)?.rows && (
                    <div className="ml-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left p-2"></th>
                            {(question.options as any).columns.map((col: string, i: number) => (
                              <th key={i} className="text-center p-2 text-gray-600">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(question.options as any).rows.map((row: string, rowIdx: number) => {
                            const userRow = userRawAnswer?.[String(rowIdx)];
                            const correctRow = question.correct_answers?.[String(rowIdx) as any];
                            const isRowCorrect = question.question_type === 'multiple_choice_grid'
                              ? Number(userRow) === Number(correctRow)
                              : JSON.stringify(([...(userRow || [])] as number[]).sort()) === JSON.stringify(([...(correctRow || [])] as number[]).sort());
                            return (
                              <tr key={rowIdx} className={`border-t ${isRowCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                                <td className="p-2 font-medium">{row}</td>
                                {(question.options as any).columns.map((_: string, colIdx: number) => {
                                  const isUserSelected = question.question_type === 'multiple_choice_grid'
                                    ? Number(userRow) === colIdx
                                    : Array.isArray(userRow) && userRow.includes(colIdx);
                                  const isCorrectCol = question.question_type === 'multiple_choice_grid'
                                    ? Number(correctRow) === colIdx
                                    : Array.isArray(correctRow) && correctRow.includes(colIdx);
                                  return (
                                    <td key={colIdx} className="text-center p-2">
                                      {isUserSelected && isCorrectCol && <span className="text-green-600">✓</span>}
                                      {isUserSelected && !isCorrectCol && <span className="text-red-600">✗</span>}
                                      {!isUserSelected && isCorrectCol && <span className="text-green-400">○</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {answerData?.partialCredit && (
                        <p className="text-sm text-gray-500 mt-1">
                          {answerData.partialCredit.correctRows}/{answerData.partialCredit.totalRows} filas correctas
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-sm text-gray-600">
                    <span>Puntos: {earnedPoints}/{question.points}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hidden Certificate for PDF Generation */}
      {showCertificate && (
        <div className="fixed top-0 left-0 w-full h-full bg-white z-50 overflow-hidden">
          <div
            ref={certificateRef}
            className="w-[1050px] h-[750px] mx-auto mt-4"
            style={{
              backgroundColor: '#667eea',
              backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              position: 'relative',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            {/* Certificate Border */}
            <div 
              className="absolute"
              style={{
                top: '32px',
                left: '32px',
                right: '32px',
                bottom: '32px',
                border: '4px solid white',
                borderRadius: '8px'
              }}
            ></div>
            
            {/* Certificate Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-16">
              <div className="mb-8">
                <h1 style={{ fontSize: '72px', fontWeight: 'bold', marginBottom: '8px', lineHeight: '1' }}>
                  CERTIFICADO
                </h1>
                <p style={{ fontSize: '24px', marginTop: '8px' }}>
                  {passed ? 'DE APROBACIÓN' : 'DE PARTICIPACIÓN'}
                </p>
              </div>
              
              <div className="mb-8">
                <p style={{ fontSize: '20px', marginBottom: '16px' }}>Se certifica que</p>
                <h2 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px', lineHeight: '1.1' }}>
                  {result.participant_name || result.student_name}
                </h2>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>{result.participant_email || result.student_email}</p>
                {result.participant_organization && (
                  <p style={{ fontSize: '18px' }}>{result.participant_organization}</p>
                )}
              </div>
              
              <div className="mb-8">
                <p style={{ fontSize: '20px', marginBottom: '8px' }}>
                  {passed 
                    ? 'Ha aprobado satisfactoriamente la evaluación'
                    : 'Ha completado la evaluación'}
                </p>
                <h3 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '16px', lineHeight: '1.2' }}>
                  "{result.content_title}"
                </h3>
                <p style={{ fontSize: '18px' }}>
                  Con una puntuación de <span style={{ fontWeight: 'bold', fontSize: '24px' }}>
                    {scorePercentage.toFixed(1)}%
                  </span>
                </p>
                <p style={{ fontSize: '18px', marginTop: '8px' }}>
                  {result.correct_answers} de {result.total_questions} respuestas correctas
                </p>
              </div>
              
              <div style={{ marginTop: '48px' }}>
                <p style={{ fontSize: '18px' }}>
                  {formatDate(result.completed_at)}
                </p>
                <p style={{ fontSize: '14px', marginTop: '8px', opacity: '0.8' }}>
                  ID de Certificado: #{result.id}-{Date.now()}
                </p>
              </div>
              
              {passed && (
                <div style={{ marginTop: '32px' }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    backgroundColor: '#ffd700', 
                    borderRadius: '50%',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px'
                  }}>
                    🏆
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}