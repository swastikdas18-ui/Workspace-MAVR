import { useState } from 'react';
import { api } from '../../lib/api';
import { TaskComment } from '../../types';

interface UseTaskLifecycleProps {
  selectedTask: any | null;
  setSelectedTask: (task: any | null) => void;
  addToast: (toast: any) => void;
  refreshData: () => Promise<void>;
  addTaskComment: (taskId: string, content: string) => Promise<TaskComment | null>;
  setComments: React.Dispatch<React.SetStateAction<TaskComment[]>>;
  setActivities: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useTaskLifecycle({
  selectedTask,
  setSelectedTask,
  addToast,
  refreshData,
  addTaskComment,
  setComments,
  setActivities,
}: UseTaskLifecycleProps) {
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [reviewFeedbackModalOpen, setReviewFeedbackModalOpen] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoading(true);
      const res = await api.startTask(taskId);
      addToast({ type: 'success', title: 'Task Started', message: res.message || 'Moved to In Progress.' });
      await refreshData();
      if (selectedTask?.id === taskId) {
        setSelectedTask(res.task);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err.message || 'Could not start task.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async (taskId: string) => {
    try {
      setActionLoading(true);
      const res = await api.submitTaskReview(taskId);
      addToast({ type: 'success', title: 'Submitted for Review', message: res.message || 'Moved to Review.' });
      await refreshData();
      if (selectedTask?.id === taskId) {
        setSelectedTask(res.task);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err.message || 'Could not submit task.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      setActionLoading(true);
      const res = await api.approveTask(taskId);
      addToast({ type: 'success', title: 'Task Approved', message: res.message || 'Task completed.' });
      await refreshData();
      if (selectedTask?.id === taskId) {
        setSelectedTask(res.task);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err.message || 'Could not approve task.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedTask || !reviewFeedback.trim()) return;
    try {
      setActionLoading(true);
      const res = await api.requestTaskChanges(selectedTask.id, reviewFeedback.trim());
      addToast({ type: 'info', title: 'Changes Requested', message: res.message || 'Task returned to In Progress.' });
      setReviewFeedbackModalOpen(false);
      setReviewFeedback('');
      await refreshData();
      setSelectedTask(res.task);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err.message || 'Could not request changes.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockTask = async () => {
    if (!selectedTask || !blockReason.trim()) return;
    try {
      setActionLoading(true);
      const res = await api.blockTask(selectedTask.id, blockReason.trim());
      addToast({ type: 'warning', title: 'Task Blocked', message: res.message || 'Recorded impediment.' });
      setBlockModalOpen(false);
      setBlockReason('');
      await refreshData();
      setSelectedTask(res.task);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err.message || 'Could not block task.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockTask = async (taskId: string) => {
    try {
      setActionLoading(true);
      const res = await api.unblockTask(taskId);
      addToast({ type: 'success', title: 'Task Unblocked', message: res.message || 'Impediment cleared.' });
      await refreshData();
      if (selectedTask?.id === taskId) {
        setSelectedTask(res.task);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err.message || 'Could not unblock task.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !commentInput.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const newComment = await addTaskComment(selectedTask.id, commentInput.trim());
    setIsSubmittingComment(false);

    if (newComment) {
      setComments((prev) => [...prev, newComment]);
      setCommentInput('');
      api.getTaskActivity(selectedTask.id).then((res) => {
        if (res?.activity) setActivities(res.activity);
      });
    }
  };

  return {
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
  };
}
