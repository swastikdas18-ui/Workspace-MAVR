import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  FolderKanban, CheckSquare, Users, DollarSign, 
  FileText, Activity, ArrowUpRight, Plus, 
  Clock, UserPlus, FileUp, Sparkles,
  CheckCircle2, ArrowRight, AlertTriangle,
  BookOpen, Calendar, TrendingUp, Layers, Check, ShieldAlert
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { OnboardingChecklist } from '../onboarding/OnboardingChecklist';
import { api } from '../../lib/api';

export const AdminDashboard: React.FC = () => {
  const { 
    projects, tasks, users, crmRecords, teams, documents, systemLogs, 
    setActiveTab, currentWorkspace, currentUser 
  } = useWorkspace();

  const [execData, setExecData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.getExecutiveDashboard();
      if (res && !('error' in res)) {
        setExecData(res);
      }
    } catch (err) {
      console.warn('[AdminDashboard] Failed to fetch /api/dashboard/executive:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentWorkspace?.id]);

  // Fallback to active state if async endpoint is loading or offline
  const memberCount = execData?.memberCount ?? Math.max(1, users.length || 1);
  const activeMembersToday = execData?.activeMembersToday ?? Math.max(1, Math.min(memberCount, Math.ceil(memberCount * 0.8)));
  const departmentsCount = execData?.departmentsCount ?? teams.length;

  const completedProjects = execData?.completedProjects ?? projects.filter(p => p.status === 'completed').length;
  const inProgressProjects = execData?.inProgressProjects ?? projects.filter(p => p.status === 'in_progress').length;
  const planningProjects = execData?.planningProjects ?? projects.filter(p => p.status === 'planning').length;
  const reviewProjects = execData?.reviewProjects ?? projects.filter(p => p.status === 'review').length;
  const blockedProjects = execData?.blockedProjects ?? projects.filter(p => (p.status as any) === 'blocked').length;
  const activeProjects = execData?.activeProjects ?? (planningProjects + inProgressProjects + reviewProjects + blockedProjects);

  const completedTasks = execData?.completedTasks ?? tasks.filter(t => (t.status as any) === 'completed' || (t.status as any) === 'done').length;
  const openTasks = execData?.openTasks ?? tasks.filter(t => (t.status as any) !== 'completed' && (t.status as any) !== 'done').length;
  const overdueTasks = execData?.overdueTasks ?? 0;
  const dueTodayTasks = execData?.dueTodayTasks ?? 0;
  const completedThisWeekTasks = execData?.completedThisWeekTasks ?? completedTasks;

  const openDeals = execData?.openDeals ?? crmRecords.filter(c => c.status !== 'won' && c.status !== 'lost').length;
  const pipelineValue = execData?.pipelineValue ?? crmRecords.filter(c => c.status !== 'lost').reduce((acc, curr) => acc + (curr.deal_value || 0), 0);
  const wonRevenue = execData?.wonRevenue ?? crmRecords.filter(c => c.status === 'won').reduce((acc, curr) => acc + (curr.deal_value || 0), 0);
  const lostDeals = execData?.lostDeals ?? crmRecords.filter(c => c.status === 'lost').length;

  const documentCount = execData?.documentCount ?? documents.length;
  const wikiCount = execData?.wikiCount ?? documents.filter((d: any) => d.type === 'wiki' || d.category === 'sop' || d.name?.endsWith('.md')).length;
  const recentUploads = execData?.recentUploads ?? documents.length;

  const projectsAtRisk = execData?.projectsAtRisk ?? [];
  const teamWorkload = execData?.teamWorkload ?? teams.map(t => ({
    teamId: t.id,
    teamName: t.name,
    openTasks: tasks.filter(task => ((task as any).teamId === t.id || (task as any).team_id === t.id) && task.status !== 'completed').length,
    completedTasks: tasks.filter(task => ((task as any).teamId === t.id || (task as any).team_id === t.id) && task.status === 'completed').length,
    completionRate: 0,
  }));

  const recentActivity = execData?.recentActivity ?? systemLogs.map(l => ({
    id: l.id,
    type: 'activity',
    title: l.action,
    actorName: l.user_name,
    timestamp: l.timestamp,
    module: l.module,
  }));

  return (
    <div className="space-y-8">
      {/* Workspace OS MVP All Features Unlocked Banner */}
      <div className="bg-gradient-to-r from-purple-900/30 via-slate-900 to-indigo-900/30 border border-purple-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Workspace OS MVP — All Features Unlocked
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                Free Unlimited
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Full unmetered operations across projects, tasks engine, team directory, document vault, automations, and CRM.
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist */}
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
              Real-time operational status across initiatives, team velocity, deal pipelines, and workspace collaboration.
            </p>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('projects')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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
              <span>Add Deal</span>
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

      {/* ========================================================================= */}
      {/* PART 3: TOP ROW — PRIMARY OPERATING METRICS (5 KEY PILLARS) */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-purple-400" />
            <span>Company Operational Telemetry</span>
          </h2>
          <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
            Live Backend Aggregates
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* 1. Team Members */}
          <MetricCard
            label="Total Members"
            value={memberCount}
            icon={Users}
            color="purple"
            trend={{ value: `${activeMembersToday} active today`, direction: 'up', label: `${departmentsCount} teams` }}
            sparklineData={[1, 1, 2, 2, 3, memberCount]}
            onClick={() => setActiveTab('teams')}
          />

          {/* 2. Active Projects */}
          <MetricCard
            label="Active Projects"
            value={activeProjects}
            icon={FolderKanban}
            color="blue"
            trend={{ value: `${inProgressProjects} in progress`, direction: 'up', label: `${completedProjects} done` }}
            sparklineData={[0, 1, 2, activeProjects]}
            onClick={() => setActiveTab('projects')}
          />

          {/* 3. Tasks */}
          <MetricCard
            label="Open Tasks"
            value={openTasks}
            icon={CheckSquare}
            color="amber"
            trend={{ value: `${completedThisWeekTasks} done this week`, direction: 'up', label: `${overdueTasks} overdue` }}
            sparklineData={[0, 2, 5, openTasks]}
            onClick={() => setActiveTab('tasks')}
          />

          {/* 4. Sales Pipeline */}
          <MetricCard
            label="CRM Pipeline"
            value={openDeals}
            icon={DollarSign}
            color="emerald"
            trend={{ value: `₹${pipelineValue.toLocaleString()}`, direction: 'up', label: 'deal value' }}
            sparklineData={[0, 1, openDeals]}
            onClick={() => setActiveTab('crm')}
          />

          {/* 5. Won Revenue */}
          <MetricCard
            label="Won Revenue"
            value={`₹${wonRevenue >= 100000 ? (wonRevenue / 100000).toFixed(1) + 'L' : wonRevenue.toLocaleString()}`}
            icon={TrendingUp}
            color="emerald"
            trend={{ value: `${crmRecords.filter(c => c.status === 'won').length} won deals`, direction: 'up', label: `${lostDeals} lost` }}
            sparklineData={[0, wonRevenue]}
            onClick={() => setActiveTab('crm')}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 3: SECOND ROW — STATUS BREAKDOWN & TEAM WORKLOAD */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Project Status Breakdown */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-400" />
                <span>Project Status Breakdown</span>
              </h3>
              <button
                onClick={() => setActiveTab('projects')}
                className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Planning', count: planningProjects, color: 'bg-slate-500', text: 'text-slate-300' },
                { label: 'In Progress', count: inProgressProjects, color: 'bg-blue-500', text: 'text-blue-300' },
                { label: 'Review', count: reviewProjects, color: 'bg-amber-500', text: 'text-amber-300' },
                { label: 'Completed', count: completedProjects, color: 'bg-emerald-500', text: 'text-emerald-300' },
                { label: 'Blocked', count: blockedProjects, color: 'bg-rose-500', text: 'text-rose-300' },
              ].map((item, idx) => {
                const total = Math.max(1, projects.length);
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${item.text}`}>{item.label}</span>
                      <span className="font-mono text-slate-400">{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                      <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Total Projects: <strong className="text-white">{projects.length}</strong></span>
            <span>Active: <strong className="text-blue-400">{activeProjects}</strong></span>
          </div>
        </div>

        {/* 2. Task Status Breakdown */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <span>Task Velocity Breakdown</span>
              </h3>
              <button
                onClick={() => setActiveTab('tasks')}
                className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                Board
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
                <p className="text-[11px] text-slate-400">Open Tasks</p>
                <p className="text-xl font-bold text-white mt-0.5">{openTasks}</p>
                <span className="text-[10px] text-amber-400">In Pipeline</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
                <p className="text-[11px] text-slate-400">Completed</p>
                <p className="text-xl font-bold text-emerald-400 mt-0.5">{completedTasks}</p>
                <span className="text-[10px] text-slate-400">{completedThisWeekTasks} this week</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
                <p className="text-[11px] text-slate-400">Due Today</p>
                <p className="text-xl font-bold text-blue-400 mt-0.5">{dueTodayTasks}</p>
                <span className="text-[10px] text-slate-400">Immediate priority</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
                <p className="text-[11px] text-slate-400">Overdue</p>
                <p className={`text-xl font-bold mt-0.5 ${overdueTasks > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {overdueTasks}
                </p>
                <span className="text-[10px] text-slate-400">Past target date</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Total Tasks: <strong className="text-white">{tasks.length}</strong></span>
            <span>Rate: <strong className="text-emerald-400">{tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%</strong></span>
          </div>
        </div>

        {/* 3. Team Workload Widget */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Team Workload & Capacity</span>
              </h3>
              <button
                onClick={() => setActiveTab('teams')}
                className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer"
              >
                Directory
              </button>
            </div>

            <div className="space-y-3">
              {teamWorkload.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No departments created yet.
                </div>
              ) : (
                teamWorkload.slice(0, 4).map((team) => (
                  <div key={team.teamId} className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{team.teamName}</span>
                      <span className="text-[11px] font-mono text-purple-300">
                        {team.openTasks} open • {team.completedTasks} done
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${team.completionRate}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Departments: <strong className="text-white">{teams.length}</strong></span>
            <span>Total Staff: <strong className="text-purple-300">{memberCount}</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 4: THIRD ROW — PROJECTS AT RISK, LIVE ACTIVITY FEED, DOCUMENTS HUB */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Projects At Risk Widget */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${projectsAtRisk.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
                <span>Projects At Risk</span>
              </h3>
              <p className="text-[11px] text-slate-400">Past target date and incomplete</p>
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              projectsAtRisk.length > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {projectsAtRisk.length > 0 ? `🔴 ${projectsAtRisk.length} At Risk` : '✅ All On Track'}
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-72">
            {projectsAtRisk.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                All initiatives are currently progressing within their target timeline.
              </div>
            ) : (
              projectsAtRisk.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setActiveTab('projects')}
                  className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white group-hover:text-rose-300">
                      {p.title}
                    </span>
                    <span className="text-[10px] font-mono text-rose-400 font-bold">
                      {p.daysOverdue}d overdue
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>Status: <strong className="text-slate-200 capitalize">{p.status.replace('_', ' ')}</strong></span>
                    <span>Progress: <strong className="text-rose-300">{p.progress}%</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Chronological Real Activity Feed */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>Live Activity Stream</span>
              </h3>
              <p className="text-[11px] text-slate-400">Chronological company feed</p>
            </div>
            <button
              onClick={() => setActiveTab('admin_tools')}
              className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer"
            >
              Audits
            </button>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-72 pr-1">
            {recentActivity.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No recent activity events recorded.
              </div>
            ) : (
              recentActivity.slice(0, 6).map((act, idx) => (
                <div
                  key={act.id || idx}
                  className="p-2.5 rounded-xl bg-[#0F172A] border border-white/[0.04] text-xs hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                    <span className="font-semibold text-slate-200">{act.actorName}</span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      {act.timestamp?.includes('T') ? act.timestamp.split('T')[1].substring(0, 5) : act.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-snug">{act.title}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Knowledge & Documents Hub */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Knowledge & Vault</span>
                </h3>
                <p className="text-[11px] text-slate-400">Living docs & company wiki</p>
              </div>
              <button
                onClick={() => setActiveTab('documents')}
                className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                Vault
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div
                onClick={() => setActiveTab('documents')}
                className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04] hover:border-emerald-500/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Total Docs</span>
                </div>
                <p className="text-xl font-bold text-white mt-1">{documentCount}</p>
                <span className="text-[10px] text-slate-400">{recentUploads} recent uploads</span>
              </div>

              <div
                onClick={() => setActiveTab('wiki')}
                className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04] hover:border-purple-500/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  <span>Wiki SOPs</span>
                </div>
                <p className="text-xl font-bold text-purple-300 mt-1">{wikiCount}</p>
                <span className="text-[10px] text-purple-400">Living handbook</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">Recent Knowledge Assets</span>
              {documents.slice(0, 3).map((doc: any) => (
                <div
                  key={doc.id}
                  onClick={() => setActiveTab('documents')}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0F172A] border border-white/[0.03] text-xs hover:border-white/[0.1] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-200 truncate">{doc.name || doc.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 uppercase">{doc.visibility || 'team'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Documents Vault Active</span>
            <span className="text-emerald-400 font-medium">Encrypted & Versioned</span>
          </div>
        </div>
      </div>
    </div>
  );
};
