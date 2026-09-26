import React from 'react';
import { motion } from 'motion/react';
import { Flame, ShieldAlert, Trash2, FolderKanban, MessageSquare, Play, Send, RotateCcw, ThumbsUp, CheckCircle2 } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { Task, Project } from '../../types';

interface TaskKanbanBoardProps {
  visibleTasks: Task[];
  projects: Project[];
  currentRole: string;
  canDelete: boolean;
  onSelectTask: (task: any) => void;
  onDeleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onSubmitReview: (taskId: string) => void;
  onApproveTask: (taskId: string) => void;
  onOpenReviewFeedbackModal: (task: any) => void;
  getTaskAssignee: (t: any) => any;
  getPriorityBadge: (p: string) => string;
}

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  visibleTasks,
  projects,
  currentRole,
  canDelete,
  onSelectTask,
  onDeleteTask,
  onStartTask,
  onSubmitReview,
  onApproveTask,
  onOpenReviewFeedbackModal,
  getTaskAssignee,
  getPriorityBadge,
}) => {
  const columns: { id: string; label: string; dotColor: string }[] = [
    { id: 'backlog', label: 'Backlog', dotColor: 'bg-slate-500' },
    { id: 'todo', label: 'Todo', dotColor: 'bg-blue-400' },
    { id: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-400' },
    { id: 'review', label: 'Review', dotColor: 'bg-purple-400' },
    { id: 'done', label: 'Done', dotColor: 'bg-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto">
      {columns.map((column) => {
        const columnTasks = visibleTasks.filter((t) => {
          const status = t.status === 'completed' ? 'done' : t.status;
          return status === column.id;
        });

        return (
          <div
            key={column.id}
            className="bg-[#171A21] border border-[#2A303D] rounded-[20px] p-4 flex flex-col min-h-[560px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2A303D] px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${column.dotColor}`} />
                <span className="ui-caption font-semibold text-white tracking-tight">{column.label}</span>
                <span className="ui-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Column Tasks */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
              {columnTasks.map((task) => {
                const assignee = getTaskAssignee(task);
                const project = projects.find((p) => p.id === task.project_id || p.id === (task as any).projectId);
                const isBlocked = task.is_blocked || (task as any).isBlocked;

                return (
                  <motion.div
                    key={task.id}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onSelectTask(task)}
                    className={`bg-[#111827] border ${isBlocked ? 'border-rose-500/40' : 'border-white/[0.08] hover:border-purple-500/40'} rounded-[24px] p-4 glass-shadow transition-all group cursor-pointer`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase border font-mono tracking-wider flex items-center gap-1 ${getPriorityBadge(task.priority)}`}>
                          {task.priority === 'critical' && <Flame className="w-2.5 h-2.5 text-rose-400" />}
                          {task.priority}
                        </span>
                        {isBlocked && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            <span>Blocked</span>
                          </span>
                        )}
                      </div>

                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(task.id);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <h4 className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors mb-1">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Associated Initiative */}
                    {project && (
                      <div className="text-[10px] text-purple-400 font-medium truncate mb-2 flex items-center gap-1">
                        <FolderKanban className="w-3 h-3 text-purple-400/80 shrink-0" />
                        <span className="truncate">{project.title}</span>
                      </div>
                    )}

                    {/* Task Card Footer */}
                    <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <UserAvatar name={assignee?.name} avatar={assignee?.avatar} size="xs" />
                        <span className="truncate max-w-[70px] text-slate-300">{assignee?.name || 'Unassigned'}</span>
                      </div>

                      <div className="flex items-center gap-2 font-mono">
                        {(task.comments_count || 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-slate-400">
                            <MessageSquare className="w-3 h-3 text-purple-400" />
                            <span>{task.comments_count}</span>
                          </span>
                        )}
                        <span>{task.due_date || (task as any).dueDate}</span>
                      </div>
                    </div>

                    {/* Quick Lifecycle Action Button */}
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="mt-2 pt-2 flex items-center justify-between gap-1 border-t border-white/[0.04]"
                    >
                      {column.id === 'todo' && (
                        <button
                          onClick={() => onStartTask(task.id)}
                          className="w-full py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Start Task</span>
                        </button>
                      )}

                      {column.id === 'in_progress' && (
                        <button
                          onClick={() => onSubmitReview(task.id)}
                          className="w-full py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Submit Review</span>
                        </button>
                      )}

                      {column.id === 'review' && currentRole !== 'intern' && (
                        <div className="flex items-center gap-1 w-full">
                          <button
                            onClick={() => onOpenReviewFeedbackModal(task)}
                            className="flex-1 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-[9px] font-semibold flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Changes</span>
                          </button>
                          <button
                            onClick={() => onApproveTask(task.id)}
                            className="flex-1 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[9px] font-semibold flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                          >
                            <ThumbsUp className="w-2.5 h-2.5" />
                            <span>Approve</span>
                          </button>
                        </div>
                      )}

                      {column.id === 'done' && (
                        <span className="w-full py-0.5 text-center text-emerald-400 text-[10px] font-medium flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Delivered</span>
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
