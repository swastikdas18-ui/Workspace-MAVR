import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  FolderKanban, CheckSquare, Users, DollarSign, 
  Layers, FileText, Activity, ArrowUpRight, Plus, 
  ShieldCheck, Clock, UserPlus, FileUp, Sparkles,
  TrendingUp, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { RoleBadge } from '../common/RoleBadge';
import { UserAvatar } from '../common/UserAvatar';
import { OnboardingChecklist } from '../onboarding/OnboardingChecklist';
import { motion } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const { 
    projects, tasks, users, crmRecords, teams, documents, systemLogs, 
    setActiveTab, currentWorkspace, currentUser 
  } = useWorkspace();

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent' || t.priority === 'critical').length;
  const totalPipelineValue = crmRecords.reduce((acc, curr) => acc + curr.deal_value, 0);
  const wonDealsValue = crmRecords.filter(c => c.status === 'won').reduce((acc, curr) => acc + curr.deal_value, 0);

  return (
    <div className="space-y-8">
      {/* Onboarding Checklist for Rapid 3-Minute Activation */}
      <OnboardingChecklist />
      {/* TOP SECTION: Executive Welcome & Quick Actions */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#111827] via-[#0F172A] to-[#1E1B4B] border border-white/[0.08] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Executive Command Center
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono">Workspace: {currentWorkspace.name}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              Real-time operational status across initiatives, team velocity, deal pipelines, and zero-trust workspace security.
            </p>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('projects')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Create Task</span>
            </button>

            <button
              onClick={() => setActiveTab('teams')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-400" />
              <span>Invite Member</span>
            </button>

            <button
              onClick={() => setActiveTab('crm')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Lead</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Doc</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI SECTION: 6 Executive Metrics (Stripe/Vercel Inspired) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white tracking-tight">Organization Telemetry</h2>
          <span className="text-xs text-slate-400">Live operational sync</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* 1. Projects */}
          <MetricCard
            label="Projects"
            value={projects.length}
            icon={FolderKanban}
            color="blue"
            trend={{ value: `${projects.filter(p => p.status === 'in_progress').length} active`, direction: 'up', label: 'in delivery' }}
            sparklineData={[30, 45, 50, 65, 70, 80, 85]}
            onClick={() => setActiveTab('projects')}
          />

          {/* 2. Tasks */}
          <MetricCard
            label="Tasks Velocity"
            value={tasks.length}
            icon={CheckSquare}
            color="purple"
            trend={{ value: `${completedTasks} done`, direction: 'up', label: 'completed' }}
            sparklineData={[20, 35, 45, 60, 75, 90, 100]}
            onClick={() => setActiveTab('tasks')}
          />

          {/* 3. Employees */}
          <MetricCard
            label="Employees"
            value={users.length}
            icon={Users}
            color="emerald"
            trend={{ value: '+100%', direction: 'neutral', label: 'active seats' }}
            sparklineData={[40, 40, 50, 60, 70, 80, 95]}
            onClick={() => setActiveTab('teams')}
          />

          {/* 4. Teams */}
          <MetricCard
            label="Teams"
            value={teams.length}
            icon={Layers}
            color="amber"
            trend={{ value: `${teams.length} pods`, direction: 'neutral', label: 'functional' }}
            sparklineData={[10, 20, 30, 40, 50, 60, 70]}
            onClick={() => setActiveTab('teams')}
          />

          {/* 5. CRM Pipeline Value */}
          <MetricCard
            label="CRM Pipeline"
            value={`$${(totalPipelineValue / 1000).toFixed(0)}k`}
            icon={DollarSign}
            color="purple"
            trend={{ value: `$${(wonDealsValue / 1000).toFixed(0)}k won`, direction: 'up', label: 'revenue' }}
            sparklineData={[15, 30, 45, 50, 75, 80, 95]}
            onClick={() => setActiveTab('crm')}
          />

          {/* 6. Documents */}
          <MetricCard
            label="Documents"
            value={documents.length}
            icon={FileText}
            color="rose"
            trend={{ value: `${documents.reduce((a, b) => a + b.download_count, 0)} hits`, direction: 'up', label: 'downloads' }}
            sparklineData={[25, 40, 55, 60, 70, 85, 90]}
            onClick={() => setActiveTab('documents')}
          />
        </div>
      </div>

      {/* STRATEGIC OVERVIEW & PIPELINE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Strategic Projects (Linear Inspired) */}
        <div className="lg:col-span-2 bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-purple-400" />
                <span>Active Strategic Initiatives</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">High-impact delivery roadmaps</p>
            </div>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Full Roadmap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No active projects found.
              </div>
            ) : (
              projects.slice(0, 4).map((project) => (
                <div
                  key={project.id}
                  onClick={() => setActiveTab('projects')}
                  className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.06] hover:border-purple-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors">
                        {project.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/[0.06] capitalize">
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400">
                      {project.progress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] h-full rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Target: {project.due_date}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] font-mono text-emerald-400">${project.budget?.toLocaleString() || 0}</span>
                    </div>
                    <span className="text-[11px] text-purple-300 group-hover:underline flex items-center gap-1">
                      Details <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Workspace Activity & Zero-Trust Audit Stream */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Zero-Trust Audit Stream</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time RBAC telemetry</p>
            </div>
            <button
              onClick={() => setActiveTab('admin_tools')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
            >
              Audits
            </button>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-96 pr-1">
            {systemLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No activity records logged.
              </div>
            ) : (
              systemLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04] text-xs hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-200">{log.user_name}</span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      {log.timestamp.includes(' ') ? log.timestamp.split(' ')[1] : log.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-snug">{log.action}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold ${
                      log.status === 'success' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : log.status === 'denied' 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {log.module} • {log.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
