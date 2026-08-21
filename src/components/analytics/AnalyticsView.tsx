import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  BarChart3, TrendingUp, CheckCircle2, DollarSign, FolderKanban, 
  Users, ArrowUpRight, ShieldCheck, Activity 
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { projects, tasks, crmRecords, users, teams } = useWorkspace();

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const reviewTasks = tasks.filter((t) => t.status === 'review').length;
  const todoTasks = tasks.filter((t) => t.status === 'todo').length;

  const totalRevenue = crmRecords.filter((r) => r.status === 'won').reduce((a, b) => a + b.deal_value, 0);
  const inPipelineRevenue = crmRecords.filter((r) => r.status !== 'won' && r.status !== 'lost').reduce((a, b) => a + b.deal_value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Organization Analytics & Reports</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
            Admin Intelligence
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Executive performance metrics across roadmaps, task velocity, revenue conversion, and team load.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Total Closed Revenue</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${totalRevenue.toLocaleString()}</p>
          <span className="text-[11px] text-emerald-400/80 font-medium">Won contracts</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Pipeline In-Flight</span>
          <p className="text-2xl font-bold text-purple-400 mt-1">${inPipelineRevenue.toLocaleString()}</p>
          <span className="text-[11px] text-purple-400/80 font-medium">{crmRecords.length} deals</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Task Velocity</span>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {Math.round((completedTasks / (tasks.length || 1)) * 100)}%
          </p>
          <span className="text-[11px] text-blue-400/80 font-medium">{completedTasks} of {tasks.length} resolved</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Active Workforces</span>
          <p className="text-2xl font-bold text-cyan-400 mt-1">{users.length}</p>
          <span className="text-[11px] text-cyan-400/80 font-medium">{teams.length} departments</span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>Task Pipeline Distribution</span>
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-300">
                <span>Completed Tasks</span>
                <span className="font-semibold text-emerald-400">{completedTasks}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(completedTasks / (tasks.length || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-300">
                <span>In Review Tasks</span>
                <span className="font-semibold text-purple-400">{reviewTasks}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(reviewTasks / (tasks.length || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-300">
                <span>In Progress Tasks</span>
                <span className="font-semibold text-blue-400">{inProgressTasks}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(inProgressTasks / (tasks.length || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-300">
                <span>Backlog / To Do</span>
                <span className="font-semibold text-slate-400">{todoTasks}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-600 h-full rounded-full" style={{ width: `${(todoTasks / (tasks.length || 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Project Completion Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-purple-400" />
            <span>Active Project Milestones</span>
          </h3>

          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active projects to report.
              </div>
            ) : (
              projects.map((proj) => (
                <div key={proj.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex justify-between text-xs font-semibold text-white mb-1.5">
                    <span className="truncate max-w-[200px]">{proj.title}</span>
                    <span className="text-blue-400 font-mono">{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Due: {proj.due_date}</span>
                    <span className="text-emerald-400 font-medium">Budget: {proj.budget}</span>
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
