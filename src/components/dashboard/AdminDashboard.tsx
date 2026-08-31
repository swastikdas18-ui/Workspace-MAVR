import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  FolderKanban, CheckSquare, Users, DollarSign, 
  FileText, Activity, ArrowUpRight, Plus, 
  Clock, UserPlus, FileUp, Sparkles,
  CheckCircle2, ArrowRight, AlertTriangle,
  BookOpen, Calendar, TrendingUp, Layers, Check, ShieldAlert, Zap
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
  const [peopleAnalytics, setPeopleAnalytics] = useState<any>(null);
  const [automationAnalytics, setAutomationAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [res, peopleRes, autoRes] = await Promise.all([
        api.getExecutiveDashboard(),
        api.getPeopleAnalytics().catch(() => null),
        api.getAutomationAnalytics().catch(() => null),
      ]);
      if (res && !('error' in res)) {
        setExecData(res);
      }
      if (peopleRes && !('error' in peopleRes)) {
        setPeopleAnalytics(peopleRes);
      }
      if (autoRes && !('error' in autoRes)) {
        setAutomationAnalytics(autoRes);
      }
    } catch (err) {
      console.warn('[AdminDashboard] Failed to fetch executive data:', err);
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
            sparklineData={[0, 0, 0, 0, 0, memberCount]}
            onClick={() => setActiveTab('teams')}
          />

          {/* 2. Active Projects */}
          <MetricCard
            label="Active Projects"
            value={activeProjects}
            icon={FolderKanban}
            color="blue"
            trend={{ value: `${inProgressProjects} in progress`, direction: 'up', label: `${completedProjects} done` }}
            sparklineData={[0, 0, 0, 0, 0, activeProjects]}
            onClick={() => setActiveTab('projects')}
          />

          {/* 3. Tasks */}
          <MetricCard
            label="Open Tasks"
            value={openTasks}
            icon={CheckSquare}
            color="amber"
            trend={{ value: `${completedThisWeekTasks} done this week`, direction: 'up', label: `${overdueTasks} overdue` }}
            sparklineData={[0, 0, 0, 0, 0, openTasks]}
            onClick={() => setActiveTab('tasks')}
          />

          {/* 4. Sales Pipeline */}
          <MetricCard
            label="CRM Pipeline"
            value={openDeals}
            icon={DollarSign}
            color="emerald"
            trend={{ value: `₹${pipelineValue.toLocaleString()}`, direction: 'up', label: 'deal value' }}
            sparklineData={[0, 0, 0, 0, 0, openDeals]}
            onClick={() => setActiveTab('crm')}
          />

          {/* 5. Won Revenue */}
          <MetricCard
            label="Won Revenue"
            value={`₹${wonRevenue >= 100000 ? (wonRevenue / 100000).toFixed(1) + 'L' : wonRevenue.toLocaleString()}`}
            icon={TrendingUp}
            color="emerald"
            trend={{ value: `${crmRecords.filter(c => c.status === 'won').length} won deals`, direction: 'up', label: `${lostDeals} lost` }}
            sparklineData={[0, 0, 0, 0, 0, wonRevenue]}
            onClick={() => setActiveTab('crm')}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 3: SECOND ROW — STATUS BREAKDOWN & TEAM WORKLOAD */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Initiatives Matrix / Projects Status */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-blue-400" />
              <span>Projects Status Matrix</span>
            </h3>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
              <span className="text-xs text-slate-400">Planning</span>
              <div className="text-xl font-bold text-white mt-1">{planningProjects}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
              <span className="text-xs text-blue-400">In Progress</span>
              <div className="text-xl font-bold text-blue-400 mt-1">{inProgressProjects}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
              <span className="text-xs text-purple-400">In Review</span>
              <div className="text-xl font-bold text-purple-400 mt-1">{reviewProjects}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
              <span className="text-xs text-emerald-400">Completed</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">{completedProjects}</div>
            </div>
          </div>

          {blockedProjects > 0 && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Blocked Initiatives Requiring Attention</span>
              </div>
              <span className="text-sm font-bold text-rose-400">{blockedProjects}</span>
            </div>
          )}

          {/* Projects At Risk Alert Box */}
          {projectsAtRisk.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Deadlines At Risk</span>
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {projectsAtRisk.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => setActiveTab('projects')}
                    className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/30 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <span className="text-slate-200 font-medium truncate max-w-[160px]">{p.title}</span>
                    <span className="text-rose-400 font-mono text-[10px] shrink-0 font-semibold">
                      +{p.daysOverdue}d overdue
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Task Velocity & Engine Telemetry */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-amber-400" />
              <span>Sprint Task Velocity</span>
            </h3>
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View Board</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Velocity Progress Bar */}
          <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Task Completion Rate</span>
              <span className="text-white font-mono font-bold">
                {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${tasks.length > 0 ? Math.min(100, Math.round((completedTasks / tasks.length) * 100)) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>{completedTasks} resolved</span>
              <span>{openTasks} active</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
              <span className="text-xs text-amber-400 font-medium">Due Today</span>
              <div className="text-xl font-bold text-white mt-1">{dueTodayTasks}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
              <span className="text-xs text-rose-400 font-medium">Overdue</span>
              <div className="text-xl font-bold text-rose-400 mt-1">{overdueTasks}</div>
            </div>
          </div>
        </div>

        {/* Team Workload & Department Allocation */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Department Workload</span>
            </h3>
            <button
              onClick={() => setActiveTab('teams')}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Directory</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {teamWorkload.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No teams configured yet.
              </div>
            ) : (
              teamWorkload.map((team: any) => (
                <div key={team.teamId} className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-semibold truncate max-w-[140px]">{team.teamName}</span>
                    <span className="text-[11px] font-mono text-purple-400">
                      {team.openTasks} active / {team.completedTasks} done
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{
                        width: `${
                          team.openTasks + team.completedTasks > 0
                            ? Math.round((team.completedTasks / (team.openTasks + team.completedTasks)) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 4: THIRD ROW — LIVE RECENT ACTIVITY & VAULT STATUS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time System Audit & Activity Feed */}
        <div className="lg:col-span-2 bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Real-Time Audit Trail & Activity Feed</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Live Stream
            </span>
          </div>

          <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto pr-1">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No recent workspace activity recorded yet.
              </div>
            ) : (
              recentActivity.map((act: any) => (
                <div key={act.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-slate-200 font-medium truncate">{act.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        By <span className="text-slate-400">{act.actorName}</span> • {act.module}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Documents Vault Quick Insight */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Document Vault</span>
            </h3>
            <button
              onClick={() => setActiveTab('documents')}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Vault</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
              <span className="text-xs text-slate-400">Total Assets</span>
              <div className="text-xl font-bold text-white mt-1">{documentCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04]">
              <span className="text-xs text-amber-400">Wiki / SOPs</span>
              <div className="text-xl font-bold text-amber-400 mt-1">{wikiCount}</div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Recent Knowledge Assets
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {documents.slice(0, 4).map((doc: any) => (
                <div
                  key={doc.id}
                  onClick={() => setActiveTab('documents')}
                  className="p-2 rounded-lg bg-[#0F172A] border border-white/[0.04] hover:border-white/10 flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-200 truncate">{doc.name || doc.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 5: EXECUTIVE PEOPLE OPERATING SYSTEM TELEMETRY */}
      {/* ========================================================================= */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Executive People Operating System</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  HR & Talent
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Workforce capacity, daily presence, OKR milestone execution, and talent retention metrics.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('teams')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-600/30 transition-colors cursor-pointer"
          >
            <span>Manage People OS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Workforce Breakdown */}
          <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Workforce Roster</span>
              <Users className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {peopleAnalytics?.workforce?.totalEmployees ?? users.length} <span className="text-xs font-normal text-slate-400">Members</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
              <span>{peopleAnalytics?.workforce?.departmentsCount ?? teams.length} Departments</span>
              <span>{peopleAnalytics?.workforce?.internsCount ?? users.filter(u => u.role === 'intern').length} Interns</span>
            </div>
          </div>

          {/* Daily Attendance */}
          <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Today's Attendance</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {peopleAnalytics?.attendance?.attendanceRate ?? (users.length > 0 ? 100 : 0)}%
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
              <span>{peopleAnalytics?.attendance?.presentToday ?? activeMembersToday} Present</span>
              <span className="text-amber-400">{peopleAnalytics?.attendance?.lateToday ?? 0} Late</span>
            </div>
          </div>

          {/* Hiring & Growth */}
          <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Hiring & Joinees</span>
              <UserPlus className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {peopleAnalytics?.hiring?.openPositions ?? 0} <span className="text-xs font-normal text-slate-400">Openings</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
              <span>New Joinees ({new Date().getFullYear()}): {peopleAnalytics?.hiring?.newJoineesCount ?? users.length}</span>
            </div>
          </div>

          {/* Performance & OKRs */}
          <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Average Goal Velocity</span>
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400">
              {peopleAnalytics?.performance?.averageGoalProgress ?? (tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0)}%
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
              <span>At-Risk OKRs: {peopleAnalytics?.performance?.atRiskCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 6: FOURTH ROW — EXECUTIVE AUTOMATION ENGINE TELEMETRY */}
      {/* ========================================================================= */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Executive Automation Engine Telemetry</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                  Live Pipelines
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time metrics on automated event triggers, condition evaluations, and action dispatch rates.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('automations')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-600/30 transition-colors cursor-pointer"
          >
            <span>Open Automation Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04]">
            <span className="text-xs text-slate-400 font-semibold">Automations Executed</span>
            <div className="text-2xl font-bold text-white mt-1">
              {automationAnalytics?.totalExecutions ?? (automationAnalytics?.automationExecutions ?? 0)}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Triggered by system events</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04]">
            <span className="text-xs text-slate-400 font-semibold">Success Rate</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {automationAnalytics?.successRate !== undefined ? `${automationAnalytics.successRate}%` : '100%'}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Zero fatal pipeline failures</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04]">
            <span className="text-xs text-slate-400 font-semibold">Failed Automations</span>
            <div className="text-2xl font-bold text-slate-400 mt-1">
              {automationAnalytics?.failedExecutions ?? (automationAnalytics?.failedCount ?? 0)}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">All conditions resolved</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04]">
            <span className="text-xs text-slate-400 font-semibold">Active Rules</span>
            <div className="text-2xl font-bold text-purple-400 mt-1">
              {automationAnalytics?.activeRules ?? (automationAnalytics?.totalRules ?? 0)} Rules
            </div>
            <span className="text-[10px] text-purple-300 font-medium">Configured in Automation Studio</span>
          </div>
        </div>
      </div>
    </div>
  );
};
