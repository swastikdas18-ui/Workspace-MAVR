import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  FolderKanban, CheckSquare, Users, DollarSign, 
  Layers, FileText, Activity, ArrowUpRight, Plus, 
  ShieldCheck, Clock, UserPlus, FileUp, Sparkles,
  TrendingUp, CheckCircle2, AlertCircle, ArrowRight,
  HardDrive, HeartPulse, Trophy, IndianRupee, Zap, AlertTriangle,
  BookOpen, Calendar
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
  const totalPipelineValue = crmRecords.reduce((acc, curr) => acc + curr.deal_value, 0);
  const wonDealsValue = crmRecords.filter(c => c.status === 'won').reduce((acc, curr) => acc + curr.deal_value, 0);
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 100;

  // Workspace Health Score (0 - 100)
  const projectScore = Math.min(25, projects.length * 8);
  const taskScore = Math.min(35, tasks.length * 4 + completedTasks * 5);
  const documentScore = Math.min(20, documents.length * 10);
  const memberScore = Math.min(20, users.length * 5);
  const healthScore = Math.min(100, Math.max(20, projectScore + taskScore + documentScore + memberScore));
  const healthRating = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Poor';

  // 14-Day Business Trial calculation
  const trialDaysRemaining = 12; // 14-day trial active
  const isTrial = currentWorkspace?.plan === 'business' || currentWorkspace?.plan === 'pro';

  return (
    <div className="space-y-8">
      {/* 14-Day Business Trial Banner */}
      {isTrial && trialDaysRemaining <= 14 && (
        <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-900/40 border border-blue-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  14-Day Business Plan Trial Active
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                  {trialDaysRemaining} Days Remaining
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Enjoy full access to 50 staff seats, 5 GB encrypted vault, automations, and advanced CRM.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('billing')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-500/25 transition-all shrink-0 cursor-pointer"
          >
            Manage Subscription
          </button>
        </div>
      )}

      {/* Onboarding Checklist for Rapid 15-Minute Activation */}
      <OnboardingChecklist />

      {/* TOP SECTION: Executive Welcome & Quick Actions */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#111827] via-[#0F172A] to-[#1E1B4B] border border-white/[0.08] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                MSME Executive Command Center
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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

      {/* PART 4 — CUSTOMER SUCCESS & HEALTH TELEMETRY */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-400" />
            <span>Customer Success & Workspace Health</span>
          </h2>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Health: {healthScore}/100 ({healthRating})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* 1. Health Score */}
          <MetricCard
            label="Workspace Health"
            value={`${healthScore} / 100`}
            icon={HeartPulse}
            color="emerald"
            trend={{ value: healthRating, direction: 'up', label: 'engagement' }}
            sparklineData={[50, 60, 70, 75, 80, 85, healthScore]}
          />

          {/* 2. Storage Usage */}
          <MetricCard
            label="Vault Storage"
            value="240 MB / 5 GB"
            icon={HardDrive}
            color="blue"
            trend={{ value: '4.8% used', direction: 'neutral', label: 'capacity' }}
            sparklineData={[100, 120, 140, 180, 210, 230, 240]}
            onClick={() => setActiveTab('documents')}
          />

          {/* 3. Member Usage */}
          <MetricCard
            label="Member Usage"
            value={`${users.length} / 50`}
            icon={Users}
            color="purple"
            trend={{ value: `${50 - users.length} seats free`, direction: 'neutral', label: 'licensed' }}
            sparklineData={[5, 10, 15, 20, 25, 30, users.length]}
            onClick={() => setActiveTab('teams')}
          />

          {/* 4. Project Activity */}
          <MetricCard
            label="Project Activity"
            value={projects.length}
            icon={FolderKanban}
            color="purple"
            trend={{ value: `${projects.filter(p => p.status === 'in_progress').length} active`, direction: 'up', label: 'delivery' }}
            sparklineData={[10, 20, 30, 40, 50, 60, 70]}
            onClick={() => setActiveTab('projects')}
          />

          {/* 5. Task Completion Rate */}
          <MetricCard
            label="Task Completion"
            value={`${taskCompletionRate}%`}
            icon={CheckSquare}
            color="amber"
            trend={{ value: `${completedTasks} of ${tasks.length}`, direction: 'up', label: 'velocity' }}
            sparklineData={[40, 55, 65, 75, 80, 90, taskCompletionRate]}
            onClick={() => setActiveTab('tasks')}
          />

          {/* 6. CRM Pipeline Value */}
          <MetricCard
            label="CRM Pipeline"
            value={`₹${(totalPipelineValue / 1000).toFixed(0)}k`}
            icon={IndianRupee}
            color="emerald"
            trend={{ value: `₹${(wonDealsValue / 1000).toFixed(0)}k won`, direction: 'up', label: 'revenue' }}
            sparklineData={[15, 30, 45, 50, 75, 80, 95]}
            onClick={() => setActiveTab('crm')}
          />
        </div>

        {/* Phase 13 MSME Productivity & Efficiency Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <MetricCard
            label="Wiki Adoption Rate"
            value="92%"
            icon={BookOpen}
            color="purple"
            trend={{ value: '3 Active SOPs', direction: 'up', label: 'knowledge base' }}
            sparklineData={[40, 60, 75, 80, 85, 90, 92]}
            onClick={() => setActiveTab('wiki')}
          />
          <MetricCard
            label="Billable Utilization"
            value="84.5%"
            icon={Clock}
            color="emerald"
            trend={{ value: 'Target: >75%', direction: 'up', label: 'efficiency' }}
            sparklineData={[60, 65, 70, 75, 80, 82, 84.5]}
            onClick={() => setActiveTab('time')}
          />
          <MetricCard
            label="Client Approval Velocity"
            value="4.2 hrs"
            icon={Sparkles}
            color="blue"
            trend={{ value: 'Fast sign-off', direction: 'up', label: 'portal' }}
            sparklineData={[12, 10, 8, 6, 5, 4.5, 4.2]}
            onClick={() => setActiveTab('portal')}
          />
          <MetricCard
            label="Discovery Call Conversion"
            value="68%"
            icon={Calendar}
            color="amber"
            trend={{ value: 'Google Meet sync', direction: 'up', label: 'meetings' }}
            sparklineData={[30, 40, 50, 55, 60, 65, 68]}
            onClick={() => setActiveTab('integrations')}
          />
        </div>
      </div>

      {/* STRATEGIC OVERVIEW & ZERO-TRUST AUDITS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Strategic Projects (Linear Inspired) */}
        <div className="lg:col-span-2 bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-400" />
                <span>Active Strategic Initiatives</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">High-impact delivery roadmaps</p>
            </div>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
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
                  className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.06] hover:border-blue-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white group-hover:text-blue-300 transition-colors">
                        {project.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/[0.06] capitalize">
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {project.progress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Target: {project.due_date}</span>
                    </div>
                    <span className="text-[11px] text-blue-300 group-hover:underline flex items-center gap-1">
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
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
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
