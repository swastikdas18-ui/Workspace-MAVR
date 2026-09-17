import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useWorkspace();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let iconColor = 'text-amber-800';
        let borderColor = 'border-[#E8E3DA]';
        let accentBg = 'bg-amber-50';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          iconColor = 'text-emerald-700';
          borderColor = 'border-emerald-200';
          accentBg = 'bg-emerald-50';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'text-rose-600';
          borderColor = 'border-rose-200';
          accentBg = 'bg-rose-50';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          iconColor = 'text-amber-700';
          borderColor = 'border-amber-200';
          accentBg = 'bg-amber-50';
        } else {
          Icon = Info;
          iconColor = 'text-stone-700';
          borderColor = 'border-[#E8E3DA]';
          accentBg = 'bg-stone-50';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-white border ${borderColor} text-stone-900 shadow-xl shadow-stone-950/10 transition-all animate-in slide-in-from-bottom-2`}
          >
            <div className={`p-1.5 rounded-xl ${accentBg} shrink-0`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-sm leading-tight text-stone-900 mb-0.5">{toast.title}</p>
              <p className="text-stone-600 leading-relaxed font-normal">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
