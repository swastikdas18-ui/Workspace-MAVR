import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  GraduationCap, CheckSquare, BookOpen, CheckCircle2, Clock, 
  Sparkles, Download, ArrowRight, BookMarked, ShieldCheck
} from 'lucide-react';

export const InternDashboard: React.FC = () => {
  const { 
    currentUser, tasks, documents, setActiveTab, updateTaskStatus, incrementDocDownload 
  } = useWorkspace();

  const myTasks = tasks.filter((t) => t.assigned_to === currentUser.id);
  const pendingTasks = myTasks.filter((t) => t.status !== 'completed');
  const completedTasks = myTasks.filter((t) => t.status === 'completed');
  const learningDocs = documents.filter((d) => d.visibility === 'learning' || d.category === 'Onboarding');

  return (
    <div className="space-y-6">
      {/* Intern Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-900/40 rounded-2xl p-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Internship & Learning Sandbox
              </span>
              <span className="text-xs text-slate-400">Restricted Safe Environment</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome to Workspace OS, {currentUser.name}!
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Focus on completing assigned learning tasks, mastering internal tools, and reading team technical guides.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('documents')}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Learning Docs</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Specified Intern Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Assigned Tasks */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Assigned</span>
            <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-bold text-white mt-1.5">{myTasks.length}</p>
          <span className="text-[10px] text-blue-400">Total Work</span>
        </div>

        {/* 2. Pending Tasks */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white mt-1.5">{pendingTasks.length}</p>
          <span className="text-[10px] text-amber-400">In Progress</span>
        </div>

        {/* 3. Completed Tasks */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-white mt-1.5">{completedTasks.length}</p>
          <span className="text-[10px] text-emerald-400">Great job!</span>
        </div>

        {/* 4. Assigned Learning */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Learning</span>
            <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-xl font-bold text-white mt-1.5">{learningDocs.length}</p>
          <span className="text-[10px] text-purple-400">Modules</span>
        </div>

        {/* 5. Documents */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Docs</span>
            <BookMarked className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-xl font-bold text-white mt-1.5">{documents.filter(d => d.visibility === 'public' || d.visibility === 'learning').length}</p>
          <span className="text-[10px] text-cyan-400">Available</span>
        </div>

        {/* 6. Resources & Sandbox */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Sandbox</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-white mt-1.5">Active</p>
          <span className="text-[10px] text-emerald-400">Safe Guarded</span>
        </div>
      </div>

      {/* Two Column Layout: My Learning Tasks & Onboarding Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks View with Restricted Actions (Mark In Progress / Complete) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>Assigned Learning Tasks</span>
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
              Update Only
            </span>
          </div>

          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No assigned learning tasks right now.
              </div>
            ) : (
              myTasks.map((task) => (
                <div key={task.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{task.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{task.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-slate-500 font-mono">Due: {task.due_date}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                          task.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : task.status === 'in_progress'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      {task.status === 'todo' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-medium transition-colors"
                        >
                          Start Task
                        </button>
                      )}
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-medium transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Complete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Learning Resources & Guides */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Assigned Learning Documents</span>
            </h3>
            <span className="text-[10px] text-slate-400">View & Download Only</span>
          </div>

          <div className="space-y-3">
            {learningDocs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No learning documents available right now.
              </div>
            ) : (
              learningDocs.map((doc) => (
                <div key={doc.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 truncate">{doc.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{doc.category} • {doc.file_size}</p>
                  </div>
                  <button
                    onClick={() => incrementDocDownload(doc.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
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
