import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error in UI:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090f1d] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full glass-panel p-8 rounded-3xl border border-red-500/40 shadow-2xl flex flex-col items-center text-center gap-4 bg-slate-900/90">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold font-futura text-white">
              Se presentó un inconveniente visual
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-roboto leading-relaxed">
              Ocurrió un error al procesar los datos de la vista. Puedes reiniciar la interfaz haciendo clic abajo:
            </p>
            {this.state.error && (
              <pre className="text-[11px] font-mono bg-black/50 p-3 rounded-xl border border-red-500/30 text-red-300 w-full text-left overflow-x-auto max-h-36">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#005FB6] hover:bg-[#004A8F] text-white font-bold text-xs shadow-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restablecer y Recargar Aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
