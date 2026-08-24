import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  GraduationCap, CheckSquare, BookOpen, CheckCircle2, Clock, 
  Sparkles, Download, ArrowRight, BookMarked, ShieldCheck, Play
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { motion } from 'motion/react';

export const InternDashboard: React.FC = () => {
  const { 
    currentUser, tasks, documents, setActiveTab, updateTaskStatus, incrementDocDownload 
  } = useWorkspace();

  const myTasks = tasks.filter((t) => t.assigned_to === currentUser.id);
  const pendingTasks = myTasks.filter((t) => t.status !== 'completed');
  const inProgressTasks = myTasks.filter((t) => t.status === 'in_progress');
  const completedTasks = myTasks.filter((t) => t.status === 'completed');
  const learningDocs = documents.filter((d) => d.visibility === 'learning' || d.category === 'Onboarding' || d.visibility === 'public');

  return (
    <div className="space-y-8">
      {/* Intern Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#111827] via-[#0F172A] to-[#064E3B] border border-white/[0.08] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Internship & Learning Sandbox
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">Guarded Workspace Mode</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome to Workspace OS, {currentUser.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              Master the engineering and product workflows. Complete your assigned learning tasks and review onboarding guides.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('documents')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Learning Guides</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Assigned Tasks"
          value={myTasks.length}
          icon={CheckSquare}
          color="blue"
          trend={{ value: `${myTasks.length} total`, direction: 'neutral', label: 'curriculum' }}
          sparklineData={[10, 20, 30, 45, 60, 75, 80]}
          onClick={() => setActiveTab('tasks')}
        />

        <MetricCard
          label="Pending Deliverables"
          value={pendingTasks.length}
          icon={Clock}
          color="amber"
          trend={{ value: `${inProgressTasks.length} in progress`, direction: 'neutral', label: 'active focus' }}
          sparklineData={[40, 35, 30, 25, 20, 15, 10]}
          onClick={() => setActiveTab('tasks')}
        />

        <MetricCard
          label="Completed"
          value={completedTasks.length}
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: `${Math.round((completedTasks.length / (myTasks.length || 1)) * 100)}%`, direction: 'up', label: 'completion rate' }}
          sparklineData={[0, 20, 40, 60, 80, 100, 100]}
          onClick={() => setActiveTab('tasks')}
        />

        <MetricCard
          label="Knowledge Base"
          value={learningDocs.length}
          icon={BookMarked}
          color="purple"
          trend={{ value: 'Read & Download', direction: 'neutral', label: 'guides available' }}
          sparklineData={[20, 30, 40, 50, 60, 70, 80]}
          onClick={() => setActiveTab('documents')}
        />
      </div>

      {/* Two Column Layout: Learning Tasks & Onboarding Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Tasks Queue */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Assigned Learning Tasks</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Execution & status updates</p>
            </div>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-white/[0.06]">
              Sandbox Controlled
            </span>
          </div>

          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No learning tasks assigned.
              </div>
            ) : (
              myTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.06] hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono uppercase ${
                          task.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : task.status === 'in_progress'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">Due: {task.due_date}</span>
                      </div>
                      <p className={`text-xs sm:text-sm font-semibold text-white ${
                        task.status === 'completed' ? 'line-through text-slate-500' : ''
                      }`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{task.description}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      {task.status === 'todo' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/20 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Start</span>
                        </button>
                      )}
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/20 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Done</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Learning Resources & Documents */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Knowledge & Onboarding Guides</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Reference technical documentation</p>
            </div>
            <span className="text-xs text-slate-400">{learningDocs.length} guides</span>
          </div>

          <div className="space-y-3">
            {learningDocs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No learning guides available.
              </div>
            ) : (
              learningDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-[#0F172A] border border-white/[0.04] hover:border-purple-500/30 flex items-center justify-between gap-3 transition-all group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                      {doc.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {doc.category} • {doc.file_size} • {doc.file_type.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => incrementDocDownload(doc.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-[#7C3AED] text-slate-300 hover:text-white border border-white/[0.06] transition-all cursor-pointer shadow-sm"
                    title="Download Document"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
