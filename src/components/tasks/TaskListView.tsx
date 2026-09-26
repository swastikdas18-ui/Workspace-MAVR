import React from 'react';
import { Flame, MessageSquare, Trash2 } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { Task } from '../../types';

interface TaskListViewProps {
  visibleTasks: Task[];
  currentRole: string;
  canDelete: boolean;
  onSelectTask: (task: any) => void;
  onDeleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onSubmitReview: (taskId: string) => void;
  onApproveTask: (taskId: string) => void;
  getTaskAssignee: (t: any) => any;
  getPriorityBadge: (p: string) => string;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  visibleTasks,
  currentRole,
  canDelete,
  onSelectTask,
  onDeleteTask,
  onStartTask,
  onSubmitReview,
  onApproveTask,
  getTaskAssignee,
  getPriorityBadge,
}) => {
  return (
    <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/[0.08] bg-[#0F172A] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            <th className="py-3.5 px-4">Task Item</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4">Priority</th>
            <th className="py-3.5 px-4">Points</th>
            <th className="py-3.5 px-4">Assigned To</th>
            <th className="py-3.5 px-4">Due Date</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04] text-slate-300">
          {visibleTasks.map((task) => {
            const assignee = getTaskAssignee(task);
            const status = task.status === 'completed' ? 'done' : task.status;
            const isBlocked = task.is_blocked || (task as any).isBlocked;

            return (
              <tr 
                key={task.id} 
                onClick={() => onSelectTask(task)}
                className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                      {task.title}
                    </span>
                    {isBlocked && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300">
                        Blocked
                      </span>
                    )}
                    {(task.comments_count || 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-purple-400">
                        <MessageSquare className="w-3 h-3" />
                        {task.comments_count}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{task.description}</span>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`capitalize px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : status === 'review' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : status === 'in_progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-slate-800 text-slate-400 border-white/[0.04]'
                  }`}>
                    {status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border flex items-center gap-1 w-fit font-mono ${getPriorityBadge(task.priority)}`}>
                    {task.priority === 'critical' && <Flame className="w-2.5 h-2.5 text-rose-400" />}
                    {task.priority}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400">{task.story_points || 1} pts</td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={assignee?.name} avatar={assignee?.avatar} size="xs" />
                    <span className="text-slate-200">{assignee?.name || 'Unassigned'}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400">{task.due_date || (task as any).dueDate}</td>
                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  {status === 'todo' && (
                    <button
                      onClick={() => onStartTask(task.id)}
                      className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-300 hover:bg-blue-500 hover:text-white border border-blue-500/20 text-xs font-semibold transition-all mr-2 cursor-pointer"
                    >
                      Start
                    </button>
                  )}
                  {status === 'in_progress' && (
                    <button
                      onClick={() => onSubmitReview(task.id)}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-white border border-amber-500/20 text-xs font-semibold transition-all mr-2 cursor-pointer"
                    >
                      Submit
                    </button>
                  )}
                  {status === 'review' && currentRole !== 'intern' && (
                    <button
                      onClick={() => onApproveTask(task.id)}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-xs font-semibold transition-all mr-2 cursor-pointer"
                    >
                      Approve
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
