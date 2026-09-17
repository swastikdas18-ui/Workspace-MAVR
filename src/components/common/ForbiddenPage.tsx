import React from 'react';
import { ShieldAlert, Home, Lock } from 'lucide-react';
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
    <div id="forbidden-page" className="min-h-[70vh] flex items-center justify-center p-6 text-stone-900">
      <div className="max-w-md w-full bg-white border border-[#E8E3DA] rounded-2xl p-8 text-center shadow-xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold uppercase tracking-wider mb-3">
          <Lock className="w-3.5 h-3.5 text-rose-600" />
          <span>Zero-Trust RBAC Enforced</span>
        </div>

        <h1 className="text-2xl font-bold text-stone-900 tracking-tight mb-2 font-heading">
          {title}
        </h1>

        <p className="text-xs text-stone-600 leading-relaxed mb-6">
          {message}
        </p>

        {/* Current Role vs Required Role badge comparison */}
        <div className="bg-[#FAF8F5] rounded-xl p-3.5 border border-[#E8E3DA] text-xs mb-6 text-left">
          <div className="flex justify-between items-center py-1">
            <span className="text-stone-500 font-medium">Current Session Role:</span>
            <span className="font-semibold uppercase text-stone-800 font-mono px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
              {currentRole}
            </span>
          </div>
          {requiredRole && (
            <div className="flex justify-between items-center py-1 border-t border-[#E8E3DA] mt-1 pt-1">
              <span className="text-stone-500 font-medium">Required Role:</span>
              <span className="font-semibold uppercase text-rose-700 font-mono px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
                {requiredRole}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            id="return-dashboard-btn"
            onClick={handleReturn}
            className="w-full py-2.5 px-4 bg-[#1C1917] hover:bg-[#292524] text-white rounded-xl text-xs font-semibold shadow-md shadow-stone-900/10 hover:shadow-stone-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4 text-amber-300" />
            <span>Return to Workspace Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
