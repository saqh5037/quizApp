import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary. Wrap the RouterProvider (or any high-level subtree) with
 * this component so a single render-time error doesn't crash the whole app.
 *
 * Pass `onError` to forward the error to Google Cloud Error Reporting once Fase 4
 * wires the client. In dev, the component shows the stack trace to make
 * debugging painless.
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error', error, info.componentStack);
    if (this.props.onError) {
      try {
        this.props.onError(error, info);
      } catch {
        // swallow — never let the error reporter throw inside the boundary
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const isDev = (import.meta as any).env?.MODE !== 'production';

    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-background p-6"
      >
        <div className="max-w-lg w-full bg-surface rounded-card shadow-card p-8 text-center">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Algo salió mal
          </h1>
          <p className="text-text-secondary mb-6">
            La aplicación encontró un error inesperado. Puedes intentar continuar o
            recargar la página.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark"
            >
              Intentar continuar
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded border border-border text-text-primary hover:bg-surface-variant"
            >
              Recargar
            </button>
          </div>
          {isDev && this.state.error && (
            <details className="mt-6 text-left text-xs text-text-secondary">
              <summary className="cursor-pointer mb-2">Detalles técnicos</summary>
              <pre className="whitespace-pre-wrap break-words bg-surface-variant p-3 rounded">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
