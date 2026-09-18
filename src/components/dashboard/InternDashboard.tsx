import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  CheckSquare, BookOpen, CheckCircle2, Clock, 
  Download, BookMarked, Play
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';

export const InternDashboard: React.FC = () => {
  const { 
    currentUser, tasks, documents, setActiveTab, updateTaskStatus, incrementDocDownload 
  } = useWorkspace();

  const myTasks = tasks.filter(
    (t) =>
      t.assigned_to === currentUser.id ||
      (t as any).assignedTo === currentUser.id ||
      t.assignee?.id === currentUser.id
  );
  const pendingTasks = myTasks.filter((t) => t.status !== 'completed');
  const inProgressTasks = myTasks.filter((t) => t.status === 'in_progress');
  const completedTasks = myTasks.filter((t) => t.status === 'completed');
  const learningDocs = documents.filter((d) => d.visibility === 'learning' || d.category === 'Onboarding' || d.visibility === 'public');

  return (
    <div className="space-y-8">
      {/* Intern Welcome Banner */}
      <div className="ui-card p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="ui-caption font-bold text-emerald-800 uppercase tracking-wider">
                Intern Dashboard
              </span>
              <span className="text-stone-400">•</span>
              <span className="ui-mono text-stone-500 font-medium">Learning & Tasks</span>
            </div>

            <h1 className="ui-h1 text-stone-900 font-heading">
              Welcome to Workspace OS, {currentUser.name}
            </h1>
            <p className="ui-body text-stone-600 mt-1.5 max-w-2xl leading-relaxed font-normal">
              Track your assigned tasks, review learning materials, and collaborate with your mentors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('documents')}
              className="ui-btn ui-btn-primary"
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
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
        <div className="ui-card p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8E3DA]">
            <div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight flex items-center gap-2 font-heading">
                <CheckSquare className="w-4 h-4 text-emerald-700" />
                <span>Assigned Learning Tasks</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5 font-normal">Execution & status updates</p>
            </div>
            <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full border border-[#E8E3DA] font-semibold">
              Sandbox Controlled
            </span>
          </div>

          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                No learning tasks assigned.
              </div>
            ) : (
              myTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA] hover:border-[#D5CFC3] transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono uppercase ${
                          task.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : task.status === 'in_progress'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-stone-500 font-mono">Due: {task.due_date}</span>
                      </div>
                      <p className={`text-xs sm:text-sm font-semibold text-stone-900 ${
                        task.status === 'completed' ? 'line-through text-stone-400' : ''
                      }`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed font-normal">{task.description}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      {task.status === 'todo' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-[#E8E3DA] text-xs font-semibold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 text-emerald-700" />
                          <span>Start</span>
                        </button>
                      )}
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="px-3 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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
        <div className="ui-card p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8E3DA]">
            <div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight flex items-center gap-2 font-heading">
                <BookOpen className="w-4 h-4 text-stone-700" />
                <span>Knowledge & Onboarding Guides</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5 font-normal">Reference technical documentation</p>
            </div>
            <span className="text-xs text-stone-500 font-medium">{learningDocs.length} guides</span>
          </div>

          <div className="space-y-3">
            {learningDocs.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                No learning guides available.
              </div>
            ) : (
              learningDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA] hover:border-amber-400/60 flex items-center justify-between gap-3 transition-all group shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-900 group-hover:text-amber-800 transition-colors truncate">
                      {doc.title}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5 font-medium">
                      {doc.category} • {doc.file_size} • {doc.file_type.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => incrementDocDownload(doc.id)}
                    className="p-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-900 border border-[#E8E3DA] transition-all cursor-pointer shadow-xs"
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
