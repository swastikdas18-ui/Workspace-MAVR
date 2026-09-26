import React, { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Project, ProjectStatus, Department } from '../../types';
import { api } from '../../lib/api';
import { FolderKanban } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectWorkflowModals } from './ProjectWorkflowModals';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ProjectBoardView } from './ProjectBoardView';
import { ProjectListView, ProjectTimelineView } from './ProjectTableAndTimeline';
import { ProjectsViewHeader } from './ProjectsViewHeader';

const STATUSES: { id: ProjectStatus; label: string; desc: string }[] = [
  { id: 'planning', label: 'Planning', desc: 'Scope definition & team allocation' },
  { id: 'in_progress', label: 'In Progress', desc: 'Active execution & milestone updates' },
  { id: 'review', label: 'Review', desc: 'Deliverables awaiting Lead/Admin approval' },
  { id: 'completed', label: 'Completed', desc: 'Verified and finished initiatives' },
];

const getStatusBadge = (status: ProjectStatus | string) => {
  switch (status) {
    case 'completed': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'in_progress': return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'review': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'planning':
    default: return 'bg-slate-800/80 text-slate-300 border-slate-700/60';
  }
};

interface ProjectsViewProps {
  routeProjectId?: string | null;
  onRouteChange?: (projectId: string | null) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ routeProjectId, onRouteChange }) => {
  const {
    projects, currentUser, currentRole, permissions, createProject,
    deleteProject, startProject, updateProjectProgress,
    submitProjectReview, approveProjectReview, requestProjectChanges,
    users, searchQuery, addToast, tasks
  } = useWorkspace();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'timeline'>('board');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProjectModal, setSelectedProjectModal] = useState<Project | null>(null);

  const [progressModalProject, setProgressModalProject] = useState<Project | null>(null);
  const [progressValue, setProgressValue] = useState<number>(0);
  const [progressNote, setProgressNote] = useState<string>('');
  const [changesModalProject, setChangesModalProject] = useState<Project | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [submitReviewModalProject, setSubmitReviewModalProject] = useState<Project | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [budget, setBudget] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    api.getDepartments().then((res) => {
      if (res?.departments) setDepartments(res.departments);
    }).catch((err) => console.warn('[ProjectsView] Error loading departments:', err));
  }, []);

  useEffect(() => {
    setSelectedProjectModal(routeProjectId ? projects.find((p) => p.id === routeProjectId) || null : null);
  }, [routeProjectId, projects]);

  const handleSelectProject = (project: Project | null) => {
    setSelectedProjectModal(project);
    if (onRouteChange) onRouteChange(project ? project.id : null);
  };

  const isTeamLeadForProject = (project: Project) => {
    if (currentRole === 'admin') return true;
    const projDeptId = project.department_id || project.departmentId;
    if (!projDeptId) return false;
    return departments
      .filter((d: any) => d.headId === currentUser?.id || d.head_id === currentUser?.id)
      .some((d) => d.id === projDeptId);
  };

  const isAssignedToProject = (project: Project) => {
    if (currentRole === 'admin' || project.created_by === currentUser?.id) return true;
    if (project.member_ids?.includes(currentUser?.id)) return true;
    const projDeptId = project.department_id || project.departmentId;
    return Boolean(projDeptId && (currentUser?.department_id === projDeptId || currentUser?.departmentId === projDeptId));
  };

  const visibleProjects = useMemo(() => {
    return projects.filter((project) => {
      if (currentRole === 'intern' && !project.member_ids?.includes(currentUser?.id)) return false;
      if (selectedStatus !== 'all' && project.status !== selectedStatus) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return project.title.toLowerCase().includes(q) || project.description.toLowerCase().includes(q) || project.tags?.some((t) => t.toLowerCase().includes(q));
    });
  }, [projects, currentRole, currentUser?.id, selectedStatus, searchQuery]);

  const projectsByStatus = useMemo(() => {
    const acc: Record<string, Project[]> = { planning: [], in_progress: [], review: [], completed: [] };
    visibleProjects.forEach((p) => { if (acc[p.status]) acc[p.status].push(p); });
    return acc;
  }, [visibleProjects]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const success = await createProject({
      title: title.trim(),
      description: description.trim(),
      status: 'planning',
      start_date: new Date().toISOString(),
      due_date: dueDate,
      budget: budget.trim() || undefined,
      member_ids: selectedMembers,
      department_id: selectedDepartmentId || undefined,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    });
    if (success) {
      setIsCreateModalOpen(false);
      setTitle(''); setDescription(''); setSelectedMembers([]); setSelectedDepartmentId(''); setBudget(''); setTagsInput('');
    }
  };

  const handleOpenProgressModal = (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProgressModalProject(project); setProgressValue(project.progress || 0); setProgressNote('');
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
    setChangesModalProject(project); setReviewFeedback('');
  };

  const handleSaveRequestChanges = async () => {
    if (!changesModalProject || !reviewFeedback.trim()) {
      addToast({ type: 'error', title: 'Feedback Required', message: 'Please provide feedback explaining requested changes.' });
      return;
    }
    await requestProjectChanges(changesModalProject.id, reviewFeedback);
    setChangesModalProject(null);
  };

  const toggleMemberSelection = (userOrId: any) => {
    const id = typeof userOrId === 'object' && userOrId !== null ? userOrId.userId || userOrId.id : userOrId;
    if (!id || typeof id !== 'string') return;
    setSelectedMembers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      <ProjectsViewHeader
        currentRole={currentRole}
        visibleProjectsCount={visibleProjects.length}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        permissions={permissions}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {visibleProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No Projects Yet"
          description="Create your first strategic initiative and begin tracking milestones across the organization."
          actionLabel={permissions.projects.create ? 'Create Project' : undefined}
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : viewMode === 'board' ? (
        <ProjectBoardView
          statusColumns={STATUSES}
          projectsByStatus={projectsByStatus}
          users={users}
          departments={departments}
          isTeamLeadForProject={isTeamLeadForProject}
          isAssignedToProject={isAssignedToProject}
          currentRole={currentRole}
          permissions={permissions}
          getStatusBadge={getStatusBadge}
          onSelectProject={handleSelectProject}
          onDeleteProject={deleteProject}
          onStartWork={(id, e) => { if (e) e.stopPropagation(); startProject(id); }}
          onOpenProgressModal={handleOpenProgressModal}
          onOpenSubmitReviewModal={handleOpenSubmitReviewModal}
          onApprove={(id, e) => { if (e) e.stopPropagation(); approveProjectReview(id); }}
          onOpenChangesModal={handleOpenChangesModal}
        />
      ) : viewMode === 'list' ? (
        <ProjectListView
          visibleProjects={visibleProjects}
          users={users}
          departments={departments}
          isTeamLeadForProject={isTeamLeadForProject}
          isAssignedToProject={isAssignedToProject}
          currentRole={currentRole}
          permissions={permissions}
          getStatusBadge={getStatusBadge}
          onSelectProject={handleSelectProject}
          onDeleteProject={deleteProject}
          onStartWork={(id, e) => { if (e) e.stopPropagation(); startProject(id); }}
          onOpenProgressModal={handleOpenProgressModal}
          onApprove={(id, e) => { if (e) e.stopPropagation(); approveProjectReview(id); }}
        />
      ) : (
        <ProjectTimelineView visibleProjects={visibleProjects} departments={departments} />
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        dueDate={dueDate}
        setDueDate={setDueDate}
        budget={budget}
        setBudget={setBudget}
        departments={departments}
        selectedDepartmentId={selectedDepartmentId}
        setSelectedDepartmentId={setSelectedDepartmentId}
        users={users}
        selectedMembers={selectedMembers}
        toggleMemberSelection={toggleMemberSelection}
        tagsInput={tagsInput}
        setTagsInput={setTagsInput}
      />

      <ProjectWorkflowModals
        progressModalProject={progressModalProject}
        setProgressModalProject={setProgressModalProject}
        progressValue={progressValue}
        setProgressValue={setProgressValue}
        progressNote={progressNote}
        setProgressNote={setProgressNote}
        onSaveProgress={handleSaveProgress}
        submitReviewModalProject={submitReviewModalProject}
        setSubmitReviewModalProject={setSubmitReviewModalProject}
        onConfirmSubmitReview={handleConfirmSubmitReview}
        changesModalProject={changesModalProject}
        setChangesModalProject={setChangesModalProject}
        reviewFeedback={reviewFeedback}
        setReviewFeedback={setReviewFeedback}
        onSaveRequestChanges={handleSaveRequestChanges}
      />

      <ProjectDetailModal
        selectedProjectModal={selectedProjectModal}
        onClose={() => handleSelectProject(null)}
        tasks={tasks}
        users={users}
        departments={departments}
        getStatusBadge={getStatusBadge}
        isTeamLeadForProject={isTeamLeadForProject}
        isAssignedToProject={isAssignedToProject}
        currentRole={currentRole}
        onStartWork={(id) => startProject(id)}
        onOpenProgressModal={handleOpenProgressModal}
        onOpenSubmitReviewModal={handleOpenSubmitReviewModal}
        onApprove={(id) => approveProjectReview(id)}
        onOpenChangesModal={handleOpenChangesModal}
      />
    </div>
  );
};
