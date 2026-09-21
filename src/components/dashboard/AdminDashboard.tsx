import React, { useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  FolderKanban, CheckSquare, Users, DollarSign, 
  FileText, Activity, Plus, 
  UserPlus, FileUp, Sparkles,
  CheckCircle2, ArrowRight, AlertTriangle,
  TrendingUp, Zap
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { OnboardingChecklist } from '../onboarding/OnboardingChecklist';

import { useAdminDashboardData } from '../../features/dashboard';

export const AdminDashboard: React.FC = () => {
  const { 
    projects, tasks, users, crmRecords, teams, documents, systemLogs, 
    setActiveTab, currentWorkspace, currentUser 
  } = useWorkspace();

  const { execData, peopleAnalytics, automationAnalytics } = useAdminDashboardData(currentWorkspace?.id);

  // Memoized metrics calculation to eliminate redundant loops on renders
  const {
    memberCount, activeMembersToday, departmentsCount,
    completedProjects, inProgressProjects, planningProjects, reviewProjects, blockedProjects, activeProjects,
    completedTasks, openTasks, overdueTasks, dueTodayTasks, completedThisWeekTasks,
    openDeals, pipelineValue, wonRevenue, lostDeals,
    documentCount, wikiCount,
    projectsAtRisk, teamWorkload, recentActivity
  } = useMemo(() => {
    const memCount = execData?.memberCount ?? Math.max(1, users.length || 1);
    const activeToday = execData?.activeMembersToday ?? Math.max(1, Math.min(memCount, Math.ceil(memCount * 0.8)));
    const deptCount = execData?.departmentsCount ?? teams.length;

    const compProjects = execData?.completedProjects ?? projects.filter(p => p.status === 'completed').length;
    const inProgProjects = execData?.inProgressProjects ?? projects.filter(p => p.status === 'in_progress').length;
    const planProjects = execData?.planningProjects ?? projects.filter(p => p.status === 'planning').length;
    const revProjects = execData?.reviewProjects ?? projects.filter(p => p.status === 'review').length;
    const blkProjects = execData?.blockedProjects ?? projects.filter(p => (p.status as any) === 'blocked').length;
    const actProjects = execData?.activeProjects ?? (planProjects + inProgProjects + revProjects + blkProjects);

    const compTasks = execData?.completedTasks ?? tasks.filter(t => (t.status as any) === 'completed' || (t.status as any) === 'done').length;
    const opnTasks = execData?.openTasks ?? tasks.filter(t => (t.status as any) !== 'completed' && (t.status as any) !== 'done').length;
    const ovrTasks = execData?.overdueTasks ?? 0;
    const dtTasks = execData?.dueTodayTasks ?? 0;
    const compWkTasks = execData?.completedThisWeekTasks ?? compTasks;

    const opnDeals = execData?.openDeals ?? crmRecords.filter(c => c.status !== 'won' && c.status !== 'lost').length;
    const pipeValue = execData?.pipelineValue ?? crmRecords.filter(c => c.status !== 'lost').reduce((acc, curr) => acc + (curr.deal_value || 0), 0);
    const wRevenue = execData?.wonRevenue ?? crmRecords.filter(c => c.status === 'won').reduce((acc, curr) => acc + (curr.deal_value || 0), 0);
    const lstDeals = execData?.lostDeals ?? crmRecords.filter(c => c.status === 'lost').length;

    const docCount = execData?.documentCount ?? documents.length;
    const wkCount = execData?.wikiCount ?? documents.filter((d: any) => d.type === 'wiki' || d.category === 'sop' || d.name?.endsWith('.md')).length;

    const pAtRisk = execData?.projectsAtRisk ?? [];
    const tWorkload = execData?.teamWorkload ?? teams.map(t => ({
      teamId: t.id,
      teamName: t.name,
      openTasks: tasks.filter(task => ((task as any).teamId === t.id || (task as any).team_id === t.id) && task.status !== 'completed').length,
      completedTasks: tasks.filter(task => ((task as any).teamId === t.id || (task as any).team_id === t.id) && task.status === 'completed').length,
      completionRate: 0,
    }));

    const recActivity = execData?.recentActivity ?? systemLogs.map(l => ({
      id: l.id,
      type: 'activity',
      title: l.action,
      actorName: l.user_name,
      timestamp: l.timestamp,
      module: l.module,
    }));

    return {
      memberCount: memCount,
      activeMembersToday: activeToday,
      departmentsCount: deptCount,
      completedProjects: compProjects,
      inProgressProjects: inProgProjects,
      planningProjects: planProjects,
      reviewProjects: revProjects,
      blockedProjects: blkProjects,
      activeProjects: actProjects,
      completedTasks: compTasks,
      openTasks: opnTasks,
      overdueTasks: ovrTasks,
      dueTodayTasks: dtTasks,
      completedThisWeekTasks: compWkTasks,
      openDeals: opnDeals,
      pipelineValue: pipeValue,
      wonRevenue: wRevenue,
      lostDeals: lstDeals,
      documentCount: docCount,
      wikiCount: wkCount,
      projectsAtRisk: pAtRisk,
      teamWorkload: tWorkload,
      recentActivity: recActivity
    };
  }, [execData, users, teams, projects, tasks, crmRecords, documents, systemLogs]);

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* PRIORITY 1: DASHBOARD OVERVIEW & QUICK ACTIONS */}
      {/* ========================================================================= */}
      <div className="ui-card p-6 sm:p-8 relative overflow-hidden bg-[#151D2E] border border-[#1E293B]">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="ui-caption font-bold text-emerald-400 uppercase tracking-wider">
                Workspace Overview
              </span>
              <span className="text-slate-600">•</span>
              <span className="ui-mono text-slate-400 font-medium">Workspace: {currentWorkspace.name}</span>
            </div>

            <h1 className="ui-h1 text-white font-heading">
              Welcome back, {currentUser.name}
            </h1>
            <p className="ui-body text-slate-400 max-w-2xl font-normal">
              Here is what is happening across your projects, team members, sales pipeline, and documents today.
            </p>
          </div>

          {/* Clean Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveTab('projects')}
              className="ui-btn ui-btn-primary"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              <span>New Project</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className="ui-btn ui-btn-secondary"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>New Task</span>
            </button>

            <button
              onClick={() => setActiveTab('teams')}
              className="ui-btn ui-btn-secondary"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Invite Member</span>
            </button>

            <button
              onClick={() => setActiveTab('crm')}
              className="ui-btn ui-btn-secondary"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Deal</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className="ui-btn ui-btn-secondary"
            >
              <FileUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Upload File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Plan Banner - Emerald Glow */}
      <div className="px-4 py-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="ui-caption text-slate-300">
            <strong className="text-white font-bold">Workspace Active:</strong> Everything you need to manage projects, tasks, team directory, files, automations, and sales in one place.
          </p>
        </div>
        <span className="ui-mono text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shrink-0">
          Unlimited Plan
        </span>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist />

      {/* ========================================================================= */}
      {/* PRIORITY 2: KEY PERFORMANCE METRICS */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="ui-caption font-bold uppercase tracking-wider text-slate-400">
              Key Metrics at a Glance
            </h2>
          </div>
          <span className="ui-mono text-[10px] text-emerald-400 font-medium">
            Live Updates
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
      {/* PRIORITY 3: PROJECT & TASK PROGRESS */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="ui-caption font-bold uppercase tracking-wider text-slate-400">
            Projects & Task Progress
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Projects Status */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="ui-h3 flex items-center gap-2 text-white font-heading">
                <FolderKanban className="w-4 h-4 text-emerald-400" />
                <span>Projects Overview</span>
              </h3>
              <button
                onClick={() => setActiveTab('projects')}
                className="ui-caption text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B]">
                <span className="ui-caption text-slate-400 font-medium">Planning</span>
                <div className="ui-h2 text-white mt-1">{planningProjects}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B]">
                <span className="ui-caption text-sky-400 font-semibold">In Progress</span>
                <div className="ui-h2 text-sky-400 mt-1">{inProgressProjects}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B]">
                <span className="ui-caption text-amber-400 font-semibold">In Review</span>
                <div className="ui-h2 text-amber-400 mt-1">{reviewProjects}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B]">
                <span className="ui-caption text-emerald-400 font-semibold">Completed</span>
                <div className="ui-h2 text-emerald-400 mt-1">{completedProjects}</div>
              </div>
            </div>

            {blockedProjects > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-rose-400 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Blocked Initiatives</span>
                </div>
                <span className="text-sm font-bold text-rose-400">{blockedProjects}</span>
              </div>
            )}

            {/* Projects At Risk Alert Box */}
            {projectsAtRisk.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                <span className="ui-caption font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Deadlines At Risk</span>
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {projectsAtRisk.map((p: any) => (
                    <div
                      key={p.id}
                      onClick={() => setActiveTab('projects')}
                      className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-400/40 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <span className="text-slate-200 font-medium truncate max-w-[160px]">{p.title}</span>
                      <span className="text-rose-400 font-mono text-[10px] shrink-0 font-bold">
                        +{p.daysOverdue}d overdue
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Task Velocity */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="ui-h3 flex items-center gap-2 text-white font-heading">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Task Completion</span>
              </h3>
              <button
                onClick={() => setActiveTab('tasks')}
                className="ui-caption text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View Board</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Velocity Progress Bar */}
            <div className="p-4 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Completion Rate</span>
                <span className="text-white font-mono font-bold">
                  {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${tasks.length > 0 ? Math.min(100, Math.round((completedTasks / tasks.length) * 100)) : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-medium">
                <span>{completedTasks} completed</span>
                <span>{openTasks} active</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B]">
                <span className="ui-caption text-amber-400 font-semibold">Due Today</span>
                <div className="ui-h2 text-white mt-1">{dueTodayTasks}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B]">
                <span className="ui-caption text-rose-400 font-semibold">Overdue</span>
                <div className="ui-h2 text-rose-400 mt-1">{overdueTasks}</div>
              </div>
            </div>
          </div>

          {/* Team Workload */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="ui-h3 flex items-center gap-2 text-white font-heading">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Team Workload</span>
              </h3>
              <button
                onClick={() => setActiveTab('teams')}
                className="ui-caption text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Directory</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {teamWorkload.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                  <Users className="w-5 h-5 text-slate-700" strokeWidth={1.5} />
                  <p className="text-xs font-semibold text-slate-500">No Teams Configured</p>
                  <p className="text-[11px] text-slate-600">Create department teams to see workload distribution.</p>
                </div>
              ) : (
                teamWorkload.map((team: any) => (
                  <div key={team.teamId} className="p-3 rounded-xl bg-[#111827] border border-[#1E293B] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-semibold truncate max-w-[140px]">{team.teamName}</span>
                      <span className="text-[11px] font-mono text-emerald-400 font-medium">
                        {team.openTasks} active / {team.completedTasks} done
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
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
      </div>

      {/* ========================================================================= */}
      {/* PRIORITY 4: WORKSPACE ACTIVITY & FILES */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="ui-caption font-bold uppercase tracking-wider text-stone-500">
            Recent Activity & Knowledge
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Real-time System Audit & Activity Feed */}
          <div className="lg:col-span-2 ui-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
              <h3 className="ui-h3 flex items-center gap-2 text-stone-900 font-heading">
                <Activity className="w-4 h-4 text-amber-700" />
                <span>Recent Workspace Activity</span>
              </h3>
              <span className="ui-mono text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                Live Feed
              </span>
            </div>

            <div className="divide-y divide-[#E8E3DA] max-h-72 overflow-y-auto pr-1">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <Activity className="w-5 h-5 text-slate-700" strokeWidth={1.5} />
                  <p className="text-xs font-semibold text-slate-500">No Activity Yet</p>
                  <p className="text-[11px] text-slate-600">Workspace actions — project updates, task changes, team events — will appear here in real time.</p>
                </div>
              ) : (
                recentActivity.map((act: any) => (
                  <div key={act.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-amber-700 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-stone-800 font-semibold truncate">{act.title}</p>
                        <p className="text-[11px] text-stone-500 truncate">
                          By <span className="text-stone-700 font-medium">{act.actorName}</span> • {act.module}
                        </p>
                      </div>
                    </div>
                    <span className="ui-mono text-[10px] text-stone-400 shrink-0 font-medium">
                      {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Documents Vault Quick Insight */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
              <h3 className="ui-h3 flex items-center gap-2 text-stone-900 font-heading">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>Docs & Files</span>
              </h3>
              <button
                onClick={() => setActiveTab('documents')}
                className="ui-caption text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DA]">
                <span className="ui-caption text-stone-500 font-medium">Total Files</span>
                <div className="ui-h2 text-stone-900 mt-1">{documentCount}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DA]">
                <span className="ui-caption text-amber-800 font-semibold">Wiki / Guides</span>
                <div className="ui-h2 text-amber-800 mt-1">{wikiCount}</div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <span className="ui-caption font-bold uppercase tracking-wider text-stone-500">
                Recent Documents
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {documents.slice(0, 4).map((doc: any) => (
                  <div
                    key={doc.id}
                    onClick={() => setActiveTab('documents')}
                    className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA] hover:border-amber-400/60 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span className="text-stone-800 font-medium truncate">{doc.name || doc.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Team & Personnel Overview */}
        <div className="ui-card p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E8E3DA]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="ui-h3 flex items-center gap-2 text-stone-900 font-heading">
                  <span>Team & Personnel</span>
                  <span className="ui-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    Directory
                  </span>
                </h3>
                <p className="ui-body text-stone-500 mt-0.5 font-normal">
                  Team size, active members today, department breakdowns, and task completion.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('teams')}
              className="ui-btn ui-btn-secondary"
            >
              <span>Manage Team</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Workforce Breakdown */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DA] space-y-2">
              <div className="flex items-center justify-between ui-caption text-stone-500 font-medium">
                <span>Team Members</span>
                <Users className="w-3.5 h-3.5 text-stone-600" />
              </div>
              <div className="ui-h2 text-stone-900">
                {peopleAnalytics?.workforce?.totalEmployees ?? users.length} <span className="ui-caption font-normal text-stone-500">Members</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#E8E3DA]">
                <span>{peopleAnalytics?.workforce?.departmentsCount ?? teams.length} Teams</span>
                <span>{peopleAnalytics?.workforce?.internsCount ?? users.filter(u => u.role === 'intern').length} Interns</span>
              </div>
            </div>

            {/* Daily Attendance */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DA] space-y-2">
              <div className="flex items-center justify-between ui-caption text-stone-500 font-medium">
                <span>Today's Attendance</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div className="ui-h2 text-emerald-700">
                {peopleAnalytics?.attendance?.attendanceRate ?? (users.length > 0 ? 100 : 0)}%
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#E8E3DA]">
                <span>{peopleAnalytics?.attendance?.presentToday ?? activeMembersToday} Present</span>
                <span className="text-amber-800">{peopleAnalytics?.attendance?.lateToday ?? 0} Late</span>
              </div>
            </div>

            {/* Hiring & Growth */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DA] space-y-2">
              <div className="flex items-center justify-between ui-caption text-stone-500 font-medium">
                <span>Open Positions</span>
                <UserPlus className="w-3.5 h-3.5 text-sky-700" />
              </div>
              <div className="ui-h2 text-sky-700">
                {peopleAnalytics?.hiring?.openPositions ?? 0} <span className="ui-caption font-normal text-stone-500">Open</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#E8E3DA]">
                <span>New Joinees: {peopleAnalytics?.hiring?.newJoineesCount ?? users.length}</span>
              </div>
            </div>

            {/* Performance & OKRs */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DA] space-y-2">
              <div className="flex items-center justify-between ui-caption text-stone-500 font-medium">
                <span>Goal Progress</span>
                <TrendingUp className="w-3.5 h-3.5 text-stone-700" />
              </div>
              <div className="ui-h2 text-stone-900">
                {peopleAnalytics?.performance?.averageGoalProgress ?? (tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0)}%
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#E8E3DA]">
                <span>At-Risk Goals: {peopleAnalytics?.performance?.atRiskCount ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Automations & Workflows */}
        <div className="ui-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E3DA]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="ui-h3 flex items-center gap-2 text-stone-900 font-heading">
                  <span>Automations & Workflows</span>
                  <span className="ui-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60 font-semibold">
                    Active
                  </span>
                </h3>
                <p className="ui-body text-stone-500 mt-0.5 font-normal">
                  Background tasks, event triggers, and rule executions.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('automations')}
              className="ui-btn ui-btn-secondary"
            >
              <span>View Automations</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-600" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DA]">
              <span className="ui-caption font-semibold text-stone-500">Automations Run</span>
              <div className="ui-h2 text-stone-900 mt-1">
                {automationAnalytics?.totalExecutions ?? (automationAnalytics?.automationExecutions ?? 0)}
              </div>
              <span className="text-[11px] text-emerald-700 font-medium">System triggers & actions</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DA]">
              <span className="ui-caption font-semibold text-stone-500">Success Rate</span>
              <div className="ui-h2 text-emerald-700 mt-1">
                {automationAnalytics?.successRate !== undefined ? `${automationAnalytics.successRate}%` : '100%'}
              </div>
              <span className="text-[11px] text-stone-500 font-medium">Completed smoothly</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DA]">
              <span className="ui-caption font-semibold text-stone-500">Failed Runs</span>
              <div className="ui-h2 text-stone-600 mt-1">
                {automationAnalytics?.failedExecutions ?? (automationAnalytics?.failedCount ?? 0)}
              </div>
              <span className="text-[11px] text-emerald-700 font-medium">All running as expected</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3DA]">
              <span className="ui-caption font-semibold text-stone-500">Active Rules</span>
              <div className="ui-h2 text-amber-800 mt-1">
                {automationAnalytics?.activeRules ?? (automationAnalytics?.totalRules ?? 0)} Rules
              </div>
              <span className="text-[11px] text-stone-500 font-medium">Configured workflows</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
