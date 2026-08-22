import React from 'react';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface ForbiddenPageProps {
  title?: string;
  message?: string;
  requiredRole?: string;
  onReturn?: () => void;
}

export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({
  title = '403 — Access Forbidden',
  message = "You don't have the required administrative or role permissions to view this resource.",
  requiredRole,
  onReturn,
}) => {
  const { currentRole, setActiveTab } = useWorkspace();

  const handleReturn = () => {
    if (onReturn) {
      onReturn();
    } else {
      setActiveTab('dashboard');
    }
  };

  return (
    <div id="forbidden-page" className="min-h-[70vh] flex items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <Lock className="w-3.5 h-3.5" />
          <span>Zero-Trust RBAC Enforced</span>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          {title}
        </h1>

        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          {message}
        </p>

        {/* Current Role vs Required Role badge comparison */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs mb-6 text-left">
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Current Session Role:</span>
            <span className="font-semibold uppercase text-blue-400 font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
              {currentRole}
            </span>
          </div>
          {requiredRole && (
            <div className="flex justify-between items-center py-1 border-t border-slate-800/80 mt-1 pt-1">
              <span className="text-slate-400">Required Role:</span>
              <span className="font-semibold uppercase text-rose-400 font-mono px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                {requiredRole}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            id="return-dashboard-btn"
            onClick={handleReturn}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Workspace Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
