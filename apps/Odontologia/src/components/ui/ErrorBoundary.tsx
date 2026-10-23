import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught component error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 bg-red-50/50 rounded-2xl border border-red-200 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {this.props.fallbackTitle || 'Ocurrió un error al cargar esta sección'}
          </h3>
          <p className="text-xs text-slate-600 mt-2 mb-4 leading-relaxed">
            {this.props.fallbackDescription ||
              'Hubo un problema al procesar los datos de visualización. Por favor intente recargar el componente.'}
          </p>
          {this.state.error?.message && (
            <div className="mb-4 p-2.5 bg-red-100/70 rounded-lg text-[11px] font-mono text-red-800 text-left overflow-x-auto">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-xl transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
