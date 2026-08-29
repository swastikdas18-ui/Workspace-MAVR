import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskStatus, TaskPriority, TaskComment } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';
import { 
  CheckSquare, Plus, Columns, List, Trash2, MessageSquare, 
  Send, X, AlertTriangle, Flame, Clock, Calendar, ChevronRight, User,
  CheckCircle2, ArrowRight, FolderKanban, Tag, Check, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TasksViewProps {
  routeTaskId?: string | null;
  onRouteChange?: (taskId: string | null) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ routeTaskId, onRouteChange }) => {
  const { 
    tasks, users, projects, currentUser, currentRole, permissions, 
    createTask, updateTaskStatus, deleteTask, searchQuery,
    getTaskComments, addTaskComment 
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  // Selected task for comments & details drawer
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Sync routeTaskId with selected task
  useEffect(() => {
    if (routeTaskId) {
      const found = tasks.find((t) => t.id === routeTaskId);
      if (found) {
        setSelectedTask(found);
      }
    }
  }, [routeTaskId, tasks]);

  const handleSelectTask = (task: Task | null) => {
    setSelectedTask(task);
    if (onRouteChange) {
      onRouteChange(task ? task.id : null);
    }
  };

  // Create Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedTo, setAssignedTo] = useState<string>(currentUser?.id || '');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [isLearningTask, setIsLearningTask] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    const defaultAssignee = currentUser?.id || users[0]?.id || '';
    setAssignedTo(defaultAssignee);
    setProjectId(projects[0]?.id || '');
    setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
    const targetUser = users.find(u => u.id === defaultAssignee);
    setIsLearningTask(targetUser?.role === 'intern');
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    if (projects.length > 0) {
      setProjectId(projects[0].id);
    }
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateForm();
  };

  // Load comments when selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      setLoadingComments(true);
      getTaskComments(selectedTask.id).then((data) => {
        setComments(data);
        setLoadingComments(false);
      });
    }
  }, [selectedTask, getTaskComments]);

  // Resilient Assignee lookup helper
  const getTaskAssignee = (t: Task | null | undefined) => {
    if (!t) return null;
    if (t.assignee && typeof t.assignee === 'object' && t.assignee.name) {
      return t.assignee;
    }
    const targetId = t.assigned_to || (t as any).assignedTo;
    if (targetId) {
      const found = users.find((u) => u.id === targetId);
      if (found) return found;
      if (currentUser && (currentUser.id === targetId || t.assigned_to === currentUser.id)) {
        return currentUser;
      }
    }
    if (t.assignee_name) {
      return { id: targetId || '', name: t.assignee_name, avatar: t.assignee_avatar || undefined };
    }
    return null;
  };

  // Filter tasks based on role and active filters
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
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const columns: { id: TaskStatus; label: string; dotColor: string }[] = [
    { id: 'todo', label: 'Backlog & Todo', dotColor: 'bg-slate-500' },
    { id: 'in_progress', label: 'In Progress', dotColor: 'bg-blue-400' },
    { id: 'review', label: 'Peer Review', dotColor: 'bg-purple-400' },
    { id: 'completed', label: 'Done', dotColor: 'bg-emerald-400' },
  ];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const success = await createTask({
      title,
      description,
      status: 'todo',
      priority,
      assigned_to: assignedTo,
      project_id: projectId,
      due_date: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      is_learning_task: isLearningTask,
      comments_count: 0
    });
    setIsCreating(false);
    if (success) {
      setIsCreateModalOpen(false);
      resetCreateForm();
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
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'critical':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold shadow-sm shadow-rose-500/20';
      case 'urgent':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold';
      case 'high':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'medium':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'low':
        return 'bg-slate-800 text-slate-400 border-slate-700/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={currentRole === 'admin' ? 'Task & Workflow Engine' : currentRole === 'employee' ? 'My Active Workstream' : 'Assigned Learning Tasks'}
        description={
          currentRole === 'intern'
            ? 'Execute assigned learning modules and track your onboarding milestones.'
            : 'Linear-inspired task management with real-time state transitions and threaded discussions.'
        }
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-white/[0.08]">
            {visibleTasks.length} Active Items
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-[#111827] border border-white/[0.08] rounded-xl text-xs">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-[#7C3AED] text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
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
            </div>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-[#111827] border border-white/[0.08] text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="all">All Priorities</option>
              <option value="critical">🚨 Critical</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Create Task Button */}
            {permissions.tasks.create && (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Work Item</span>
              </button>
            )}
          </div>
        }
      />

      {/* Main Task Canvas */}
      {visibleTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No Tasks Found"
          description="Your backlog is completely clear or matches no active search criteria."
          actionLabel={permissions.tasks.create ? 'Create Task' : undefined}
          onAction={handleOpenCreateModal}
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((column) => {
            const columnTasks = visibleTasks.filter((t) => t.status === column.id);

            return (
              <div
                key={column.id}
                className="bg-[#0F172A]/60 border border-white/[0.06] rounded-2xl p-3.5 flex flex-col min-h-[520px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${column.dotColor}`} />
                    <span className="font-semibold text-xs text-white tracking-tight">{column.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Tasks */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {columnTasks.map((task) => {
                    const assignee = getTaskAssignee(task);
                    const project = projects.find((p) => p.id === task.project_id);

                    return (
                      <motion.div
                        key={task.id}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => handleSelectTask(task)}
                        className="bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 rounded-xl p-4 shadow-lg transition-all group cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase border font-mono tracking-wider flex items-center gap-1 ${getPriorityBadge(task.priority)}`}>
                              {task.priority === 'critical' && <Flame className="w-2.5 h-2.5 text-rose-400" />}
                              {task.priority}
                            </span>
                            {task.is_learning_task && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Intern
                              </span>
                            )}
                          </div>

                          {permissions.tasks.delete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id);
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
                          <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Associated Project */}
                        {project && (
                          <div className="text-[10px] text-purple-400 font-medium truncate mb-2.5 flex items-center gap-1">
                            <FolderKanban className="w-3 h-3 text-purple-400/80" />
                            <span>{project.title}</span>
                          </div>
                        )}

                        {/* Task Card Footer */}
                        <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <UserAvatar name={assignee?.name} avatar={assignee?.avatar} size="xs" />
                            <span className="truncate max-w-[80px] text-slate-300">{assignee?.name || 'Unassigned'}</span>
                          </div>

                          <div className="flex items-center gap-2.5 font-mono">
                            {(task.comments_count || 0) > 0 && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <MessageSquare className="w-3 h-3 text-purple-400" />
                                <span>{task.comments_count}</span>
                              </span>
                            )}
                            <span>{task.due_date}</span>
                          </div>
                        </div>

                        {/* Fast Workflow Advance */}
                        {permissions.tasks.updateStatus && (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="mt-2.5 pt-2 flex items-center justify-between gap-1 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {column.id !== 'todo' && (
                              <button
                                onClick={() => {
                                  const prevStatus: TaskStatus = column.id === 'completed' ? 'review' : column.id === 'review' ? 'in_progress' : 'todo';
                                  updateTaskStatus(task.id, prevStatus);
                                }}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] cursor-pointer"
                              >
                                ← Back
                              </button>
                            )}
                            <div className="flex-1" />
                            {column.id !== 'completed' && (
                              <button
                                onClick={() => {
                                  const nextStatus: TaskStatus = column.id === 'todo' ? 'in_progress' : column.id === 'in_progress' ? 'review' : 'completed';
                                  updateTaskStatus(task.id, nextStatus);
                                }}
                                className="px-2.5 py-0.5 bg-[#7C3AED]/30 hover:bg-[#7C3AED] text-purple-200 hover:text-white rounded-lg text-[9px] font-semibold transition-colors cursor-pointer"
                              >
                                Advance →
                              </button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0F172A] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Task Item</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {visibleTasks.map((task) => {
                const assignee = getTaskAssignee(task);
                return (
                  <tr 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {task.title}
                        </span>
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
                      <span className="capitalize px-2.5 py-0.5 rounded-full bg-slate-800/80 text-[11px] font-medium border border-white/[0.04]">
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border flex items-center gap-1 w-fit font-mono ${getPriorityBadge(task.priority)}`}>
                        {task.priority === 'critical' && <Flame className="w-2.5 h-2.5 text-rose-400" />}
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={assignee?.name} avatar={assignee?.avatar} size="xs" />
                        <span className="text-slate-200">{assignee?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{task.due_date}</td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {permissions.tasks.updateStatus && task.status !== 'completed' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-xs font-semibold transition-all mr-2 cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                      {permissions.tasks.delete && (
                        <button
                          onClick={() => deleteTask(task.id)}
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
      )}

      {/* Task Details Drawer */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-[#0F172A] border-l border-white/[0.08] h-full shadow-2xl z-10 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border font-mono tracking-wider flex items-center gap-1 ${getPriorityBadge(selectedTask.priority)}`}>
                    {selectedTask.priority === 'critical' && <Flame className="w-3 h-3 text-rose-400" />}
                    {selectedTask.priority}
                  </span>
                  <span className="capitalize px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-medium border border-white/[0.04] text-slate-300">
                    {selectedTask.status.replace('_', ' ')}
                  </span>
                </div>

                <button
                  onClick={() => handleSelectTask(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                <div>
                  <h4 className="text-slate-400 uppercase tracking-wider font-semibold text-[10px] mb-1.5">Description & Scope</h4>
                  <p className="text-slate-200 leading-relaxed bg-[#111827] p-4 rounded-xl border border-white/[0.06] whitespace-pre-wrap">
                    {selectedTask.description || 'No detailed scope provided.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block mb-1">Assignee</span>
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      <span>{getTaskAssignee(selectedTask)?.name || 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block mb-1">Due Date</span>
                    <div className="flex items-center gap-1.5 font-medium text-slate-200 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{selectedTask.due_date}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block mb-1">Initiative</span>
                    <div className="font-medium text-purple-400 truncate">
                      {projects.find((p) => p.id === selectedTask.project_id)?.title || 'General Workspace'}
                    </div>
                  </div>
                </div>

                {/* Status Advancement */}
                {permissions.tasks.updateStatus && (
                  <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">Quick Status Change:</span>
                    <div className="flex items-center gap-1.5">
                      {(['todo', 'in_progress', 'review', 'completed'] as TaskStatus[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            updateTaskStatus(selectedTask.id, st);
                            setSelectedTask({ ...selectedTask, status: st });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                            selectedTask.status === st
                              ? 'bg-[#7C3AED] text-white shadow-sm'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Task Comments & Activity */}
                <div className="pt-4 border-t border-white/[0.08]">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-sm text-white">Thread Activity</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {comments.length}
                    </span>
                  </div>

                  {/* Comment Feed */}
                  <div className="space-y-3 mb-4 max-h-56 overflow-y-auto">
                    {loadingComments ? (
                      <div className="text-center py-4 text-slate-500">Loading activity thread...</div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-6 text-slate-600 border border-dashed border-white/[0.08] rounded-xl">
                        No activity yet. Share an update or tag a colleague below.
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
                  <form onSubmit={handleSendComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a comment or status update..."
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Task Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseCreateModal}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-base font-semibold text-white">Create Work Item</h3>
                <button onClick={handleCloseCreateModal} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement real-time Redis caching layer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Description & Acceptance Criteria</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe specific technical milestones, edge cases, and documentation needs..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">🚨 CRITICAL (Highest Priority)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Associated Initiative</label>
                    <select
                      value={projectId}
                      required
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      {projects.length === 0 ? (
                        <option value="">No initiatives found — create a project first</option>
                      ) : (
                        projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {permissions.tasks.assign && (
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Assignee</label>
                      <select
                        value={assignedTo}
                        onChange={(e) => {
                          const newAssignee = e.target.value;
                          setAssignedTo(newAssignee);
                          const targetUser = users.find((u) => u.id === newAssignee);
                          if (targetUser?.role === 'intern') {
                            setIsLearningTask(true);
                          }
                        }}
                        className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                  )}

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
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-[#111827] rounded-xl border border-white/[0.06]">
                  <input
                    type="checkbox"
                    id="is_learning"
                    checked={isLearningTask}
                    onChange={(e) => setIsLearningTask(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="is_learning" className="text-slate-300 cursor-pointer text-xs">
                    Designate as Intern Learning Task
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    {isCreating ? 'Creating...' : 'Create Task'}
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
