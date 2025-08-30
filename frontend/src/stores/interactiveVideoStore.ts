import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { interactiveVideoService } from '../services/interactive-video.service';
import { apiConfig } from '../config/api.config';
import toast from 'react-hot-toast';

interface StudentInfo {
  name: string;
  email: string;
  phone?: string;
}

interface Question {
  id: string;
  timestamp: number;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

interface Answer {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTimeSeconds: number;
  timestamp: number;
}

interface SessionData {
  sessionId: string;
  videoId: number;
  layerId: number;
  studentInfo: StudentInfo;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'cancelled';
}

interface VideoResults {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  passed: boolean;
  passingScore: number;
  timeSpent: number;
  answers: Answer[];
}

interface InteractiveVideoState {
  // Session Data
  session: SessionData | null;
  studentInfo: StudentInfo | null;
  
  // Video Data
  videoId: number | null;
  layerId: number | null;
  videoTitle: string;
  videoDuration: number;
  currentTime: number;
  
  // Questions & Answers
  questions: Question[];
  currentQuestion: Question | null;
  answers: Answer[];
  answeredQuestionIds: Set<string>;
  
  // UI State
  isFullscreen: boolean;
  isPaused: boolean;
  isLoading: boolean;
  showResults: boolean;
  showCompleteButton: boolean;
  
  // Results
  results: VideoResults | null;
  
  // Actions - Session Management
  initializeSession: (videoId: number, layerId: number, studentInfo: StudentInfo) => Promise<void>;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  
  // Actions - Question Management
  setCurrentQuestion: (question: Question | null) => void;
  submitAnswer: (answer: string) => Promise<void>;
  skipQuestion: () => void;
  
  // Actions - Video Control
  updateVideoTime: (time: number, duration: number) => void;
  setFullscreen: (isFullscreen: boolean) => void;
  setPaused: (isPaused: boolean) => void;
  
  // Actions - Results
  calculateResults: () => VideoResults;
  saveResults: () => Promise<boolean>;
  completeAndExit: () => Promise<void>;
  
  // Actions - Utils
  reset: () => void;
  setLoading: (loading: boolean) => void;
}

const initialState = {
  session: null,
  studentInfo: null,
  videoId: null,
  layerId: null,
  videoTitle: '',
  videoDuration: 0,
  currentTime: 0,
  questions: [],
  currentQuestion: null,
  answers: [],
  answeredQuestionIds: new Set<string>(),
  isFullscreen: false,
  isPaused: false,
  isLoading: false,
  showResults: false,
  showCompleteButton: false,
  results: null,
};

export const useInteractiveVideoStore = create<InteractiveVideoState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Initialize session with video and student info
        initializeSession: async (videoId, layerId, studentInfo) => {
          try {
            set({ isLoading: true, videoId, layerId, studentInfo });
            
            // Get interactive layer data
            const layer = await interactiveVideoService.getPublicInteractiveLayer(videoId);
            if (!layer || !layer.aiGeneratedContent) {
              throw new Error('No interactive content available');
            }
            
            // Extract questions from key moments
            const questions: Question[] = layer.aiGeneratedContent.keyMoments.map((moment: any) => ({
              id: moment.id,
              timestamp: moment.timestamp,
              text: moment.question.text,
              type: moment.question.type,
              options: moment.question.options,
              correctAnswer: moment.question.correctAnswer,
              explanation: moment.question.explanation,
            }));
            
            set({ 
              questions,
              videoTitle: layer.aiGeneratedContent.metadata?.title || 'Interactive Video',
              isLoading: false 
            });
            
          } catch (error) {
            toast.error('Error al inicializar la sesión');
            set({ isLoading: false });
            throw error;
          }
        },
        
        // Start the interactive session
        startSession: async () => {
          const { videoId, layerId, studentInfo } = get();
          if (!videoId || !layerId || !studentInfo) {
            throw new Error('Missing required session data');
          }
          
          try {
            const sessionData = await interactiveVideoService.startPublicSession(layerId, {
              studentName: studentInfo.name,
              studentEmail: studentInfo.email,
              studentPhone: studentInfo.phone
            });
            
            set({
              session: {
                sessionId: sessionData.result.sessionId,
                videoId,
                layerId,
                studentInfo,
                startTime: new Date(),
                status: 'active'
              }
            });
            
            toast.success('Sesión iniciada correctamente');
          } catch (error) {
            toast.error('Error al iniciar la sesión');
            throw error;
          }
        },
        
        // Set current question when video reaches timestamp
        setCurrentQuestion: (question) => {
          if (question) {
            set({ 
              currentQuestion: question,
              isPaused: true 
            });
          } else {
            set({ 
              currentQuestion: null,
              isPaused: false 
            });
          }
        },
        
        // Submit answer for current question
        submitAnswer: async (userAnswer) => {
          const { session, currentQuestion, currentTime } = get();
          if (!session || !currentQuestion) return;
          
          const isCorrect = userAnswer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
          
          const answer: Answer = {
            questionId: currentQuestion.id,
            questionText: currentQuestion.text,
            userAnswer,
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect,
            responseTimeSeconds: Math.floor(currentTime - currentQuestion.timestamp),
            timestamp: currentQuestion.timestamp
          };
          
          // Save answer locally
          set(state => ({
            answers: [...state.answers, answer],
            answeredQuestionIds: new Set([...state.answeredQuestionIds, currentQuestion.id])
          }));
          
          // Submit to backend
          try {
            await interactiveVideoService.submitPublicAnswer(session.sessionId, {
              momentId: currentQuestion.id,
              questionText: currentQuestion.text,
              userAnswer,
              correctAnswer: currentQuestion.correctAnswer,
              responseTimeSeconds: answer.responseTimeSeconds
            });
            
            toast(isCorrect ? '¡Correcto!' : 'Incorrecto', {
              icon: isCorrect ? '✅' : '❌',
              duration: 2000
            });
            
            // Clear question after delay
            setTimeout(() => {
              set({ currentQuestion: null, isPaused: false });
            }, isCorrect ? 2000 : 3000);
            
          } catch (error) {
            toast.error('Error al enviar respuesta');
          }
        },
        
        // Skip current question
        skipQuestion: () => {
          const { currentQuestion } = get();
          if (!currentQuestion) return;
          
          set(state => ({
            answeredQuestionIds: new Set([...state.answeredQuestionIds, currentQuestion.id]),
            currentQuestion: null,
            isPaused: false
          }));
        },
        
        // Update video playback time
        updateVideoTime: (time, duration) => {
          set({ currentTime: time, videoDuration: duration });
        },
        
        // Set fullscreen state
        setFullscreen: (isFullscreen) => {
          set({ isFullscreen });
        },
        
        // Set paused state
        setPaused: (isPaused) => {
          set({ isPaused });
        },
        
        // Calculate final results
        calculateResults: () => {
          const { answers, questions, session, videoDuration } = get();
          
          const correctAnswers = answers.filter(a => a.isCorrect).length;
          const totalQuestions = questions.length;
          const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
          const passingScore = 70;
          const passed = score >= passingScore;
          
          const timeSpent = session ? 
            Math.floor((new Date().getTime() - session.startTime.getTime()) / 1000) : 
            Math.floor(videoDuration);
          
          const results: VideoResults = {
            score,
            totalQuestions,
            correctAnswers,
            incorrectAnswers: totalQuestions - correctAnswers,
            passed,
            passingScore,
            timeSpent,
            answers
          };
          
          set({ results });
          return results;
        },
        
        // Save results to backend
        saveResults: async () => {
          const { videoId, studentInfo, results, session } = get();
          if (!videoId || !studentInfo || !results) {
              return false;
          }
          
          try {
            // Calculate results if not already done
            const finalResults = results || get().calculateResults();
            
            // Prepare data for backend (matching expected format)
            const resultData = {
              studentInfo: {
                name: studentInfo.name,
                email: studentInfo.email,
                phone: studentInfo.phone || null
              },
              results: {
                score: finalResults.score,
                totalQuestions: finalResults.totalQuestions,
                correctAnswers: finalResults.correctAnswers,
                passed: finalResults.passed,
                answers: finalResults.answers
              },
              completedAt: new Date().toISOString()
            };
            
            // Save to backend
            const response = await fetch(`${apiConfig.baseURL}/videos/${videoId}/interactive-results`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(resultData)
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed to save results: ${response.status} - ${errorText}`);
            }
            
            // Also save to localStorage as backup
            localStorage.setItem(
              `video-results-${videoId}-${Date.now()}`,
              JSON.stringify(resultData)
            );
            
            // Complete session if exists
            if (session) {
              try {
                await interactiveVideoService.completePublicSession(session.sessionId, {
                  watchTimeSeconds: finalResults.timeSpent,
                  totalPauses: 0
                });
              } catch (error) {
              }
            }
            
            toast.success('Resultados guardados correctamente');
            return true;
            
          } catch (error) {
            
            // Try to save locally at least
            const localData = {
              videoId,
              studentInfo,
              results: results || get().calculateResults(),
              timestamp: new Date().toISOString(),
              error: error.message
            };
            
            // Save to multiple localStorage keys for redundancy
            localStorage.setItem('pending-results', JSON.stringify(localData));
            localStorage.setItem(`backup-results-${videoId}-${Date.now()}`, JSON.stringify(localData));
            
            // Show user-friendly message
            toast.error('No se pudieron guardar los resultados en el servidor. Se guardaron localmente.', {
              duration: 5000
            });
            
            // Still return true if we saved locally
            return true; // Allow user to continue even if server save failed
          }
        },
        
        // Complete evaluation and exit
        completeAndExit: async () => {
          set({ isLoading: true });
          
          try {
            // Calculate and save results
            const results = get().calculateResults();
            set({ results, showResults: true });
            
            // Save to backend
            const saved = await get().saveResults();
            
            if (saved) {
              toast.success('¡Evaluación completada y guardada!');
            }
            
            // Show results for 3 seconds then close
            setTimeout(() => {
              // Try multiple methods to close the window
              try {
                // Method 1: Standard close
                if (window.opener) {
                  window.close();
                  return;
                }
                
                // Method 2: Self close
                window.open('', '_self', '');
                window.close();
                
                // Method 3: Navigate to blank
                setTimeout(() => {
                  window.location.href = 'about:blank';
                }, 500);
                
              } catch (e) {
              }
              
              // Final fallback - show completion message
              setTimeout(() => {
                if (document.body) {
                  document.body.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-family: system-ui;">
                      <div style="text-align: center; padding: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
                        <h1 style="font-size: 2rem; margin-bottom: 1rem;">Evaluación Completada</h1>
                        <p style="font-size: 1.2rem; opacity: 0.9;">Los resultados han sido guardados exitosamente</p>
                        <p style="font-size: 1rem; margin-top: 2rem; opacity: 0.7;">Puede cerrar esta ventana de forma segura</p>
                      </div>
                    </div>
                  `;
                }
              }, 1500);
            }, 3000);
            
          } catch (error) {
            toast.error('Error al completar la evaluación');
          } finally {
            set({ isLoading: false });
          }
        },
        
        // End session
        endSession: async () => {
          const { session } = get();
          if (session) {
            set(state => ({
              ...state,
              session: {
                ...session,
                endTime: new Date(),
                status: 'completed'
              }
            }));
          }
        },
        
        // Reset store
        reset: () => {
          set(initialState);
        },
        
        // Set loading state
        setLoading: (loading) => {
          set({ isLoading: loading });
        }
      }),
      {
        name: 'interactive-video-store',
        partialize: (state) => ({
          studentInfo: state.studentInfo,
          results: state.results
        })
      }
    )
  )
);