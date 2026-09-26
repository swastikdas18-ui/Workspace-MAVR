import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Flame, History, MessageSquare, User, Calendar, 
  ShieldAlert, Play, Send, ThumbsUp, RotateCcw 
} from 'lucide-react';
import { TaskComment } from '../../types';

interface TaskDetailDrawerProps {
  selectedTask: any | null;
  onClose: () => void;
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
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  selectedTask,
  onClose,
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
}) => {
  return (
    <AnimatePresence>
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-[#0F172A] border-l border-white/[0.08] h-full shadow-2xl z-10 flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border font-mono tracking-wider flex items-center gap-1 ${getPriorityBadge(selectedTask.priority)}`}>
                  {selectedTask.priority === 'critical' && <Flame className="w-3 h-3 text-rose-400" />}
                  {selectedTask.priority}
                </span>
                <span className="capitalize px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-medium border border-white/[0.04] text-slate-300">
                  {(selectedTask.status === 'completed' ? 'done' : selectedTask.status).replace('_', ' ')}
                </span>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Tabs */}
            <div className="flex items-center px-6 pt-3 border-b border-white/[0.06] gap-4 text-xs font-semibold">
              <button
                onClick={() => setDrawerTab('details')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'details'
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Details & Actions
              </button>
              <button
                onClick={() => setDrawerTab('activity')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  drawerTab === 'activity'
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Activity Log ({activities.length})</span>
              </button>
              <button
                onClick={() => setDrawerTab('comments')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  drawerTab === 'comments'
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comments ({comments.length})</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {drawerTab === 'details' && (
                <>
                  <div>
                    <h4 className="text-slate-400 uppercase tracking-wider font-semibold text-[10px] mb-1.5">Description</h4>
                    <p className="text-slate-200 leading-relaxed bg-[#111827] p-4 rounded-xl border border-white/[0.06] whitespace-pre-wrap">
                      {selectedTask.description || 'No detailed scope provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06]">
                      <span className="text-[10px] text-slate-500 block mb-1">Assignee</span>
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <User className="w-3.5 h-3.5 text-purple-400" />
                        <span className="truncate">{getTaskAssignee(selectedTask)?.name || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06]">
                      <span className="text-[10px] text-slate-500 block mb-1">Due Date</span>
                      <div className="flex items-center gap-1.5 font-medium text-slate-200 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>{selectedTask.due_date || (selectedTask as any).dueDate}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06]">
                      <span className="text-[10px] text-slate-500 block mb-1">Story Points</span>
                      <div className="font-mono font-bold text-white">
                        {selectedTask.story_points || 1} pts
                      </div>
                    </div>
                  </div>

                  {/* Impediment / Blocked State */}
                  {selectedTask.is_blocked || (selectedTask as any).isBlocked ? (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-rose-400">
                          <ShieldAlert className="w-4 h-4" />
                          <span>Impediment Logged</span>
                        </div>
                        <p className="text-rose-200 text-xs mt-1">
                          {selectedTask.blocked_reason || (selectedTask as any).blockedReason || 'Blocked by dependency.'}
                        </p>
                      </div>
                      <button
                        onClick={() => onUnblockTask(selectedTask.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                      >
                        Unblock
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        onClick={onOpenBlockModal}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 text-xs border border-white/[0.06] transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Report Impediment (Block)</span>
                      </button>
                    </div>
                  )}

                  {/* Workflow Lifecycle Action Buttons */}
                  <div className="p-4 rounded-xl bg-[#111827] border border-white/[0.06] space-y-3">
                    <span className="text-xs text-slate-300 font-semibold block">Lifecycle Advancement:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedTask.status === 'todo' && (
                        <button
                          onClick={() => onStartTask(selectedTask.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                          <span>Start Task (Move to In Progress)</span>
                        </button>
                      )}

                      {selectedTask.status === 'in_progress' && (
                        <button
                          onClick={() => onSubmitReview(selectedTask.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>Submit for Review</span>
                        </button>
                      )}

                      {selectedTask.status === 'review' && currentRole !== 'intern' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onApproveTask(selectedTask.id)}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>Approve & Complete</span>
                          </button>
                          <button
                            onClick={onOpenReviewFeedbackModal}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Request Changes</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {drawerTab === 'activity' && (
                <div className="space-y-4">
                  {loadingActivities ? (
                    <div className="text-center py-6 text-slate-500">Loading audit trail...</div>
                  ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 border border-dashed border-white/[0.08] rounded-xl">
                      <History className="w-6 h-6 text-slate-600" strokeWidth={1.5} />
                      <p className="text-xs font-semibold text-slate-400">No Activity Yet</p>
                      <p className="text-[11px] text-slate-500 max-w-[200px] text-center">Status changes and updates will appear here as the team collaborates.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((act) => (
                        <div key={act.id} className="p-3 rounded-xl bg-[#111827] border border-white/[0.06] space-y-1">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="font-semibold text-white">{act.user_name}</span>
                            <span className="font-mono text-[10px]">
                              {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs">
                            {act.comment || `Action: ${act.type}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'comments' && (
                <div className="space-y-4">
                  {/* Comment Feed */}
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {loadingComments ? (
                      <div className="text-center py-4 text-slate-500">Loading activity thread...</div>
                    ) : comments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 border border-dashed border-white/[0.08] rounded-xl">
                        <MessageSquare className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                        <p className="text-xs font-semibold text-slate-400">No Comments Yet</p>
                        <p className="text-[11px] text-slate-500">Start the thread — share an update below.</p>
                      </div>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-slate-200">
                              <span>{c.user_name}</span>
                              {c.user_role && (
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-purple-300 font-mono border border-purple-500/20">
                                  {c.user_role}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  <form onSubmit={onSendComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a comment or update..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      className="flex-1 bg-[#111827] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!commentInput.trim() || isSubmittingComment}
                      className="px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
