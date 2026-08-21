import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useWorkspace();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let style = 'bg-slate-900 border-slate-700 text-white';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          style = 'bg-emerald-950/90 border-emerald-700/80 text-emerald-100';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          style = 'bg-rose-950/90 border-rose-700/80 text-rose-100';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          style = 'bg-amber-950/90 border-amber-700/80 text-amber-100';
        } else {
          Icon = Info;
          style = 'bg-blue-950/90 border-blue-700/80 text-blue-100';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 ${style}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-semibold text-sm leading-tight mb-0.5">{toast.title}</p>
              <p className="opacity-90 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-70 hover:opacity-100 p-0.5 rounded transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
