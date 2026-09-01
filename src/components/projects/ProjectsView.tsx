import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Project, ProjectStatus, Department } from '../../types';
import { api } from '../../lib/api';
import {
  FolderKanban, Plus, LayoutGrid, List, Calendar, DollarSign,
  Trash2, Users, CheckCircle2, Clock, X, ArrowUpRight,
  TrendingUp, BarChart2, Tag, Layers, Check, Shield, Play,
  Send, RotateCcw, CheckCircle, MessageSquare, AlertCircle, Sparkles, Building2, CheckSquare
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';
import { UserAvatar } from '../common/UserAvatar';
import { ProjectActivityTimeline } from './ProjectActivityTimeline';
import { motion, AnimatePresence } from 'motion/react';

type ViewMode = 'board' | 'list' | 'timeline';

interface ProjectsViewProps {
  routeProjectId?: string | null;
  onRouteChange?: (projectId: string | null) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ routeProjectId, onRouteChange }) => {
  const {
    projects, currentUser, currentRole, permissions, createProject,
    updateProject, deleteProject, startProject, updateProjectProgress,
    submitProjectReview, approveProjectReview, requestProjectChanges,
    users, teams, searchQuery, addToast, tasks
  } = useWorkspace();

  const [departments, setDepartments] = useState<Department[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProjectModal, setSelectedProjectModal] = useState<Project | null>(null);
  const [projectModalTab, setProjectModalTab] = useState<'overview' | 'tasks' | 'timeline' | 'team'>('overview');

  // Workflow Modal States
  const [progressModalProject, setProgressModalProject] = useState<Project | null>(null);
  const [progressValue, setProgressValue] = useState<number>(0);
  const [progressNote, setProgressNote] = useState<string>('');

  const [changesModalProject, setChangesModalProject] = useState<Project | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');

  const [submitReviewModalProject, setSubmitReviewModalProject] = useState<Project | null>(null);

  // Fetch People OS departments to populate project team/department options
  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await api.getDepartments();
        if (res?.departments) {
          setDepartments(res.departments);
        }
      } catch (err) {
        console.warn('[ProjectsView] Error loading departments:', err);
      }
    }
    loadDepts();
  }, []);

  // Sync routeProjectId with active modal
  useEffect(() => {
    if (routeProjectId) {
      const found = projects.find((p) => p.id === routeProjectId);
      if (found) {
        setSelectedProjectModal(found);
      }
    } else {
      setSelectedProjectModal(null);
    }
  }, [routeProjectId, projects]);

  const handleSelectProject = (project: Project | null) => {
    setSelectedProjectModal(project);
    if (onRouteChange) {
      onRouteChange(project ? project.id : null);
    }
  };

  // Helper to determine if current user is lead of project's teams
  const isTeamLeadForProject = (project: Project) => {
    if (currentRole === 'admin') return true;
    if (!project.team_ids || project.team_ids.length === 0) return false;
    const userLedTeams = teams.filter((t) => t.lead_id === currentUser.id).map((t) => t.id);
    return project.team_ids.some((tId) => userLedTeams.includes(tId));
  };

  // Helper to determine if user is assigned member/team of project
  const isAssignedToProject = (project: Project) => {
    if (currentRole === 'admin') return true;
    if (project.created_by === currentUser.id) return true;
    if (project.member_ids?.includes(currentUser.id)) return true;
    const userTeams = teams.filter((t) => t.member_count > 0 && (t.lead_id === currentUser.id || t.id === currentUser.team_id)).map((t) => t.id);
    return project.team_ids?.some((tId) => userTeams.includes(tId)) || false;
  };

  // Form State for Project Creation
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUser.id]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');

  // Project visibility is resolved by the server from verified workspace, team,
  // and project memberships. Apply only presentation filters here.
  const visibleProjects = projects.filter((p) => {
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
      status: 'planning',
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

  const handleOpenProgressModal = (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProgressModalProject(project);
    setProgressValue(project.progress || 0);
    setProgressNote('');
  };

  const handleSaveProgress = async () => {
    if (!progressModalProject) return;
    await updateProjectProgress(progressModalProject.id, progressValue, progressNote);
    setProgressModalProject(null);
  };

  const handleOpenSubmitReviewModal = (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSubmitReviewModalProject(project);
  };

  const handleConfirmSubmitReview = async () => {
    if (!submitReviewModalProject) return;
    await submitProjectReview(submitReviewModalProject.id);
    setSubmitReviewModalProject(null);
  };

  const handleOpenChangesModal = (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setChangesModalProject(project);
    setReviewFeedback('');
  };

  const handleSaveRequestChanges = async () => {
    if (!changesModalProject || !reviewFeedback.trim()) {
      addToast({ type: 'error', title: 'Feedback Required', message: 'Please provide feedback explaining requested changes.' });
      return;
    }
    await requestProjectChanges(changesModalProject.id, reviewFeedback);
    setChangesModalProject(null);
  };

  const handleApprove = async (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await approveProjectReview(projectId);
  };

  const handleStartWork = async (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await startProject(projectId);
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
      case 'planning':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const statuses: { id: ProjectStatus; label: string; desc: string }[] = [
    { id: 'planning', label: 'Planning', desc: 'Scope definition & team allocation' },
    { id: 'in_progress', label: 'In Progress', desc: 'Active execution & milestone updates' },
    { id: 'review', label: 'Review', desc: 'Deliverables awaiting Lead/Admin approval' },
    { id: 'completed', label: 'Completed', desc: 'Verified and finished initiatives' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'board'
                    ? 'bg-[#7C3AED] text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Board</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list'
                    ? 'bg-[#7C3AED] text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'timeline'
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
        /* KANBAN BOARD VIEW WITH PHASE 1 WORKFLOW ACTIONS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {statuses.map((status) => {
            const columnProjects = visibleProjects.filter((p) => p.status === status.id);
            return (
              <div key={status.id} className="flex flex-col bg-[#0F172A]/60 border border-white/[0.06] rounded-2xl p-3.5 min-h-[520px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white tracking-tight">{status.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {columnProjects.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">{status.desc}</span>
                </div>

                {/* Project Cards in Column */}
                <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                  {columnProjects.map((project) => {
                    const projectMembers = users.filter((u) => project.member_ids?.includes(u.id));
                    const projectTeams = teams.filter((t) => project.team_ids?.includes(t.id));
                    const isLead = isTeamLeadForProject(project);
                    const isAssigned = isAssignedToProject(project);

                    return (
                      <motion.div
                        key={project.id}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.15 }}
                        className="bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 rounded-xl p-4 shadow-lg transition-all group relative flex flex-col justify-between"
                      >
                        <div>
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

                          <h4
                            onClick={() => handleSelectProject(project)}
                            className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors mb-1 cursor-pointer"
                          >
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

                          {/* Progress Bar */}
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
                          </div>

                          {/* Review feedback indicator if present */}
                          {project.review_feedback && project.status === 'in_progress' && (
                            <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                              <span className="line-clamp-2">Changes requested: "{project.review_feedback}"</span>
                            </div>
                          )}
                        </div>

                        {/* WORKFLOW ACTION BUTTONS */}
                        <div className="pt-3 mt-1 border-t border-white/[0.06] space-y-2">
                          {/* Feature 1: Start Work button in Planning */}
                          {project.status === 'planning' && (isLead || currentRole === 'admin') && (
                            <button
                              onClick={(e) => handleStartWork(project.id, e)}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Start Work</span>
                            </button>
                          )}

                          {/* Feature 2 & 3: Update Progress & Submit for Review in In Progress */}
                          {project.status === 'in_progress' && (isAssigned || isLead || currentRole === 'admin') && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                onClick={(e) => handleOpenProgressModal(project, e)}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.08] text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                <TrendingUp className="w-3 h-3 text-purple-400" />
                                <span>Progress</span>
                              </button>
                              <button
                                onClick={(e) => handleOpenSubmitReviewModal(project, e)}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                <Send className="w-3 h-3 text-amber-400" />
                                <span>Submit Review</span>
                              </button>
                            </div>
                          )}

                          {/* Feature 4: Review Workflow (Approve / Request Changes) */}
                          {project.status === 'review' && (
                            <>
                              {isLead || currentRole === 'admin' ? (
                                <div className="grid grid-cols-2 gap-1.5">
                                  <button
                                    onClick={(e) => handleApprove(project.id, e)}
                                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-sm"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenChangesModal(project, e)}
                                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Changes</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="text-center py-1 text-[11px] text-amber-300/80 bg-amber-500/10 rounded border border-amber-500/20 font-mono">
                                  Pending Lead Review
                                </div>
                              )}
                            </>
                          )}

                          {/* Card Footer: Avatars & Due Date */}
                          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {projectMembers.slice(0, 3).map((m) => (
                                <UserAvatar key={m.id} user={m} size="sm" />
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
                  <th className="py-3.5 px-4 text-right">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {visibleProjects.map((project) => {
                  const projectMembers = users.filter((u) => project.member_ids?.includes(u.id));
                  const projectTeams = teams.filter((t) => project.team_ids?.includes(t.id));
                  const isLead = isTeamLeadForProject(project);
                  const isAssigned = isAssignedToProject(project);

                  return (
                    <tr
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    >
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
                            <UserAvatar key={m.id} user={m} size="sm" />
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{project.due_date}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">{project.budget || '—'}</td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {project.status === 'planning' && (isLead || currentRole === 'admin') && (
                            <button
                              onClick={(e) => handleStartWork(project.id, e)}
                              className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/30 text-xs font-medium transition-colors"
                            >
                              Start Work
                            </button>
                          )}
                          {project.status === 'in_progress' && (isAssigned || isLead || currentRole === 'admin') && (
                            <button
                              onClick={(e) => handleOpenProgressModal(project, e)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                            >
                              Update
                            </button>
                          )}
                          {project.status === 'review' && (isLead || currentRole === 'admin') && (
                            <button
                              onClick={(e) => handleApprove(project.id, e)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {permissions.projects.delete && (
                            <button
                              onClick={() => deleteProject(project.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
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

      {/* CREATE PROJECT MODAL */}
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
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
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

                {/* Departments Assignment (People OS) */}
                {departments.length > 0 && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Assign To Department</span>
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-[#111827] rounded-xl border border-purple-500/20">
                      {departments.map((dept) => {
                        const isSelected = selectedTeams.includes(dept.id);
                        return (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => toggleTeamSelection(dept.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${isSelected
                                ? 'bg-purple-600 text-white font-medium shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                          >
                            <Building2 className="w-3 h-3 text-purple-300" />
                            <span>{dept.name}</span>
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${isSelected
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
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${isSelected
                              ? 'bg-[#7C3AED] text-white font-medium'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                          <UserAvatar user={user} size="sm" />
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

        {/* MODAL 1: UPDATE PROGRESS MODAL */}
        {progressModalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProgressModalProject(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Log Progress Update
                </h3>
                <button
                  onClick={() => setProgressModalProject(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Initiative</span>
                  <p className="font-semibold text-white text-sm">{progressModalProject.title}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-medium">Completion Percentage</label>
                    <span className="text-sm font-bold font-mono text-purple-400">{progressValue}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressValue}
                    onChange={(e) => setProgressValue(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0% (Started)</span>
                    <span>50% (Halfway)</span>
                    <span>100% (Complete)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Progress Note / Milestone Summary (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Completed API endpoint integrations and database migrations..."
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => setProgressModalProject(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProgress}
                  className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 cursor-pointer"
                >
                  Save Progress Update
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 2: SUBMIT FOR REVIEW CONFIRMATION */}
        {submitReviewModalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSubmitReviewModalProject(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" />
                  Submit Initiative for Review
                </h3>
                <button
                  onClick={() => setSubmitReviewModalProject(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you ready to submit <strong className="text-white">"{submitReviewModalProject.title}"</strong> for Lead/Admin review?
                This will transition the initiative into the <span className="text-amber-400 font-medium">Review</span> stage.
              </p>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => setSubmitReviewModalProject(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSubmitReview}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/25 cursor-pointer"
                >
                  Confirm & Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: REQUEST CHANGES MODAL */}
        {changesModalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChangesModalProject(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  Request Review Changes
                </h3>
                <button
                  onClick={() => setChangesModalProject(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-300">
                  Provide detailed feedback for <strong className="text-white">"{changesModalProject.title}"</strong>.
                  The project will be moved back to <span className="text-purple-400 font-medium">In Progress</span>.
                </p>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Feedback & Required Fixes</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Unit tests need higher coverage on payment edge cases. Please fix before resubmitting..."
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => setChangesModalProject(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRequestChanges}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/25 cursor-pointer"
                >
                  Send Feedback
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* PROJECT DETAIL DEEP-LINK DRAWER / MODAL WITH 4-TAB EXECUTION DASHBOARD */}
        {selectedProjectModal && (() => {
          const projTasks = tasks.filter((t) => t.projectId === selectedProjectModal.id);
          const overdueTasksCount = projTasks.filter(
            (t) => t.status !== 'done' && t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()
          ).length;
          const overduePct = projTasks.length > 0 ? (overdueTasksCount / projTasks.length) * 100 : 0;
          const healthStatus: 'Green' | 'Yellow' | 'Red' = overduePct < 10 ? 'Green' : overduePct <= 30 ? 'Yellow' : 'Red';
          const healthBadgeStyle = healthStatus === 'Green'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : healthStatus === 'Yellow'
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

          const creatorUser = users.find((u) => u.id === selectedProjectModal.created_by);
          const assignedDepts = departments.filter((d) => selectedProjectModal.team_ids?.includes(d.id));

          return (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#0F172A] border border-white/[0.12] rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
              >
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border ${getStatusBadge(selectedProjectModal.status)}`}>
                        {selectedProjectModal.status.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border ${healthBadgeStyle} flex items-center gap-1`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        Health: {healthStatus} ({overdueTasksCount} Overdue)
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-xs text-purple-400 font-mono">ID: {selectedProjectModal.id}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">{selectedProjectModal.title}</h2>
                  </div>

                  <button
                    onClick={() => handleSelectProject(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 4-Tab Switcher */}
                <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
                  <button
                    onClick={() => setProjectModalTab('overview')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      projectModalTab === 'overview'
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Overview</span>
                  </button>
                  <button
                    onClick={() => setProjectModalTab('tasks')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      projectModalTab === 'tasks'
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Tasks ({projTasks.length})</span>
                  </button>
                  <button
                    onClick={() => setProjectModalTab('timeline')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      projectModalTab === 'timeline'
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Timeline & Activity</span>
                  </button>
                  <button
                    onClick={() => setProjectModalTab('team')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      projectModalTab === 'team'
                        ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Team & Dept ({selectedProjectModal.member_ids?.length || 0})</span>
                  </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {projectModalTab === 'overview' && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <h4 className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Description & Strategic Objectives</h4>
                      <p className="text-slate-200 leading-relaxed bg-[#111827] p-3.5 rounded-xl border border-white/[0.04]">
                        {selectedProjectModal.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-[#111827] p-3 rounded-xl border border-white/[0.04]">
                        <span className="text-slate-500 text-[10px] uppercase font-mono">Execution Progress</span>
                        <p className="text-sm font-mono font-bold text-purple-400 mt-0.5">{selectedProjectModal.progress}%</p>
                      </div>
                      <div className="bg-[#111827] p-3 rounded-xl border border-white/[0.04]">
                        <span className="text-slate-500 text-[10px] uppercase font-mono">Start Date</span>
                        <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{selectedProjectModal.start_date}</p>
                      </div>
                      <div className="bg-[#111827] p-3 rounded-xl border border-white/[0.04]">
                        <span className="text-slate-500 text-[10px] uppercase font-mono">Due Date</span>
                        <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{selectedProjectModal.due_date}</p>
                      </div>
                      <div className="bg-[#111827] p-3 rounded-xl border border-white/[0.04]">
                        <span className="text-slate-500 text-[10px] uppercase font-mono">Budget</span>
                        <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">{selectedProjectModal.budget || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-[#111827] p-3.5 rounded-xl border border-white/[0.04] space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase font-mono">Department Ownership</span>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-purple-400" />
                          <span className="font-semibold text-slate-200">
                            {assignedDepts.map((d) => d.name).join(', ') || 'General Organization'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-[#111827] p-3.5 rounded-xl border border-white/[0.04] space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase font-mono">Project Owner / Lead</span>
                        <div className="flex items-center gap-2">
                          {creatorUser && <UserAvatar user={creatorUser} size="sm" />}
                          <span className="font-semibold text-slate-200">{creatorUser?.name || 'Administrator'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: TASKS */}
                {projectModalTab === 'tasks' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>Associated Tasks ({projTasks.length})</span>
                      <span className="text-amber-400">{overdueTasksCount} Overdue</span>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {projTasks.map((task) => {
                        const assignee = users.find((u) => u.id === task.assignedTo);
                        const isOverdue = task.status !== 'done' && task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < new Date();
                        return (
                          <div key={task.id} className="bg-[#111827] p-3 rounded-xl border border-white/[0.06] flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.2 rounded font-mono font-semibold uppercase ${
                                  task.status === 'done' || task.status === 'completed'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : task.status === 'in_progress'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-slate-800 text-slate-400 border border-white/10'
                                }`}>
                                  {task.status}
                                </span>
                                {isOverdue && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">
                                    OVERDUE
                                  </span>
                                )}
                                {task.isBlocked && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                                    BLOCKED: {task.blockedReason}
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-slate-200">{task.title}</p>
                            </div>

                            <div className="flex items-center gap-3">
                              {assignee && (
                                <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                                  <UserAvatar user={assignee} size="sm" />
                                  <span className="hidden sm:inline">{assignee.name}</span>
                                </div>
                              )}
                              <span className="text-slate-500 text-[10px] font-mono">{task.dueDate}</span>
                            </div>
                          </div>
                        );
                      })}
                      {projTasks.length === 0 && (
                        <div className="p-8 text-center bg-[#111827] rounded-xl border border-white/[0.04] text-slate-400 text-xs">
                          No tasks assigned to this project yet. Create tasks in the Tasks Engine to link execution.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: TIMELINE & ACTIVITY */}
                {projectModalTab === 'timeline' && (
                  <div className="pt-2">
                    <ProjectActivityTimeline project={selectedProjectModal} />
                  </div>
                )}

                {/* TAB 4: TEAM & DEPT */}
                {projectModalTab === 'team' && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <h4 className="text-slate-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">Assigned Departments</h4>
                      <div className="flex flex-wrap gap-2">
                        {assignedDepts.map((d) => {
                          const dHead = users.find((u) => u.id === d.headId);
                          return (
                            <div key={d.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
                              <Building2 className="w-4 h-4 text-purple-400" />
                              <span>{d.name}</span>
                              {dHead?.name && <span className="text-slate-400 text-[10px]">(Head: {dHead.name})</span>}
                            </div>
                          );
                        })}
                        {assignedDepts.length === 0 && (
                          <span className="text-slate-500 italic text-[11px]">No department assigned.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-slate-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">Assigned Contributors</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {users
                          .filter((u) => selectedProjectModal.member_ids?.includes(u.id))
                          .map((u) => (
                            <div key={u.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#111827] border border-white/[0.06] text-slate-200">
                              <UserAvatar user={u} size="md" />
                              <div>
                                <p className="font-semibold text-slate-200">{u.name}</p>
                                <p className="text-[10px] text-slate-400">{u.title || u.role}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    {selectedProjectModal.status === 'planning' && (isTeamLeadForProject(selectedProjectModal) || currentRole === 'admin') && (
                      <button
                        onClick={() => {
                          handleStartWork(selectedProjectModal.id);
                          handleSelectProject(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Work</span>
                      </button>
                    )}
                    {selectedProjectModal.status === 'in_progress' && (isAssignedToProject(selectedProjectModal) || isTeamLeadForProject(selectedProjectModal) || currentRole === 'admin') && (
                      <>
                        <button
                          onClick={() => handleOpenProgressModal(selectedProjectModal)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.08] text-xs font-medium cursor-pointer"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                          <span>Update Progress</span>
                        </button>
                        <button
                          onClick={() => handleOpenSubmitReviewModal(selectedProjectModal)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 text-amber-400" />
                          <span>Submit for Review</span>
                        </button>
                      </>
                    )}
                    {selectedProjectModal.status === 'review' && (isTeamLeadForProject(selectedProjectModal) || currentRole === 'admin') && (
                      <>
                        <button
                          onClick={() => {
                            handleApprove(selectedProjectModal.id);
                            handleSelectProject(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve & Complete</span>
                        </button>
                        <button
                          onClick={() => handleOpenChangesModal(selectedProjectModal)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Request Changes</span>
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handleSelectProject(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
