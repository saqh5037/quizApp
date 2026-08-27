/**
 * QuizAnalytics.tsx — /quizzes/:id/analytics
 *
 * Fase 5 deliverable. Dashboard per quiz with:
 *   - Headline KPIs (attempts, avg score, pass rate, completion rate)
 *   - Attempts timeline (last 30 days)
 *   - Per-question difficulty heatmap (% correct)
 *   - Top performers + struggling students
 *
 * Uses recharts (already in deps) and Tailwind tokens for consistency.
 */

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import analyticsService, { QuizAnalyticsReport } from '../services/analytics.service';

const QuizAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const quizId = id ? parseInt(id, 10) : 0;

  const { data, isLoading, error } = useQuery<QuizAnalyticsReport, Error>({
    queryKey: ['quiz-analytics', quizId],
    queryFn: () => analyticsService.getQuizAnalytics(quizId),
    enabled: Number.isFinite(quizId) && quizId > 0,
    staleTime: 30_000,
  });

  if (!Number.isFinite(quizId) || quizId <= 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <p className="text-error">ID de quiz inválido.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        role="status"
        className="max-w-6xl mx-auto py-12 px-4 flex items-center justify-center text-text-secondary"
      >
        <div
          className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin mr-3"
          aria-hidden="true"
        />
        Cargando analíticas…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div role="alert" className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-surface rounded-card shadow-card p-6 border border-error/30">
          <h2 className="text-lg font-semibold text-error mb-2">
            No se pudieron cargar las analíticas
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            {error?.message || 'Error desconocido'}
          </p>
          <Link
            to="/quizzes"
            className="text-primary hover:underline text-sm"
          >
            ← Volver a mis quizzes
          </Link>
        </div>
      </div>
    );
  }

  const { quiz, overview, questionBreakdown, timeline, topParticipants, strugglingStudents } = data;
  const hasAttempts = overview.totalAttempts > 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            to={`/quizzes/${quizId}`}
            className="text-sm text-primary hover:underline"
          >
            ← {quiz.title}
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary mt-1">Analíticas</h1>
          <p className="text-sm text-text-secondary">
            {quiz.totalQuestions} preguntas · {quiz.difficulty || 'sin dificultad'} ·{' '}
            aprobación {quiz.passPercentage || 70}%
          </p>
        </div>
      </header>

      {!hasAttempts && (
        <div className="bg-surface rounded-card shadow-card p-6 text-center">
          <p className="text-text-secondary">
            Este quiz aún no tiene intentos registrados. Las analíticas aparecerán
            cuando alguien lo conteste.
          </p>
        </div>
      )}

      {hasAttempts && (
        <>
          {/* Overview KPIs */}
          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="sr-only">
              Métricas generales
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Intentos totales" value={overview.totalAttempts} />
              <KpiCard label="Participantes únicos" value={overview.uniqueParticipants} />
              <KpiCard
                label="Promedio"
                value={`${overview.averageScore.toFixed(1)}%`}
                trend={overview.medianScore > 0 ? `mediana ${overview.medianScore.toFixed(1)}%` : undefined}
              />
              <KpiCard
                label="Aprobación"
                value={`${overview.passRate}%`}
                accent={overview.passRate >= 60 ? 'success' : 'warning'}
              />
              <KpiCard label="Tasa de finalización" value={`${overview.completionRate}%`} />
              <KpiCard
                label="Tiempo promedio"
                value={formatDuration(overview.averageTimeSeconds)}
              />
            </div>
          </section>

          {/* Timeline */}
          {timeline.length > 0 && (
            <section
              aria-labelledby="timeline-heading"
              className="bg-surface rounded-card shadow-card p-6"
            >
              <h2 id="timeline-heading" className="text-lg font-semibold text-text-primary mb-4">
                Intentos (últimos 30 días)
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                    <XAxis dataKey="date" stroke="#616161" fontSize={12} />
                    <YAxis stroke="#616161" fontSize={12} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="attempts"
                      stroke="#03A9F4"
                      strokeWidth={2}
                      name="Intentos"
                    />
                    <Line
                      type="monotone"
                      dataKey="averageScore"
                      stroke="#2E7D32"
                      strokeWidth={2}
                      name="Promedio %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Per-question breakdown */}
          {questionBreakdown.length > 0 && (
            <section
              aria-labelledby="questions-heading"
              className="bg-surface rounded-card shadow-card p-6"
            >
              <h2 id="questions-heading" className="text-lg font-semibold text-text-primary mb-4">
                Dificultad por pregunta
              </h2>
              <p className="text-xs text-text-secondary mb-4">
                % de respuestas correctas por cada pregunta. Las barras rojas son las
                preguntas donde los alumnos más se equivocan — reformúlalas o agrega pista.
              </p>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={questionBreakdown.map((q) => ({
                      name: `#${q.orderPosition + 1}`,
                      correct: q.correctPercentage,
                      fill:
                        q.correctPercentage >= 70
                          ? '#2E7D32'
                          : q.correctPercentage >= 40
                          ? '#E65100'
                          : '#C62828',
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                    <XAxis type="number" domain={[0, 100]} stroke="#616161" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#616161" fontSize={12} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Bar dataKey="correct" name="% correcto" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ol className="mt-4 space-y-2 text-sm">
                {questionBreakdown.map((q) => (
                  <li
                    key={q.questionId}
                    className="flex items-start justify-between gap-4 border-t border-border pt-2"
                  >
                    <span className="flex-1 text-text-primary">
                      {q.orderPosition + 1}. {truncate(q.questionText, 90)}
                    </span>
                    <span
                      className={
                        q.correctPercentage >= 70
                          ? 'text-success'
                          : q.correctPercentage >= 40
                          ? 'text-warning'
                          : 'text-error'
                      }
                    >
                      {q.correctPercentage.toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Top performers + struggling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PeopleList
              title="Mejores puntajes"
              emptyMsg="Aún no hay intentos."
              rows={topParticipants.map((p) => ({
                name: p.name || 'Anónimo',
                sub: p.email || '—',
                right: `${p.score.toFixed(0)}%`,
                rightHint: formatDuration(p.timeSeconds),
              }))}
            />
            <PeopleList
              title="Estudiantes en dificultad"
              emptyMsg="Ningún estudiante está bajo el umbral de aprobación."
              rows={strugglingStudents.map((s) => ({
                name: s.name || 'Anónimo',
                sub: `${s.attempts} intento${s.attempts !== 1 ? 's' : ''} · ${s.email || '—'}`,
                right: `${s.averageScore.toFixed(0)}%`,
                rightHint: 'promedio',
              }))}
              accent="warning"
            />
          </div>
        </>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  trend?: string;
  accent?: 'success' | 'warning';
}> = ({ label, value, trend, accent }) => (
  <div className="bg-surface rounded-card shadow-card p-4">
    <div className="text-xs text-text-secondary">{label}</div>
    <div
      className={`text-2xl font-semibold mt-1 ${
        accent === 'success'
          ? 'text-success'
          : accent === 'warning'
          ? 'text-warning'
          : 'text-text-primary'
      }`}
    >
      {value}
    </div>
    {trend && <div className="text-xs text-text-secondary mt-1">{trend}</div>}
  </div>
);

const PeopleList: React.FC<{
  title: string;
  rows: Array<{ name: string; sub: string; right: string; rightHint?: string }>;
  emptyMsg: string;
  accent?: 'warning';
}> = ({ title, rows, emptyMsg, accent }) => (
  <section className="bg-surface rounded-card shadow-card p-6">
    <h2 className="text-lg font-semibold text-text-primary mb-3">{title}</h2>
    {rows.length === 0 ? (
      <p className="text-sm text-text-secondary">{emptyMsg}</p>
    ) : (
      <ul className="divide-y divide-border">
        {rows.map((r, i) => (
          <li key={i} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-text-primary truncate">{r.name}</div>
              <div className="text-xs text-text-secondary truncate">{r.sub}</div>
            </div>
            <div className="text-right">
              <div
                className={`font-semibold ${
                  accent === 'warning' ? 'text-warning' : 'text-text-primary'
                }`}
              >
                {r.right}
              </div>
              {r.rightHint && (
                <div className="text-xs text-text-secondary">{r.rightHint}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

const truncate = (s: string, max: number): string =>
  s.length > max ? s.substring(0, max - 1) + '…' : s;

export default QuizAnalytics;
