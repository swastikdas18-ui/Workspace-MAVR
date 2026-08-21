import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  FolderKanban, CheckSquare, Users, DollarSign, ArrowUpRight, 
  Clock, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { 
    currentUser, projects, tasks, crmRecords, teams, setActiveTab, updateTaskStatus 
  } = useWorkspace();

  // Filter only assigned projects
  const assignedProjects = projects.filter((p) => p.member_ids.includes(currentUser.id));
  
  // Filter assigned tasks
  const myTasks = tasks.filter((t) => t.assigned_to === currentUser.id);
  const myPendingTasks = myTasks.filter((t) => t.status !== 'completed');
  
  // Filter assigned CRM records
  const myCrmRecords = crmRecords.filter((c) => c.owner_id === currentUser.id);

  return (
    <div className="space-y-6">
      {/* Employee Greeting Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-900/40 rounded-2xl p-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Employee Focus Portal
              </span>
              <span className="text-xs text-slate-400">Assigned Deliverables Only</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Here is your daily operational summary for assigned tasks, projects in progress, and client follow-ups.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('tasks')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <span>Open Task Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Specified Employee Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Projects in Progress */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Assigned Projects</span>
            <FolderKanban className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{assignedProjects.length}</p>
          <p className="text-[11px] text-blue-400 mt-1">Active contributor</p>
        </div>

        {/* 2. My Tasks Due Soon */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>My Tasks Pending</span>
            <CheckSquare className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{myPendingTasks.length}</p>
          <p className="text-[11px] text-amber-400 mt-1">
            {myTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length} Urgent priority
          </p>
        </div>

        {/* 3. Team Activity */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Team Collaboration</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{teams.length}</p>
          <p className="text-[11px] text-emerald-400 mt-1">
            {teams.length > 0 ? `${teams.length} Active Teams` : 'No teams created'}
          </p>
        </div>

        {/* 4. CRM Activities */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Assigned CRM Deals</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{myCrmRecords.length}</p>
          <p className="text-[11px] text-purple-400 mt-1">
            ${myCrmRecords.reduce((acc, curr) => acc + curr.deal_value, 0).toLocaleString()} pipeline
          </p>
        </div>
      </div>

      {/* Main Content Grid: Assigned Tasks & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent & Active Tasks */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              <span>My Assigned Tasks</span>
            </h3>
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Go to Kanban
            </button>
          </div>

          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No assigned tasks right now.</p>
            ) : (
              myTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                        task.priority === 'urgent'
                          ? 'bg-rose-500/20 text-rose-300'
                          : task.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] text-slate-400">Due: {task.due_date}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200">{task.title}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{task.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {task.status !== 'completed' ? (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-medium transition-all flex items-center gap-1"
                        title="Mark Complete"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Done</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assigned Projects & Direct Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-indigo-400" />
            <span>Assigned Projects</span>
          </h3>

          <div className="space-y-4 flex-1">
            {assignedProjects.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No assigned projects right now.</p>
            ) : (
              assignedProjects.map((proj) => (
                <div key={proj.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-xs font-semibold text-slate-200">{proj.title}</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Progress: {proj.progress}%</span>
                    <span className="capitalize">{proj.status.replace('_', ' ')}</span>
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
