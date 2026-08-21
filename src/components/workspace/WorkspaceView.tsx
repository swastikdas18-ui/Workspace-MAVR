import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Building2, Users, FolderKanban, CheckSquare, Layers, ShieldCheck, ArrowUpRight } from 'lucide-react';

export const WorkspaceView: React.FC = () => {
  const { currentWorkspace, teams, projects, tasks, users, setActiveTab, currentRole } = useWorkspace();

  return (
    <div className="space-y-6">
      {/* Workspace Profile Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-blue-500/20">
            {currentWorkspace.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">{currentWorkspace.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase font-semibold">
                {currentWorkspace.plan} Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              slug: {currentWorkspace.slug} • Created Jan 2026
            </p>
          </div>
        </div>

        {currentRole === 'admin' && (
          <button
            onClick={() => setActiveTab('settings')}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors self-start md:self-auto"
          >
            Manage Workspace Settings
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">Department Teams</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{teams.length}</p>
          <div className="mt-3 space-y-1.5 text-xs text-slate-300">
            {teams.map((t) => (
              <div key={t.id} className="flex justify-between py-1 border-b border-slate-800/60 last:border-0">
                <span>{t.name}</span>
                <span className="text-slate-500">{t.member_count} members</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">Project Initiatives</span>
            <FolderKanban className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{projects.length}</p>
          <div className="mt-3 space-y-1.5 text-xs text-slate-300">
            {projects.map((p) => (
              <div key={p.id} className="flex justify-between py-1 border-b border-slate-800/60 last:border-0">
                <span className="truncate max-w-[140px]">{p.title}</span>
                <span className="text-blue-400 font-mono">{p.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">Security Governance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">Enterprise Ready</p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
            <li className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-400">✓</span> Role-Based Authorization
            </li>
            <li className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-400">✓</span> Audit Trail Logging
            </li>
            <li className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-400">✓</span> Drizzle Type-Safety
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
