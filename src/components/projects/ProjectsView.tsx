import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Project, ProjectStatus } from '../../types';
import { 
  FolderKanban, Plus, Filter, Search, Calendar, DollarSign, 
  Trash2, Edit3, Users, CheckCircle2, Clock, AlertCircle, X, Check
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const { 
    projects, currentUser, currentRole, permissions, createProject, 
    updateProject, deleteProject, users, searchQuery 
  } = useWorkspace();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUser.id]);
  const [tagsInput, setTagsInput] = useState('');

  // Filter projects by role
  const visibleProjects = projects.filter((p) => {
    // Role filter
    if (currentRole === 'employee' && !p.member_ids.includes(currentUser.id)) {
      return false;
    }
    // Status filter
    if (selectedStatus !== 'all' && p.status !== selectedStatus) {
      return false;
    }
    // Search query
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = createProject({
      title,
      description,
      status: 'in_progress',
      start_date: new Date().toISOString().substring(0, 10),
      due_date: dueDate,
      budget,
      member_ids: selectedMembers,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    });
    if (success) {
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
    }
  };

  const handleProgressChange = (id: string, newProgress: number) => {
    updateProject(id, { 
      progress: newProgress,
      status: newProgress === 100 ? 'completed' : 'in_progress'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {currentRole === 'admin' ? 'Organization Projects' : 'My Assigned Projects'}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {visibleProjects.length} Projects
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {currentRole === 'admin' 
              ? 'Full executive control to create, prioritize, and allocate company roadmap initiatives.' 
              : 'Track progress and collaborate on your active assignments.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>

          {permissions.projects.create && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleProjects.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
            <FolderKanban className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Projects Found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          visibleProjects.map((project) => (
            <div
              key={project.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                    project.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : project.status === 'in_progress'
                      ? 'bg-blue-500/20 text-blue-300'
                      : project.status === 'review'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {project.status.replace('_', ' ')}
                  </span>

                  {permissions.projects.delete && (
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Project (Admin)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">
                  {project.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {project.description}
                </p>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 text-[11px]">Completion</span>
                    <span className="font-semibold text-blue-400">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  {/* Progress slider for Employee/Admin */}
                  {permissions.projects.updateProgress && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Update %:</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={project.progress}
                        onChange={(e) => handleProgressChange(project.id, Number(e.target.value))}
                        className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px]">{project.due_date}</span>
                </div>
                {project.budget && (
                  <div className="flex items-center gap-1 text-slate-300 font-semibold text-[11px]">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{project.budget}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create New Project</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Workflow Optimization Platform"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description & Scope</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize key milestones and target outcomes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Allocated Budget</label>
                  <input
                    type="text"
                    placeholder="e.g. $25,000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tags (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Infrastructure, Security, Frontend"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
