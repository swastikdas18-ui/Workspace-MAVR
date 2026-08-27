import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Project, ProjectStatus } from '../../types';
import { 
  FolderKanban, Plus, LayoutGrid, List, Calendar, DollarSign, 
  Trash2, Users, CheckCircle2, Clock, X, ArrowUpRight,
  TrendingUp, BarChart2, Tag, Layers, Check, Shield
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';
import { UserAvatar } from '../common/UserAvatar';
import { motion, AnimatePresence } from 'motion/react';

type ViewMode = 'board' | 'list' | 'timeline';

export const ProjectsView: React.FC = () => {
  const { 
    projects, currentUser, currentRole, permissions, createProject, 
    updateProject, deleteProject, users, teams, searchQuery 
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUser.id]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');

  // Filter projects
  const visibleProjects = projects.filter((p) => {
    if (currentRole === 'employee') {
      const isDirectMember = p.member_ids?.includes(currentUser.id);
      const isTeamMember = p.team_ids?.some((tId) => currentUser.team_id === tId);
      if (!isDirectMember && !isTeamMember && p.created_by !== currentUser.id) {
        return false;
      }
    }
    if (selectedStatus !== 'all' && p.status !== selectedStatus) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      const matchTag = p.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTag) return false;
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
      due_date: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
      budget: budget ? (budget.startsWith('$') ? budget : `$${budget}`) : '$15,000',
      member_ids: selectedMembers,
      team_ids: selectedTeams,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    });
    if (success) {
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setBudget('');
      setSelectedTeams([]);
      setTagsInput('');
    }
  };

  const handleProgressChange = (id: string, newProgress: number) => {
    updateProject(id, { 
      progress: newProgress,
      status: newProgress === 100 ? 'completed' : 'in_progress'
    });
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'in_progress':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
      case 'review':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const statuses: { id: ProjectStatus; label: string }[] = [
    { id: 'planning', label: 'Planning' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'review', label: 'Review' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header with Linear & Vercel styling */}
      <PageHeader
        title={currentRole === 'admin' ? 'Strategic Initiatives & Team Projects' : 'Assigned Projects & Team Roadmaps'}
        description={
          currentRole === 'admin'
            ? 'Executive roadmap, milestone tracking, and cross-functional project allocation across teams and individuals.'
            : 'Track milestone delivery, update progress, and collaborate with team members.'
        }
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-white/[0.08]">
            {visibleProjects.length} Initiatives
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-[#111827] border border-white/[0.08] rounded-xl text-xs">
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-[#7C3AED] text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Board</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#7C3AED] text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-[#7C3AED] text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Timeline</span>
              </button>
            </div>

            {/* Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#111827] border border-white/[0.08] text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>

            {/* Create Button */}
            {permissions.projects.create && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Initiative</span>
              </button>
            )}
          </div>
        }
      />

      {/* Main View Container */}
      {visibleProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No Projects Yet"
          description="Create your first strategic initiative and begin tracking milestones across the organization."
          actionLabel={permissions.projects.create ? 'Create Project' : undefined}
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : viewMode === 'board' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {statuses.map((status) => {
            const columnProjects = visibleProjects.filter((p) => p.status === status.id);
            return (
              <div key={status.id} className="flex flex-col bg-[#0F172A]/60 border border-white/[0.06] rounded-2xl p-3.5 min-h-[500px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white tracking-tight">{status.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {columnProjects.length}
                    </span>
                  </div>
                </div>

                {/* Project Cards in Column */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {columnProjects.map((project) => {
                    const projectMembers = users.filter((u) => project.member_ids?.includes(u.id));
                    const projectTeams = teams.filter((t) => project.team_ids?.includes(t.id));

                    return (
                      <motion.div
                        key={project.id}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.15 }}
                        className="bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 rounded-xl p-4 shadow-lg transition-all group relative"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border ${getStatusBadge(project.status)}`}>
                            {project.status.replace('_', ' ')}
                          </span>

                          {permissions.projects.delete && (
                            <button
                              onClick={() => deleteProject(project.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors mb-1">
                          {project.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                          {project.description}
                        </p>

                        {/* Assigned Teams Badges */}
                        {projectTeams.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {projectTeams.map((t) => (
                              <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-medium">
                                <Users className="w-2.5 h-2.5" />
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Progress Bar & Slider */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500">Progress</span>
                            <span className="font-mono font-bold text-purple-400">{project.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] h-full rounded-full transition-all duration-300"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          {permissions.projects.updateProgress && (
                            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={project.progress}
                                onChange={(e) => handleProgressChange(project.id, Number(e.target.value))}
                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                              />
                            </div>
                          )}
                        </div>

                        {/* Member Avatars & Due Date */}
                        <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {projectMembers.slice(0, 3).map((m) => (
                              <UserAvatar key={m.id} name={m.name} avatar={m.avatar} size="sm" />
                            ))}
                            {projectMembers.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-[10px] flex items-center justify-center text-slate-300 font-mono">
                                +{projectMembers.length - 3}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{project.due_date}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F172A] border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Initiative</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Progress</th>
                  <th className="py-3.5 px-4">Assigned Teams</th>
                  <th className="py-3.5 px-4">Members</th>
                  <th className="py-3.5 px-4">Target Date</th>
                  <th className="py-3.5 px-4">Budget</th>
                  {permissions.projects.delete && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {visibleProjects.map((project) => {
                  const projectMembers = users.filter((u) => project.member_ids?.includes(u.id));
                  const projectTeams = teams.filter((t) => project.team_ids?.includes(t.id));

                  return (
                    <tr key={project.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {project.title}
                        </p>
                        <p className="text-slate-400 truncate text-[11px] mt-0.5">{project.description}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border ${getStatusBadge(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-purple-500 h-full rounded-full"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-purple-400 text-[11px] font-bold">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {projectTeams.length > 0 ? (
                            projectTeams.map((t) => (
                              <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]">
                                {t.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {projectMembers.map((m) => (
                            <UserAvatar key={m.id} name={m.name} avatar={m.avatar} size="sm" />
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{project.due_date}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">{project.budget || '—'}</td>
                      {permissions.projects.delete && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => deleteProject(project.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TIMELINE / GANTT VIEW */
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Roadmap Timeline & Deadlines</h3>
            <span className="text-xs text-slate-400 font-mono">Q1–Q4 Horizon</span>
          </div>

          <div className="space-y-4">
            {visibleProjects.map((project, index) => {
              const startOffset = (index * 15) % 50;
              const durationWidth = Math.max(30, project.progress);
              return (
                <div key={project.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{project.title}</span>
                      {project.team_ids && project.team_ids.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">
                          {project.team_ids.length} Team{project.team_ids.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                      <span>{project.start_date}</span>
                      <span>→</span>
                      <span className="text-purple-400">{project.due_date}</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#0F172A] h-7 rounded-xl p-1 relative border border-white/[0.04]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${durationWidth}%` }}
                      style={{ marginLeft: `${startOffset}%` }}
                      className="h-full bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#A855F7] rounded-lg flex items-center px-2 text-[10px] font-semibold text-white shadow-md"
                    >
                      <span className="truncate">{project.progress}% Complete</span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4 max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-base font-semibold text-white">Create Strategic Initiative</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initiative Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Next-Gen Enterprise AI Orchestrator"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Description & Key Milestones</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Define core deliverables, technical scope, and expected outcome..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
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
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Allocated Budget</label>
                    <input
                      type="text"
                      placeholder="e.g. $45,000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Teams Assignment */}
                {teams.length > 0 && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Assign To Teams</label>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-[#111827] rounded-xl border border-white/[0.06]">
                      {teams.map((team) => {
                        const isSelected = selectedTeams.includes(team.id);
                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => toggleTeamSelection(team.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white font-medium shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            <span>{team.name}</span>
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Team Members Assignment */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Assign Individual Members</label>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-[#111827] rounded-xl border border-white/[0.06]">
                    {users.map((user) => {
                      const isSelected = selectedMembers.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleMemberSelection(user.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#7C3AED] text-white font-medium'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
                          <span>{user.name}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tags (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Infrastructure, Security, AI, Frontend"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 cursor-pointer"
                  >
                    Launch Initiative
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

