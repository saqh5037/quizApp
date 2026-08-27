import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Award, Calendar, CheckCircle,
  XCircle, Target, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
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

// Lowercase particles for Spanish/Portuguese name title-casing
const NAME_PARTICLES = new Set([
  'de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'van', 'von', 'mac', 'mc', 'di'
]);

export default function ResultDetail() {
  const { id, resultType } = useParams();
  const navigate = useNavigate();
  const certificateRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showCertificate, setShowCertificate] = useState(false);
  const [certNameFontSize, setCertNameFontSize] = useState(64);
  const [certNameWrap, setCertNameWrap] = useState(false);

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

  // Certificate date: "15 de noviembre de 2023" (registration date of the evaluation)
  const formatCertDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Script fonts are unreadable in ALL CAPS, so the certificate shows the
  // registered name in title case (Spanish particles stay lowercase).
  const toDisplayName = (raw: string) => {
    const cleaned = raw.trim().replace(/\s+/g, ' ');
    if (!cleaned) return cleaned;
    return cleaned
      .split(' ')
      .map((word, i) => {
        const lower = word.toLocaleLowerCase('es-MX');
        if (i > 0 && NAME_PARTICLES.has(lower)) return lower;
        return lower.charAt(0).toLocaleUpperCase('es-MX') + lower.slice(1);
      })
      .join(' ');
  };

  const generatePDF = async () => {
    if (!result) {
      toast.error('No hay datos de resultado para generar el certificado');
      return;
    }

    try {
      console.log('Generating PDF for result:', result.participant_name || result.student_name);
      // Fit the script name to the 520px column by measured width — a
      // character-count rule breaks with wide (all-caps) registered names
      const displayName = toDisplayName(
        result.participant_name || result.student_name || 'Participante'
      );
      try {
        await document.fonts.load('64px "Great Vibes"');
      } catch {
        // measure with the fallback font if the webfont is unavailable
      }
      const measureCtx = document.createElement('canvas').getContext('2d');
      let fittedSize = 64;
      if (measureCtx) {
        measureCtx.font = '64px "Great Vibes", cursive';
        const nameWidth = measureCtx.measureText(displayName).width;
        if (nameWidth > 520) fittedSize = Math.floor((64 * 520) / nameWidth);
      }
      setCertNameWrap(fittedSize < 26);
      setCertNameFontSize(fittedSize < 26 ? 30 : fittedSize);

      setShowCertificate(true);

      // Wait for webfonts and render before capturing
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
      } catch {
        // capture with whatever fonts are loaded
      }
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

  // Certificate: registered participant name, normalized for the script font
  const certName = toDisplayName(result.participant_name || result.student_name || 'Participante');

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
              backgroundColor: '#f0eee7',
              position: 'relative',
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              overflow: 'hidden',
              margin: '0 auto'
            }}
          >

            {/* Left black ornament: angular panel + gold rosette medal */}
            <svg viewBox="0 0 430 750" width="430" height="750" style={{ position: 'absolute', top: 0, left: 0, display: 'block' }}>
              <defs>
                <radialGradient id="medalGrad" cx="42%" cy="36%" r="65%">
                  <stop offset="0%" stopColor="#f3dc9a" />
                  <stop offset="45%" stopColor="#d9b45e" />
                  <stop offset="80%" stopColor="#b18a38" />
                  <stop offset="100%" stopColor="#8f6e2a" />
                </radialGradient>
                <radialGradient id="medalCore" cx="45%" cy="38%" r="70%">
                  <stop offset="0%" stopColor="#e8c977" />
                  <stop offset="60%" stopColor="#c69d47" />
                  <stop offset="100%" stopColor="#9a7830" />
                </radialGradient>
              </defs>
              {/* top-left square tab */}
              <rect x="22" y="22" width="74" height="74" fill="#111111" />
              {/* far-left thin strip */}
              <rect x="22" y="120" width="32" height="536" fill="#111111" />
              {/* bottom foot */}
              <rect x="22" y="656" width="210" height="44" fill="#111111" />
              {/* main wedge */}
              <polygon points="120,22 436,22 436,128 268,378 312,470 240,688 120,620" fill="#111111" />
              {/* medal ribbons (behind medal) */}
              <polygon points="244,246 264,258 226,352 222,324 200,334" fill="#b8923f" />
              <polygon points="280,246 260,258 298,352 302,324 324,334" fill="#99762f" />
              {/* scalloped rosette edge */}
              {Array.from({ length: 20 }).map((_, i) => {
                const a = (i * 2 * Math.PI) / 20;
                return (
                  <circle
                    key={i}
                    cx={262 + Math.cos(a) * 62}
                    cy={205 + Math.sin(a) * 62}
                    r="10"
                    fill="url(#medalGrad)"
                  />
                );
              })}
              {/* medal body */}
              <circle cx="262" cy="205" r="64" fill="url(#medalGrad)" />
              <circle cx="262" cy="205" r="50" fill="url(#medalCore)" stroke="#8f6e2a" strokeWidth="1" />
              <circle cx="262" cy="205" r="44" fill="none" stroke="#f3dc9a" strokeWidth="1.2" opacity="0.8" />
              <circle cx="262" cy="205" r="34" fill="url(#medalGrad)" stroke="#8f6e2a" strokeWidth="0.8" />
            </svg>

            {/* Main content column (right of the black wedge) */}
            <div style={{ position: 'absolute', top: 0, left: '450px', width: '550px', height: '750px' }}>

              {/* Title */}
              <div style={{
                position: 'absolute',
                top: '88px',
                left: 0,
                width: '100%',
                textAlign: 'center',
                fontFamily: '"Cinzel", "Cormorant Garamond", Georgia, serif',
                fontWeight: 700,
                fontSize: '58px',
                color: '#1b1b1b',
                letterSpacing: '6px',
                lineHeight: 1
              }}>
                CERTIFICADO
              </div>
              <div style={{
                position: 'absolute',
                top: '152px',
                left: 0,
                width: '100%',
                textAlign: 'center',
                fontFamily: '"Cinzel", "Cormorant Garamond", Georgia, serif',
                fontWeight: 600,
                fontSize: '27px',
                color: '#1b1b1b',
                letterSpacing: '7px',
                lineHeight: 1
              }}>
                DE RECONOCIMIENTO
              </div>

              {/* OTORGADO A */}
              <div style={{
                position: 'absolute',
                top: '222px',
                left: 0,
                width: '100%',
                textAlign: 'center',
                fontFamily: '"Cinzel", "Cormorant Garamond", Georgia, serif',
                fontWeight: 500,
                fontSize: '15px',
                color: '#2b2b2b',
                letterSpacing: '6px'
              }}>
                OTORGADO A
              </div>

              {/* Participant name — script, exactly as registered in the quiz */}
              <div style={{
                position: 'absolute',
                top: '248px',
                left: 0,
                width: '100%',
                height: '104px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontFamily: '"Great Vibes", "Cormorant Garamond", cursive',
                fontSize: `${certNameFontSize}px`,
                color: '#161616',
                lineHeight: certNameWrap ? 1.05 : 1.15,
                whiteSpace: certNameWrap ? 'normal' : 'nowrap'
              }}>
                {certName}
              </div>

              {/* Gold rule under name */}
              <div style={{
                position: 'absolute',
                top: '352px',
                left: '15px',
                width: '520px',
                height: '2px',
                backgroundColor: '#c9a250'
              }} />

              {/* Body text (fixed wording requested by the client) */}
              <div style={{
                position: 'absolute',
                top: '378px',
                left: 0,
                width: '535px',
                textAlign: 'right',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontWeight: 600,
                fontSize: '17.5px',
                color: '#2f2f2f',
                letterSpacing: '1.6px',
                lineHeight: 1.6
              }}>
                Por haber recibido el entrenamiento completo en el<br />
                manejo de la Herramienta Toma Turnos vinculada al<br />
                Sistema Informático de Laboratorios LABSIS®
              </div>

              {/* Date — registration date of the evaluation in AristoTest */}
              <div style={{
                position: 'absolute',
                top: '492px',
                left: 0,
                width: '535px',
                textAlign: 'right',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontWeight: 700,
                fontSize: '19px',
                color: '#b9924a',
                letterSpacing: '1.5px'
              }}>
                {formatCertDate(result.completed_at)}
              </div>

              {/* Signatures row */}
              <div style={{
                position: 'absolute',
                top: '566px',
                left: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: '36px'
              }}>
                {/* Primary signatory — Merced, with embedded signature */}
                <div style={{ textAlign: 'center', width: '200px', position: 'relative' }}>
                  <div style={{ height: '56px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '-6px' }}>
                    <img
                      src="/images/firma-merced.png"
                      alt=""
                      aria-hidden="true"
                      style={{ height: '60px', width: 'auto', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ width: '100%', height: '1.5px', backgroundColor: '#c9a250', marginBottom: '7px' }} />
                  <div style={{ fontFamily: '"Cinzel", "Cormorant Garamond", Georgia, serif', fontWeight: 600, fontSize: '13.5px', color: '#1b1b1b', letterSpacing: '1.5px', whiteSpace: 'nowrap' }}>
                    QBP. MERCED DE LA GRAZZIA
                  </div>
                  <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, fontSize: '13px', color: '#3d3d3d', letterSpacing: '1px', marginTop: '3px' }}>
                    Gerente de Operaciones
                  </div>
                </div>

                {/* Gold laurel wreath emblem */}
                <svg viewBox="0 0 90 90" width="72" height="72" style={{ display: 'block', marginTop: '16px' }}>
                  <circle cx="45" cy="47" r="15" fill="none" stroke="#c9a250" strokeWidth="1.3" />
                  {Array.from({ length: 9 }).map((_, i) => {
                    const deg = -55 + (i * 290) / 8;
                    const rad = (deg * Math.PI) / 180;
                    const cx = 45 + Math.cos(rad) * 27;
                    const cy = 47 + Math.sin(rad) * 27;
                    return [-30, 30].map((tilt) => (
                      <ellipse
                        key={`${i}-${tilt}`}
                        cx={cx}
                        cy={cy}
                        rx="8"
                        ry="2.3"
                        fill="#c9a250"
                        transform={`rotate(${deg + 90 + tilt} ${cx} ${cy})`}
                      />
                    ));
                  })}
                </svg>

                {/* Secondary signatory — trainer, with embedded signature */}
                <div style={{ textAlign: 'center', width: '200px', position: 'relative' }}>
                  <div style={{ height: '56px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '-6px' }}>
                    <img
                      src="/images/firma-carlos.png"
                      alt=""
                      aria-hidden="true"
                      style={{ height: '60px', width: 'auto', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ width: '100%', height: '1.5px', backgroundColor: '#c9a250', marginBottom: '7px' }} />
                  <div style={{ fontFamily: '"Cinzel", "Cormorant Garamond", Georgia, serif', fontWeight: 600, fontSize: '13.5px', color: '#1b1b1b', letterSpacing: '1.5px', whiteSpace: 'nowrap' }}>
                    ING. CARLOS ANGEL RENDÓN
                  </div>
                  <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, fontSize: '13px', color: '#3d3d3d', letterSpacing: '1px', marginTop: '3px' }}>
                    Capacitador
                  </div>
                </div>
              </div>
            </div>

            {/* QR — verification link to public result page (bottom-right, discreet) */}
            <div style={{
              position: 'absolute',
              bottom: '18px',
              right: '22px',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                padding: '4px',
                backgroundColor: '#ffffff',
                border: '1px solid #c9a250',
                lineHeight: 0
              }}>
                <QRCodeSVG
                  value={`${window.location.origin}/public-results/${resultType || 'quiz'}/${result.id}`}
                  size={46}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#161616"
                  includeMargin={false}
                />
              </div>
              <div style={{
                fontSize: '8.5px',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontStyle: 'italic',
                color: '#6f6f6f',
                textAlign: 'center',
                marginTop: '3px',
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