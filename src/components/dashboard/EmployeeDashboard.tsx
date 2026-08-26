import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  FolderKanban, CheckSquare, Users, DollarSign, 
  Clock, CheckCircle2, ArrowRight, Plus, Sparkles,
  Calendar, Layers, FileText
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { motion } from 'motion/react';

export const EmployeeDashboard: React.FC = () => {
  const { 
    currentUser, projects, tasks, crmRecords, teams, setActiveTab, updateTaskStatus 
  } = useWorkspace();

  // Filter only assigned projects
  const assignedProjects = projects.filter((p) => p.member_ids.includes(currentUser.id));
  
  // Filter assigned tasks
  const myTasks = tasks.filter(
    (t) =>
      t.assigned_to === currentUser.id ||
      (t as any).assignedTo === currentUser.id ||
      t.assignee?.id === currentUser.id
  );
  const myPendingTasks = myTasks.filter((t) => t.status !== 'completed');
  const myCompletedTasks = myTasks.filter((t) => t.status === 'completed');
  
  // Filter assigned CRM records
  const myCrmRecords = crmRecords.filter((c) => c.owner_id === currentUser.id);

  return (
    <div className="space-y-8">
      {/* Top Greeting & Action Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#111827] via-[#0F172A] to-[#172554] border border-white/[0.08] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Employee Productivity Hub
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">Assigned Deliverables</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Good day, {currentUser.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              You have <span className="text-white font-semibold">{myPendingTasks.length} pending deliverables</span> across <span className="text-white font-semibold">{assignedProjects.length} active initiatives</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Open My Task Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Assigned Projects"
          value={assignedProjects.length}
          icon={FolderKanban}
          color="blue"
          trend={{ value: `${assignedProjects.filter(p => p.status === 'in_progress').length} active`, direction: 'neutral', label: 'in delivery' }}
          sparklineData={[30, 45, 60, 70, 75, 85, 90]}
          onClick={() => setActiveTab('projects')}
        />

        <MetricCard
          label="Pending Tasks"
          value={myPendingTasks.length}
          icon={CheckSquare}
          color="amber"
          trend={{ value: `${myTasks.filter(t => t.priority === 'urgent' || t.priority === 'critical').length} urgent`, direction: 'down', label: 'action required' }}
          sparklineData={[50, 45, 40, 30, 25, 20, 15]}
          onClick={() => setActiveTab('tasks')}
        />

        <MetricCard
          label="Tasks Completed"
          value={myCompletedTasks.length}
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: `${Math.round((myCompletedTasks.length / (myTasks.length || 1)) * 100)}%`, direction: 'up', label: 'velocity' }}
          sparklineData={[10, 20, 35, 50, 65, 80, 100]}
          onClick={() => setActiveTab('tasks')}
        />

        <MetricCard
          label="Assigned CRM Deals"
          value={myCrmRecords.length}
          icon={DollarSign}
          color="purple"
          trend={{ value: `$${myCrmRecords.reduce((acc, c) => acc + c.deal_value, 0).toLocaleString()}`, direction: 'up', label: 'deal volume' }}
          sparklineData={[20, 30, 40, 55, 65, 75, 90]}
          onClick={() => setActiveTab('crm')}
        />
      </div>

      {/* Main Focus Area: Tasks & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent & Active Tasks */}
        <div className="lg:col-span-2 bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-400" />
                <span>My Active Work Items</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Priority task execution queue</p>
            </div>
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                You have no assigned tasks. Enjoy your clean queue!
              </div>
            ) : (
              myTasks.slice(0, 6).map((task) => {
                const isUrgent = task.priority === 'urgent' || task.priority === 'critical';
                const isHigh = task.priority === 'high';
                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.06] hover:border-purple-500/30 flex items-center justify-between gap-4 transition-all group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                          isUrgent
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : isHigh
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">Due {task.due_date}</span>
                      </div>
                      <p className={`text-xs sm:text-sm font-semibold text-white group-hover:text-purple-300 transition-colors ${
                        task.status === 'completed' ? 'line-through text-slate-500' : ''
                      }`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{task.description}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {task.status !== 'completed' ? (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/20 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Done</span>
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Completed</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Assigned Projects & Milestones */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
            <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-blue-400" />
              <span>Assigned Initiatives</span>
            </h3>
            <span className="text-xs text-slate-400">{assignedProjects.length} projects</span>
          </div>

          <div className="space-y-3.5 flex-1">
            {assignedProjects.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No assigned projects.
              </div>
            ) : (
              assignedProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => setActiveTab('projects')}
                  className="p-3.5 rounded-xl bg-[#0F172A] border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                      {proj.title}
                    </p>
                    <span className="text-xs font-mono font-bold text-blue-400">{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Deadline: {proj.due_date}</span>
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
