import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { UserRole } from '../../types';
import { Shield, Briefcase, GraduationCap, Globe, Database, Terminal } from 'lucide-react';

export const RoleSwitcherBar: React.FC = () => {
  const { currentRole, switchRole, isLandingPage, setIsLandingPage, setActiveTab, activeTab } = useWorkspace();

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 text-xs py-1.5 px-4 sticky top-0 z-50 transition-all shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200 tracking-wide">Workspace OS</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 hidden sm:inline">Role-Based Business OS Matrix:</span>
        </div>

        {/* Quick Role & Portal Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800">
          <button
            id="role-switch-landing"
            onClick={() => {
              setIsLandingPage(true);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
              isLandingPage 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Landing Web</span>
          </button>

          <button
            id="role-switch-admin"
            onClick={() => switchRole('admin')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
              !isLandingPage && currentRole === 'admin'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-300" />
            <span>Admin App</span>
            <span className="text-[10px] bg-purple-500/30 px-1 rounded text-purple-200">Full</span>
          </button>

          <button
            id="role-switch-employee"
            onClick={() => switchRole('employee')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
              !isLandingPage && currentRole === 'employee'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-300" />
            <span>Employee App</span>
            <span className="text-[10px] bg-blue-500/30 px-1 rounded text-blue-200">Assigned</span>
          </button>

          <button
            id="role-switch-intern"
            onClick={() => switchRole('intern')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
              !isLandingPage && currentRole === 'intern'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
            <span>Intern App</span>
            <span className="text-[10px] bg-emerald-500/30 px-1 rounded text-emerald-200">Learning</span>
          </button>
        </div>

        {/* Database & Architecture Quick Inspector */}
        <div className="flex items-center gap-2">
          {!isLandingPage && currentRole === 'admin' && (
            <button
              onClick={() => setActiveTab('admin_tools')}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors ${
                activeTab === 'admin_tools'
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                  : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Database className="w-3 h-3 text-indigo-400" />
              <span>Drizzle & RBAC Logs</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
