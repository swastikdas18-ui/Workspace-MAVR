import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  FolderKanban, CheckSquare, Users, CheckCircle2, DollarSign, 
  Layers, FileText, Activity, ArrowUpRight, Plus, ShieldCheck, Clock
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    projects, tasks, users, crmRecords, teams, documents, systemLogs, 
    setActiveTab, currentWorkspace 
  } = useWorkspace();

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalPipelineValue = crmRecords.reduce((acc, curr) => acc + curr.deal_value, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-900/40 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Admin Executive Suite
              </span>
              <span className="text-xs text-slate-400">Workspace ID: {currentWorkspace.slug}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Executive Organization Overview
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Full control across Projects, Tasks, Teams, CRM Pipeline, Financials, and System Audits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('projects')}
              className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
            <button
              onClick={() => setActiveTab('crm')}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5 text-purple-400" />
              <span>CRM Pipeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Specified Admin Widgets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Projects */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Projects</span>
            <FolderKanban className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{projects.length}</p>
          <div className="flex items-center gap-1 text-[11px] text-blue-400 mt-1">
            <span>{projects.filter(p => p.status === 'in_progress').length} In Progress</span>
          </div>
        </div>

        {/* 2. Total Tasks */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{tasks.length}</p>
          <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-1">
            <span>{tasks.filter(t => t.priority === 'urgent').length} Urgent</span>
          </div>
        </div>

        {/* 3. Total Employees */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Employees</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{users.length}</p>
          <div className="flex items-center gap-1 text-[11px] text-cyan-400 mt-1">
            <span>{teams.length} Active Teams</span>
          </div>
        </div>

        {/* 4. Completed Tasks */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Completed Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{completedTasks}</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
            <span>{Math.round((completedTasks / (tasks.length || 1)) * 100)}% Completion Rate</span>
          </div>
        </div>

        {/* 5. CRM Pipeline Value */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>CRM Pipeline</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">${totalPipelineValue.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-[11px] text-purple-400 mt-1">
            <span>{crmRecords.length} Active Accounts</span>
          </div>
        </div>

        {/* 6. Active Teams */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Teams</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{teams.length}</p>
          <div className="flex items-center gap-1 text-[11px] text-indigo-400 mt-1">
            <span>{teams.length > 0 ? `${teams.length} Department Teams` : 'No teams created'}</span>
          </div>
        </div>

        {/* 7. Recent Documents */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Recent Documents</span>
            <FileText className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{documents.length}</p>
          <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-1">
            <span>{documents.reduce((a, b) => a + b.download_count, 0)} Total Downloads</span>
          </div>
        </div>

        {/* 8. Workspace Security & Activity */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>RBAC Security</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">Enforced</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
            <span>Zero-Trust Active</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Project Status & Live Workspace Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Health */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-blue-400" />
              <span>Active Organization Projects</span>
            </h3>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No active projects found. Create a project to start tracking initiatives.
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-slate-200">{project.title}</span>
                    <span className="text-[11px] font-mono text-blue-400">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Due: {project.due_date}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 capitalize text-slate-300">
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workspace Activity Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Workspace Activity</span>
            </h3>
            <button
              onClick={() => setActiveTab('admin_tools')}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Audit Logs
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80">
            {systemLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No workspace activity recorded yet.
              </div>
            ) : (
              systemLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-300">{log.user_name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {log.timestamp.includes(' ') ? log.timestamp.split(' ')[1] : log.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-200 text-[11px] leading-snug">{log.action}</p>
                  <span className={`inline-block mt-1.5 text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                    log.status === 'success' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : log.status === 'denied' 
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {log.module} • {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
