import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

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
          <div className="p-6 bg-[#0F172A] border border-rose-500/30 rounded-2xl text-center max-w-lg mx-auto shadow-2xl">
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
        );
      }

      return (
        <div className="p-6 rounded-2xl bg-[#0F172A] border border-rose-500/30 text-white my-4">
          <div className="flex items-center gap-3 mb-2 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-semibold text-sm">
              {this.props.fallbackTitle || 'A component error occurred'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            {this.state.error?.message || 'The component failed to render.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
