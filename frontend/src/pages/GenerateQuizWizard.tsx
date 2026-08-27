/**
 * GenerateQuizWizard.tsx — /quizzes/generate
 *
 * Fase 5 deliverable. Three-step wizard:
 *   1. Source: paste text (supports an existing manual in a future iteration)
 *   2. Parameters: title, # questions, difficulty, types, language
 *   3. Preview: shows the generated quiz, lets the user discard or navigate
 *      to the full editor to import into the real quizzes table.
 *
 * Deliberately minimal — it reuses <PageLoader>, toast, and TanStack Query
 * conventions already in the app. The output persists to ai_generated_quizzes
 * on the backend so the user can always come back and import it later.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  aiQuizService,
  Difficulty,
  QuestionType,
  GeneratedQuiz,
  GeneratedQuestion,
} from '../services/ai-quiz.service';

type Step = 'source' | 'params' | 'generating' | 'preview' | 'error';

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Difícil' },
];

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Opción múltiple' },
  { value: 'true_false', label: 'Verdadero / Falso' },
  { value: 'short_answer', label: 'Respuesta corta' },
];

const MIN_SOURCE_CHARS = 200;
const MAX_SOURCE_CHARS = 60_000;

const GenerateQuizWizard: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('source');
  const [sourceText, setSourceText] = useState('');
  const [title, setTitle] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['multiple_choice']);
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [result, setResult] = useState<GeneratedQuiz | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const sourceLen = sourceText.trim().length;
  const sourceValid = sourceLen >= MIN_SOURCE_CHARS && sourceLen <= MAX_SOURCE_CHARS;
  const paramsValid = title.trim().length > 0 && questionTypes.length > 0;

  const toggleQuestionType = (t: QuestionType) => {
    setQuestionTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleGenerate = async () => {
    setStep('generating');
    setErrorMessage('');
    try {
      const quiz = await aiQuizService.generateFromText({
        title: title.trim(),
        sourceText: sourceText.trim(),
        numberOfQuestions,
        difficulty,
        questionTypes,
        language,
      });
      setResult(quiz);
      setStep('preview');
      toast.success(`Quiz generado con ${quiz.questionCount || quiz.questions.length} preguntas`);
    } catch (err: any) {
      const msg = err?.message || 'Error al generar el quiz';
      setErrorMessage(msg);
      setStep('error');
      toast.error(msg);
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setStep('params');
  };

  const handleStartOver = () => {
    setResult(null);
    setStep('source');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Generar quiz con IA</h1>
        <p className="text-text-secondary mt-2">
          Pega un texto y la IA creará preguntas basadas en él. El resultado queda
          guardado en tu tenant y lo puedes importar al editor después.
        </p>
      </header>

      <StepIndicator current={step} />

      {step === 'source' && (
        <SourceStep
          sourceText={sourceText}
          setSourceText={setSourceText}
          sourceLen={sourceLen}
          sourceValid={sourceValid}
          onNext={() => setStep('params')}
        />
      )}

      {step === 'params' && (
        <ParamsStep
          title={title}
          setTitle={setTitle}
          numberOfQuestions={numberOfQuestions}
          setNumberOfQuestions={setNumberOfQuestions}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          questionTypes={questionTypes}
          toggleQuestionType={toggleQuestionType}
          language={language}
          setLanguage={setLanguage}
          paramsValid={paramsValid}
          onBack={() => setStep('source')}
          onGenerate={handleGenerate}
        />
      )}

      {step === 'generating' && <GeneratingStep />}

      {step === 'preview' && result && (
        <PreviewStep
          quiz={result}
          onStartOver={handleStartOver}
          onEdit={() => navigate(`/quizzes/${100_000 + result.id}/edit`)}
        />
      )}

      {step === 'error' && (
        <ErrorStep errorMessage={errorMessage} onRetry={handleRetry} />
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Step indicator
// -----------------------------------------------------------------------------

const StepIndicator: React.FC<{ current: Step }> = ({ current }) => {
  const steps: { key: Step; label: string }[] = [
    { key: 'source', label: '1. Fuente' },
    { key: 'params', label: '2. Parámetros' },
    { key: 'preview', label: '3. Previsualización' },
  ];

  const currentIndex = steps.findIndex((s) =>
    current === 'generating' || current === 'error' ? s.key === 'params' : s.key === current
  );

  return (
    <ol className="flex items-center justify-between mb-8 border-b border-border pb-4">
      {steps.map((s, i) => {
        const active = i === currentIndex;
        const done = i < currentIndex;
        return (
          <li
            key={s.key}
            className={`flex-1 text-sm text-center ${
              active
                ? 'text-primary font-semibold'
                : done
                ? 'text-text-primary'
                : 'text-text-secondary'
            }`}
          >
            <span
              className={`inline-block w-8 h-8 rounded-full leading-8 mr-2 ${
                active
                  ? 'bg-primary text-white'
                  : done
                  ? 'bg-success text-white'
                  : 'bg-surface-variant text-text-secondary'
              }`}
              aria-hidden="true"
            >
              {done ? '✓' : i + 1}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
};

// -----------------------------------------------------------------------------
// Step 1: Source
// -----------------------------------------------------------------------------

const SourceStep: React.FC<{
  sourceText: string;
  setSourceText: (v: string) => void;
  sourceLen: number;
  sourceValid: boolean;
  onNext: () => void;
}> = ({ sourceText, setSourceText, sourceLen, sourceValid, onNext }) => (
  <section
    aria-labelledby="source-heading"
    className="bg-surface rounded-card shadow-card p-6"
  >
    <h2 id="source-heading" className="text-lg font-semibold mb-4 text-text-primary">
      ¿De dónde quieres generar el quiz?
    </h2>
    <p className="text-sm text-text-secondary mb-4">
      Pega el texto fuente (un artículo, un capítulo, notas de clase…). La IA
      se basará únicamente en lo que pegues aquí — no inventará información
      fuera del texto.
    </p>
    <label htmlFor="source-text" className="block text-sm font-medium text-text-primary mb-2">
      Texto fuente
    </label>
    <textarea
      id="source-text"
      value={sourceText}
      onChange={(e) => setSourceText(e.target.value)}
      className="w-full min-h-[260px] border border-border rounded p-3 font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"
      placeholder="Pega aquí el texto del cual quieres generar preguntas…"
      aria-describedby="source-hint"
    />
    <div id="source-hint" className="flex justify-between text-xs mt-2">
      <span className={sourceValid ? 'text-text-secondary' : 'text-error'}>
        Mínimo {MIN_SOURCE_CHARS.toLocaleString()} caracteres, máximo{' '}
        {MAX_SOURCE_CHARS.toLocaleString()}.
      </span>
      <span className={sourceLen > MAX_SOURCE_CHARS ? 'text-error' : 'text-text-secondary'}>
        {sourceLen.toLocaleString()} caracteres
      </span>
    </div>
    <div className="flex justify-end mt-6">
      <button
        type="button"
        onClick={onNext}
        disabled={!sourceValid}
        className="px-5 py-2 rounded bg-primary text-white disabled:bg-border disabled:cursor-not-allowed hover:bg-primary-dark"
      >
        Siguiente
      </button>
    </div>
  </section>
);

// -----------------------------------------------------------------------------
// Step 2: Parameters
// -----------------------------------------------------------------------------

const ParamsStep: React.FC<{
  title: string;
  setTitle: (v: string) => void;
  numberOfQuestions: number;
  setNumberOfQuestions: (v: number) => void;
  difficulty: Difficulty;
  setDifficulty: (v: Difficulty) => void;
  questionTypes: QuestionType[];
  toggleQuestionType: (t: QuestionType) => void;
  language: 'es' | 'en';
  setLanguage: (v: 'es' | 'en') => void;
  paramsValid: boolean;
  onBack: () => void;
  onGenerate: () => void;
}> = ({
  title,
  setTitle,
  numberOfQuestions,
  setNumberOfQuestions,
  difficulty,
  setDifficulty,
  questionTypes,
  toggleQuestionType,
  language,
  setLanguage,
  paramsValid,
  onBack,
  onGenerate,
}) => (
  <section
    aria-labelledby="params-heading"
    className="bg-surface rounded-card shadow-card p-6 space-y-5"
  >
    <h2 id="params-heading" className="text-lg font-semibold text-text-primary">
      Parámetros del quiz
    </h2>

    <div>
      <label htmlFor="quiz-title" className="block text-sm font-medium text-text-primary mb-1">
        Título
      </label>
      <input
        id="quiz-title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-border rounded p-2 focus:ring-2 focus:ring-primary focus:outline-none"
        placeholder="Ej: Fundamentos de fotosíntesis"
      />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label htmlFor="num-questions" className="block text-sm font-medium text-text-primary mb-1">
          Número de preguntas
        </label>
        <input
          id="num-questions"
          type="number"
          min={3}
          max={30}
          value={numberOfQuestions}
          onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
          className="w-full border border-border rounded p-2 focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="difficulty" className="block text-sm font-medium text-text-primary mb-1">
          Dificultad
        </label>
        <select
          id="difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="w-full border border-border rounded p-2 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="language" className="block text-sm font-medium text-text-primary mb-1">
          Idioma
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
          className="w-full border border-border rounded p-2 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>

    <fieldset>
      <legend className="block text-sm font-medium text-text-primary mb-2">
        Tipos de pregunta
      </legend>
      <div className="flex flex-wrap gap-3">
        {QUESTION_TYPES.map((t) => {
          const selected = questionTypes.includes(t.value);
          return (
            <label
              key={t.value}
              className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ${
                selected
                  ? 'border-primary bg-primary/5 text-text-primary'
                  : 'border-border text-text-secondary'
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleQuestionType(t.value)}
                className="accent-primary"
              />
              <span className="text-sm">{t.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>

    <div className="flex justify-between pt-2">
      <button
        type="button"
        onClick={onBack}
        className="px-5 py-2 rounded border border-border text-text-primary hover:bg-surface-variant"
      >
        Atrás
      </button>
      <button
        type="button"
        onClick={onGenerate}
        disabled={!paramsValid}
        className="px-5 py-2 rounded bg-primary text-white disabled:bg-border disabled:cursor-not-allowed hover:bg-primary-dark"
      >
        Generar
      </button>
    </div>
  </section>
);

// -----------------------------------------------------------------------------
// Step 2.5: Generating
// -----------------------------------------------------------------------------

const GeneratingStep: React.FC = () => (
  <section
    role="status"
    aria-live="polite"
    className="bg-surface rounded-card shadow-card p-10 text-center"
  >
    <div
      className="mx-auto h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin"
      aria-hidden="true"
    />
    <h2 className="mt-4 text-lg font-semibold text-text-primary">Generando tu quiz…</h2>
    <p className="text-sm text-text-secondary mt-2">
      Esto suele tardar entre 15 y 40 segundos. No cierres la pestaña.
    </p>
  </section>
);

// -----------------------------------------------------------------------------
// Step 3: Preview
// -----------------------------------------------------------------------------

const PreviewStep: React.FC<{
  quiz: GeneratedQuiz;
  onStartOver: () => void;
  onEdit: () => void;
}> = ({ quiz, onStartOver, onEdit }) => (
  <section aria-labelledby="preview-heading" className="bg-surface rounded-card shadow-card p-6">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 id="preview-heading" className="text-lg font-semibold text-text-primary">
          {quiz.title}
        </h2>
        {quiz.description && (
          <p className="text-sm text-text-secondary mt-1">{quiz.description}</p>
        )}
        <div className="mt-2 text-xs text-text-secondary">
          {quiz.questions.length} preguntas · {quiz.difficulty || 'medium'} ·{' '}
          guardado como borrador (id #{quiz.id})
        </div>
      </div>
    </div>

    <ol className="space-y-4">
      {quiz.questions.map((q: GeneratedQuestion, i: number) => (
        <li key={i} className="border border-border rounded p-4">
          <div className="font-medium text-text-primary">
            {i + 1}. {q.question}
          </div>
          {q.options && q.options.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {q.options.map((opt, j) => {
                const isCorrect =
                  q.type === 'short_answer'
                    ? false
                    : Number(q.correctAnswer) === j;
                return (
                  <li
                    key={j}
                    className={`pl-3 ${
                      isCorrect ? 'text-success font-medium' : 'text-text-secondary'
                    }`}
                  >
                    {String.fromCharCode(65 + j)}. {opt}
                    {isCorrect && ' ✓'}
                  </li>
                );
              })}
            </ul>
          )}
          {q.type === 'short_answer' && (
            <div className="mt-2 text-sm text-success">
              Respuesta: {String(q.correctAnswer)}
            </div>
          )}
          {q.explanation && (
            <div className="mt-2 text-xs text-text-secondary italic">
              💡 {q.explanation}
            </div>
          )}
        </li>
      ))}
    </ol>

    <div className="flex justify-between pt-6 border-t border-border mt-6">
      <button
        type="button"
        onClick={onStartOver}
        className="px-5 py-2 rounded border border-border text-text-primary hover:bg-surface-variant"
      >
        Generar otro
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="px-5 py-2 rounded bg-primary text-white hover:bg-primary-dark"
      >
        Abrir en el editor
      </button>
    </div>
  </section>
);

// -----------------------------------------------------------------------------
// Error step
// -----------------------------------------------------------------------------

const ErrorStep: React.FC<{ errorMessage: string; onRetry: () => void }> = ({
  errorMessage,
  onRetry,
}) => (
  <section
    role="alert"
    className="bg-surface rounded-card shadow-card p-6 border border-error/30"
  >
    <h2 className="text-lg font-semibold text-error mb-2">No se pudo generar el quiz</h2>
    <p className="text-sm text-text-secondary mb-4">{errorMessage}</p>
    <p className="text-xs text-text-secondary mb-4">
      Si el problema persiste, reduce la cantidad de preguntas o recorta el texto.
    </p>
    <button
      type="button"
      onClick={onRetry}
      className="px-5 py-2 rounded bg-primary text-white hover:bg-primary-dark"
    >
      Volver a parámetros
    </button>
  </section>
);

export default GenerateQuizWizard;
