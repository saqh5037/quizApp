import React from 'react';

/**
 * Default fallback shown while a lazy-loaded route chunk is downloading.
 * Minimal by design — a full skeleton per page is a Fase 3 polish item,
 * not a lazy-loading prerequisite.
 */
const PageLoader: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-screen flex items-center justify-center bg-background"
  >
    <div className="flex flex-col items-center gap-3 text-text-secondary">
      <div
        className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin"
        aria-hidden="true"
      />
      <span className="text-sm">Cargando…</span>
    </div>
  </div>
);

export default PageLoader;
