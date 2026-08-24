import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Building2, Users, FolderKanban, CheckSquare, Layers, ShieldCheck, ArrowUpRight, Sparkles } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { motion } from 'motion/react';

export const WorkspaceView: React.FC = () => {
  const { currentWorkspace, teams, projects, tasks, users, setActiveTab, currentRole } = useWorkspace();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Workspace Architecture & Clustering"
        description="Comprehensive workspace telemetry, enterprise infrastructure, and department structure."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold uppercase">
            {currentWorkspace.plan} Tier
          </span>
        }
        actions={
          currentRole === 'admin' && (
            <button
              onClick={() => setActiveTab('settings')}
              className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-[#1E293B] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
            >
              Configure Settings
            </button>
          )
        }
      />

      {/* Workspace Profile Hero Card */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7C3AED] via-[#9333EA] to-[#C084FC] flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-purple-600/30">
            {currentWorkspace.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{currentWorkspace.name}</h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase font-mono font-semibold">
                Operational
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Identifier: <span className="text-purple-300 font-semibold">{currentWorkspace.slug}</span> • Provisioned Cluster: us-east4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.06] text-center">
            <span className="text-slate-400 text-[10px] block uppercase">Members</span>
            <span className="font-bold text-white text-sm">{users.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.06] text-center">
            <span className="text-slate-400 text-[10px] block uppercase">Teams</span>
            <span className="font-bold text-purple-400 text-sm">{teams.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.06] text-center">
            <span className="text-slate-400 text-[10px] block uppercase">Projects</span>
            <span className="font-bold text-blue-400 text-sm">{projects.length}</span>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Department Taxonomy</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{teams.length}</p>
          <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-white/[0.04]">
            {teams.map((t) => (
              <div key={t.id} className="flex justify-between items-center py-1">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || '#7C3AED' }} />
                  <span>{t.name}</span>
                </span>
                <span className="text-slate-500 font-mono">{t.member_count} members</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Roadmaps</span>
            <FolderKanban className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{projects.length}</p>
          <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-white/[0.04]">
            {projects.map((p) => (
              <div key={p.id} className="flex justify-between items-center py-1">
                <span className="truncate max-w-[150px] font-medium">{p.title}</span>
                <span className="text-purple-400 font-mono">{p.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Zero-Trust Posture</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">Enterprise Ready</p>
          <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-white/[0.04]">
            <li className="flex items-center gap-2 text-slate-400">
              <span className="text-emerald-400 font-bold">✓</span> Server-Side RBAC Enforcement
            </li>
            <li className="flex items-center gap-2 text-slate-400">
              <span className="text-emerald-400 font-bold">✓</span> Live Tamper-Proof Audit Trails
            </li>
            <li className="flex items-center gap-2 text-slate-400">
              <span className="text-emerald-400 font-bold">✓</span> Drizzle Type-Safety & Better Auth
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
