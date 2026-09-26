import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskPriority, TaskComment } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { api } from '../../lib/api';
import { CheckSquare } from 'lucide-react';
import { TasksViewHeader } from './TasksViewHeader';
import { TaskKanbanBoard } from './TaskKanbanBoard';
import { TaskListView } from './TaskListView';
import { TasksModalsContainer } from './TasksModalsContainer';

import { useTaskLifecycle } from './useTaskLifecycle';
import { useTaskCreateForm } from './useTaskCreateForm';
import { getTaskAssignee as resolveAssignee, getPriorityBadge } from './taskHelpers';

interface TasksViewProps {
  routeTaskId?: string | null;
  onRouteChange?: (taskId: string | null) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ routeTaskId, onRouteChange }) => {
  const { 
    tasks, users, projects, currentUser, currentRole, permissions, 
    createTask, deleteTask, searchQuery,
    getTaskComments, addTaskComment, addToast, refreshData 
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'timeline'>('kanban');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  
  // Selected task for comments & details drawer
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState<'details' | 'activity' | 'comments'>('details');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const {
    blockModalOpen,
    setBlockModalOpen,
    blockReason,
    setBlockReason,
    reviewFeedbackModalOpen,
    setReviewFeedbackModalOpen,
    reviewFeedback,
    setReviewFeedback,
    actionLoading,
    commentInput,
    setCommentInput,
    isSubmittingComment,
    handleStartTask,
    handleSubmitReview,
    handleApproveTask,
    handleRequestChanges,
    handleBlockTask,
    handleUnblockTask,
    handleSendComment,
  } = useTaskLifecycle({
    selectedTask,
    setSelectedTask,
    addToast,
    refreshData,
    addTaskComment,
    setComments,
    setActivities,
  });

  const {
    isCreateModalOpen,
    handleOpenCreateModal,
    handleCloseCreateModal,
    handleCreateSubmit,
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    storyPoints,
    setStoryPoints,
    estimatedHours,
    setEstimatedHours,
    assignedTo,
    setAssignedTo,
    projectId,
    setProjectId,
    dueDate,
    setDueDate,
    isLearningTask,
    setIsLearningTask,
    isCreating,
  } = useTaskCreateForm({
    currentUser,
    users,
    projects,
    createTask,
  });

  // Sync routeTaskId with selected task
  useEffect(() => {
    if (routeTaskId) {
      const found = tasks.find((t) => t.id === routeTaskId);
      if (found) {
        setSelectedTask(found);
      }
    }
  }, [routeTaskId, tasks]);

  const handleSelectTask = (task: any | null) => {
    setSelectedTask(task);
    if (onRouteChange) {
      onRouteChange(task ? task.id : null);
    }
  };

  // Load comments and activities when selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      setLoadingComments(true);
      getTaskComments(selectedTask.id).then((data) => {
        setComments(data);
        setLoadingComments(false);
      });

      setLoadingActivities(true);
      api.getTaskActivity(selectedTask.id).then((res) => {
        if (res && Array.isArray(res.activity)) {
          setActivities(res.activity);
        }
        setLoadingActivities(false);
      }).catch(() => setLoadingActivities(false));
    }
  }, [selectedTask, getTaskComments]);

  const getTaskAssignee = (t: any | null | undefined) => resolveAssignee(t, users, currentUser);

  // Filter tasks based on role, search query, priority, and project
  const visibleTasks = tasks.filter((t) => {
    if (currentRole === 'intern') {
      const isAssigned =
        t.assigned_to === currentUser.id ||
        (t as any).assignedTo === currentUser.id ||
        t.assignee?.id === currentUser.id;
      if (!isAssigned) {
        return false;
      }
    }
    if (filterPriority !== 'all' && t.priority !== filterPriority) {
      return false;
    }
    if (filterProject !== 'all' && t.project_id !== filterProject && (t as any).projectId !== filterProject) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <TasksViewHeader
        taskCount={visibleTasks.length}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filterProject={filterProject}
        setFilterProject={setFilterProject}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        projects={projects}
        canCreate={permissions.tasks.create}
        onOpenCreateModal={handleOpenCreateModal}
      />

      {visibleTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No Tasks Found"
          description="Your backlog is completely clear or no tasks match the active filter. Create a new work item to get started."
          actionLabel={permissions.tasks.create ? 'Create Work Item' : undefined}
          onAction={handleOpenCreateModal}
        />
      ) : viewMode === 'kanban' ? (
        <TaskKanbanBoard
          visibleTasks={visibleTasks}
          projects={projects}
          currentRole={currentRole}
          canDelete={permissions.tasks.delete}
          onSelectTask={handleSelectTask}
          onDeleteTask={deleteTask}
          onStartTask={handleStartTask}
          onSubmitReview={handleSubmitReview}
          onApproveTask={handleApproveTask}
          onOpenReviewFeedbackModal={(task) => {
            setSelectedTask(task);
            setReviewFeedbackModalOpen(true);
          }}
          getTaskAssignee={getTaskAssignee}
          getPriorityBadge={getPriorityBadge}
        />
      ) : (
        <TaskListView
          visibleTasks={visibleTasks}
          currentRole={currentRole}
          canDelete={permissions.tasks.delete}
          onSelectTask={handleSelectTask}
          onDeleteTask={deleteTask}
          onStartTask={handleStartTask}
          onSubmitReview={handleSubmitReview}
          onApproveTask={handleApproveTask}
          getTaskAssignee={getTaskAssignee}
          getPriorityBadge={getPriorityBadge}
        />
      )}

      {/* Task Drawer & Modals Container */}
      <TasksModalsContainer
        selectedTask={selectedTask}
        onCloseDrawer={() => handleSelectTask(null)}
        drawerTab={drawerTab}
        setDrawerTab={setDrawerTab}
        comments={comments}
        activities={activities}
        commentInput={commentInput}
        setCommentInput={setCommentInput}
        loadingComments={loadingComments}
        loadingActivities={loadingActivities}
        isSubmittingComment={isSubmittingComment}
        actionLoading={actionLoading}
        currentRole={currentRole}
        getTaskAssignee={getTaskAssignee}
        getPriorityBadge={getPriorityBadge}
        onSendComment={handleSendComment}
        onStartTask={handleStartTask}
        onSubmitReview={handleSubmitReview}
        onApproveTask={handleApproveTask}
        onOpenReviewFeedbackModal={() => setReviewFeedbackModalOpen(true)}
        onOpenBlockModal={() => setBlockModalOpen(true)}
        onUnblockTask={handleUnblockTask}
        blockModalOpen={blockModalOpen}
        setBlockModalOpen={setBlockModalOpen}
        blockReason={blockReason}
        setBlockReason={setBlockReason}
        onBlockTask={handleBlockTask}
        reviewFeedbackModalOpen={reviewFeedbackModalOpen}
        setReviewFeedbackModalOpen={setReviewFeedbackModalOpen}
        reviewFeedback={reviewFeedback}
        setReviewFeedback={setReviewFeedback}
        onRequestChanges={handleRequestChanges}
        isCreateModalOpen={isCreateModalOpen}
        onCloseCreateModal={handleCloseCreateModal}
        onCreateSubmit={handleCreateSubmit}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        priority={priority}
        setPriority={setPriority}
        projectId={projectId}
        setProjectId={setProjectId}
        assignedTo={assignedTo}
        setAssignedTo={setAssignedTo}
        dueDate={dueDate}
        setDueDate={setDueDate}
        storyPoints={storyPoints}
        setStoryPoints={setStoryPoints}
        estimatedHours={estimatedHours}
        setEstimatedHours={setEstimatedHours}
        isLearningTask={isLearningTask}
        setIsLearningTask={setIsLearningTask}
        isCreating={isCreating}
        projects={projects}
        users={users}
        canAssign={permissions.tasks.assign}
      />
    </div>
  );
};
