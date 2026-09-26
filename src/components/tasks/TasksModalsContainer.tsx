import React from 'react';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { BlockTaskModal, ReviewFeedbackModal } from './TaskWorkflowModals';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskPriority, TaskComment, Project, User } from '../../types';

interface TasksModalsContainerProps {
  selectedTask: any | null;
  onCloseDrawer: () => void;
  drawerTab: 'details' | 'activity' | 'comments';
  setDrawerTab: (tab: 'details' | 'activity' | 'comments') => void;
  comments: TaskComment[];
  activities: any[];
  commentInput: string;
  setCommentInput: (val: string) => void;
  loadingComments: boolean;
  loadingActivities: boolean;
  isSubmittingComment: boolean;
  actionLoading: boolean;
  currentRole: string;
  getTaskAssignee: (t: any) => any;
  getPriorityBadge: (p: string) => string;
  onSendComment: (e: React.FormEvent) => void;
  onStartTask: (taskId: string) => void;
  onSubmitReview: (taskId: string) => void;
  onApproveTask: (taskId: string) => void;
  onOpenReviewFeedbackModal: () => void;
  onOpenBlockModal: () => void;
  onUnblockTask: (taskId: string) => void;

  // Block modal
  blockModalOpen: boolean;
  setBlockModalOpen: (open: boolean) => void;
  blockReason: string;
  setBlockReason: (reason: string) => void;
  onBlockTask: () => void;

  // Review Feedback modal
  reviewFeedbackModalOpen: boolean;
  setReviewFeedbackModalOpen: (open: boolean) => void;
  reviewFeedback: string;
  setReviewFeedback: (feedback: string) => void;
  onRequestChanges: () => void;

  // Create Modal
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
  onCreateSubmit: (e: React.FormEvent) => void;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  priority: TaskPriority;
  setPriority: (val: TaskPriority) => void;
  projectId: string;
  setProjectId: (val: string) => void;
  assignedTo: string;
  setAssignedTo: (val: string) => void;
  dueDate: string;
  setDueDate: (val: string) => void;
  storyPoints: number;
  setStoryPoints: (val: number) => void;
  estimatedHours: number;
  setEstimatedHours: (val: number) => void;
  isLearningTask: boolean;
  setIsLearningTask: (val: boolean) => void;
  isCreating: boolean;
  projects: Project[];
  users: User[];
  canAssign: boolean;
}

export const TasksModalsContainer: React.FC<TasksModalsContainerProps> = ({
  selectedTask,
  onCloseDrawer,
  drawerTab,
  setDrawerTab,
  comments,
  activities,
  commentInput,
  setCommentInput,
  loadingComments,
  loadingActivities,
  isSubmittingComment,
  actionLoading,
  currentRole,
  getTaskAssignee,
  getPriorityBadge,
  onSendComment,
  onStartTask,
  onSubmitReview,
  onApproveTask,
  onOpenReviewFeedbackModal,
  onOpenBlockModal,
  onUnblockTask,
  blockModalOpen,
  setBlockModalOpen,
  blockReason,
  setBlockReason,
  onBlockTask,
  reviewFeedbackModalOpen,
  setReviewFeedbackModalOpen,
  reviewFeedback,
  setReviewFeedback,
  onRequestChanges,
  isCreateModalOpen,
  onCloseCreateModal,
  onCreateSubmit,
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  projectId,
  setProjectId,
  assignedTo,
  setAssignedTo,
  dueDate,
  setDueDate,
  storyPoints,
  setStoryPoints,
  estimatedHours,
  setEstimatedHours,
  isLearningTask,
  setIsLearningTask,
  isCreating,
  projects,
  users,
  canAssign,
}) => {
  return (
    <>
      <TaskDetailDrawer
        selectedTask={selectedTask}
        onClose={onCloseDrawer}
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
        onSendComment={onSendComment}
        onStartTask={onStartTask}
        onSubmitReview={onSubmitReview}
        onApproveTask={onApproveTask}
        onOpenReviewFeedbackModal={onOpenReviewFeedbackModal}
        onOpenBlockModal={onOpenBlockModal}
        onUnblockTask={onUnblockTask}
      />

      <BlockTaskModal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        blockReason={blockReason}
        setBlockReason={setBlockReason}
        onSubmit={onBlockTask}
        loading={actionLoading}
      />

      <ReviewFeedbackModal
        isOpen={reviewFeedbackModalOpen}
        onClose={() => setReviewFeedbackModalOpen(false)}
        reviewFeedback={reviewFeedback}
        setReviewFeedback={setReviewFeedback}
        onSubmit={onRequestChanges}
        loading={actionLoading}
      />

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={onCloseCreateModal}
        onSubmit={onCreateSubmit}
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
        canAssign={canAssign}
      />
    </>
  );
};
