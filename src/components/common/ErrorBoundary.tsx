import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, X } from 'lucide-react';
import { SentryClient } from '../../lib/sentry';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  isModal?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[WorkspaceOS ErrorBoundary caught an error]:', error, errorInfo);
    SentryClient.captureException(error, {
      componentStack: errorInfo.componentStack || undefined,
      extra: { isModal: this.props.isModal, fallbackTitle: this.props.fallbackTitle },
    });
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.isModal) {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg p-6 bg-[#0F172A] border border-rose-500/30 rounded-2xl text-center shadow-2xl animate-in fade-in zoom-in duration-200">
              <button
                type="button"
                onClick={this.handleReset}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {this.props.fallbackTitle || 'Command Palette Error'}
              </h3>
              <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="p-6 rounded-2xl bg-[#0F172A] border border-rose-500/30 text-white my-4 max-w-2xl mx-auto shadow-xl">
          <div className="flex items-center gap-3 mb-2 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-semibold text-sm">
              {this.props.fallbackTitle || 'A component error occurred'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            {this.state.error?.message || 'The component failed to render.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Component
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

