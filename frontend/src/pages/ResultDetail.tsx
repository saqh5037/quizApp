import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, Award, Clock, Calendar, CheckCircle, 
  XCircle, Target, TrendingUp, FileText, Share2 
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#f0f0f0', zIndex: 9999, overflow: 'hidden' }}>
          <div
            ref={certificateRef}
            style={{
              width: '1050px',
              height: '750px',
              backgroundColor: '#ffffff',
              position: 'relative',
              fontFamily: 'Georgia, serif',
              overflow: 'hidden',
              margin: '0 auto'
            }}
          >

            {/* Top-left navy triangle accent */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '220px 220px 0 0',
              borderColor: '#1a365d transparent transparent transparent'
            }} />

            {/* Top-left secondary triangle (lighter) */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '170px 170px 0 0',
              borderColor: '#2a4a7f transparent transparent transparent'
            }} />

            {/* Bottom-right navy triangle accent */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '0 0 220px 220px',
              borderColor: 'transparent transparent #1a365d transparent'
            }} />

            {/* Bottom-right secondary triangle (lighter) */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '0 0 170px 170px',
              borderColor: 'transparent transparent #2a4a7f transparent'
            }} />

            {/* Thin gold border frame inside */}
            <div style={{
              position: 'absolute',
              top: '24px',
              left: '24px',
              right: '24px',
              bottom: '24px',
              border: '2px solid #c9a84c',
              pointerEvents: 'none'
            }} />

            {/* Gold seal — top-right corner (refined: laurel + monogram) */}
            <div style={{
              position: 'absolute',
              top: '40px',
              right: '60px',
              width: '110px',
              height: '110px',
              zIndex: 10
            }}>
              <svg viewBox="0 0 110 110" width="110" height="110" style={{ display: 'block' }}>
                <defs>
                  <radialGradient id="sealGrad" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#e8c66f" />
                    <stop offset="55%" stopColor="#c9a84c" />
                    <stop offset="100%" stopColor="#9c7e2f" />
                  </radialGradient>
                </defs>
                {/* Outer rays */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const a = (i * Math.PI) / 12;
                  const x1 = 55 + Math.cos(a) * 47;
                  const y1 = 55 + Math.sin(a) * 47;
                  const x2 = 55 + Math.cos(a) * 53;
                  const y2 = 55 + Math.sin(a) * 53;
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9a84c" strokeWidth="1.4" />;
                })}
                {/* Outer ring */}
                <circle cx="55" cy="55" r="46" fill="url(#sealGrad)" stroke="#9c7e2f" strokeWidth="1.5" />
                {/* Inner medallion */}
                <circle cx="55" cy="55" r="36" fill="#0d1f3d" stroke="#c9a84c" strokeWidth="1.2" />
                {/* Hairline ring */}
                <circle cx="55" cy="55" r="32" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.6" />
                {/* Laurel branches */}
                <path d="M 30 60 Q 28 50 32 42 M 32 42 Q 36 38 40 38 M 28 50 Q 24 48 22 44 M 32 56 Q 28 56 26 52" stroke="#c9a84c" strokeWidth="1" fill="none" opacity="0.85" />
                <path d="M 80 60 Q 82 50 78 42 M 78 42 Q 74 38 70 38 M 82 50 Q 86 48 88 44 M 78 56 Q 82 56 84 52" stroke="#c9a84c" strokeWidth="1" fill="none" opacity="0.85" />
                {/* Center text: monogram */}
                <text x="55" y="49" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fontWeight="700" fill="#c9a84c" letterSpacing="2">
                  {passed ? 'APRO' : 'PART'}
                </text>
                <text x="55" y="63" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fontWeight="700" fill="#e8c66f">
                  ★
                </text>
                <text x="55" y="76" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fontWeight="700" fill="#c9a84c" letterSpacing="1.5">
                  {new Date(result.completed_at).getFullYear()}
                </text>
              </svg>
              {/* Ribbon tabs below seal */}
              <div style={{
                position: 'absolute',
                bottom: '-14px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '5px'
              }}>
                <div style={{ width: '13px', height: '22px', backgroundColor: '#c9a84c', clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)' }} />
                <div style={{ width: '13px', height: '22px', backgroundColor: '#1a365d', clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)' }} />
              </div>
            </div>

            {/* Dynamtek logo — top-left area, after triangle */}
            <div style={{
              position: 'absolute',
              top: '36px',
              left: '188px',
              zIndex: 10
            }}>
              <img
                src="/images/logo-dynamtek.png"
                alt="Dynamtek"
                style={{
                  height: '38px',
                  width: 'auto',
                  display: 'block',
                  imageRendering: '-webkit-optimize-contrast',
                }}
              />
            </div>

            {/* Main content area */}
            <div style={{
              position: 'absolute',
              top: '60px',
              left: '60px',
              right: '60px',
              bottom: '60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}>

              {/* Certificate title */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{
                  fontSize: '12px',
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontWeight: 600,
                  color: '#8a7a4a',
                  letterSpacing: '8px',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}>
                  Certificado de
                </div>
                <div style={{
                  fontSize: '52px',
                  fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                  fontWeight: 700,
                  color: '#0d1f3d',
                  letterSpacing: '10px',
                  textTransform: 'uppercase',
                  lineHeight: 1
                }}>
                  {passed ? 'Aprobación' : 'Participación'}
                </div>
              </div>

              {/* Gold divider line */}
              <div style={{
                width: '200px',
                height: '2px',
                backgroundColor: '#c9a84c',
                margin: '12px auto'
              }} />

              {/* "Se certifica que" */}
              <div style={{
                fontSize: '12px',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontWeight: 600,
                color: '#8a7a4a',
                letterSpacing: '6px',
                textTransform: 'uppercase',
                marginBottom: '12px',
                marginTop: '4px'
              }}>
                Se certifica que
              </div>

              {/* Participant name — script, prominent */}
              <div style={{
                fontSize: '46px',
                fontFamily: '"Great Vibes", "Allura", "Cormorant Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 500,
                color: '#0d1f3d',
                marginBottom: '10px',
                lineHeight: 1.1,
                maxWidth: '720px',
                wordBreak: 'break-word'
              }}>
                {result.participant_name || result.student_name}
              </div>

              {/* Gold line under name */}
              <div style={{
                width: '420px',
                height: '1px',
                background: 'linear-gradient(to right, transparent 0%, #c9a84c 20%, #c9a84c 80%, transparent 100%)',
                margin: '0 auto 18px auto'
              }} />

              {/* Body text */}
              <div style={{
                fontSize: '13.5px',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                color: '#5a5a5a',
                marginBottom: '6px',
                letterSpacing: '1px',
                fontStyle: 'italic'
              }}>
                {passed
                  ? 'ha aprobado satisfactoriamente la evaluación'
                  : 'ha completado satisfactoriamente la evaluación'}
              </div>

              {/* Quiz title */}
              <div style={{
                fontSize: '20px',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontWeight: 700,
                color: '#0d1f3d',
                marginBottom: '14px',
                maxWidth: '680px',
                lineHeight: 1.3,
                letterSpacing: '0.5px'
              }}>
                «{result.content_title}»
              </div>

              {/* Score badge — refined: thin gold border, navy text on cream bg */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '14px',
                backgroundColor: '#fbf6e8',
                color: '#0d1f3d',
                padding: '7px 28px',
                borderRadius: '24px',
                border: '1px solid #c9a84c',
                fontSize: '13px',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '14px'
              }}>
                <span style={{ fontSize: '16px' }}>{scorePercentage.toFixed(1)}%</span>
                <span style={{ color: '#c9a84c' }}>•</span>
                <span style={{ fontSize: '11px', color: '#5a5a5a', letterSpacing: '1.5px' }}>
                  {result.correct_answers}/{result.total_questions} respuestas correctas
                </span>
              </div>

              {/* Date */}
              <div style={{
                fontSize: '11px',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontStyle: 'italic',
                color: '#9a9a9a',
                letterSpacing: '2px',
                marginBottom: '22px'
              }}>
                {formatDate(result.completed_at)}
              </div>

              {/* Signatures row */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '90px',
                width: '100%',
                maxWidth: '680px',
                marginTop: '4px'
              }}>
                {/* Primary signatory — Merced de la Graziña, with embedded signature */}
                <div style={{ textAlign: 'center', minWidth: '210px', position: 'relative' }}>
                  <div style={{ height: '46px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '2px' }}>
                    <img
                      src="/images/firma-merced.png"
                      alt=""
                      aria-hidden="true"
                      style={{ height: '46px', width: 'auto', objectFit: 'contain', filter: 'contrast(1.05)' }}
                    />
                  </div>
                  <div style={{ width: '100%', height: '1px', backgroundColor: '#0d1f3d', marginBottom: '6px' }} />
                  <div style={{ fontSize: '12px', fontFamily: 'Georgia, serif', fontWeight: 600, color: '#0d1f3d', letterSpacing: '0.3px' }}>
                    QSP. Merced de la Graziña
                  </div>
                  <div style={{ fontSize: '9.5px', fontFamily: 'Arial, sans-serif', color: '#7a7a7a', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: '2px' }}>
                    Gerente de Operaciones
                  </div>
                </div>
                {/* Secondary signatory — Carlos Ángel Rendón, name + role only (no signature) */}
                <div style={{ textAlign: 'center', minWidth: '210px' }}>
                  <div style={{ height: '46px' }} />
                  <div style={{ width: '100%', height: '1px', backgroundColor: '#0d1f3d', marginBottom: '6px' }} />
                  <div style={{ fontSize: '12px', fontFamily: 'Georgia, serif', fontWeight: 600, color: '#0d1f3d', letterSpacing: '0.3px' }}>
                    Ing. Carlos Ángel Rendón
                  </div>
                  <div style={{ fontSize: '9.5px', fontFamily: 'Arial, sans-serif', color: '#7a7a7a', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: '2px' }}>
                    Capacitador
                  </div>
                </div>
              </div>
            </div>

            {/* QR — verification link to public result page */}
            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '52px',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                padding: '5px',
                backgroundColor: '#ffffff',
                border: '1px solid #c9a84c',
                lineHeight: 0
              }}>
                <QRCodeSVG
                  value={`${window.location.origin}/public-results/${resultType || 'quiz'}/${result.id}`}
                  size={64}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0d1f3d"
                  includeMargin={false}
                />
              </div>
              <div style={{
                fontSize: '8px',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontStyle: 'italic',
                color: '#7a7a7a',
                textAlign: 'center',
                marginTop: '4px',
                letterSpacing: '1px'
              }}>
                Verificar · #{result.id}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}