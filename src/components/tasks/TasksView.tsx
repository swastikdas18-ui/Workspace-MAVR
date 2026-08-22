import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskStatus, TaskPriority, TaskComment } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { 
  CheckSquare, Plus, Columns, List, Trash2, MessageSquare, 
  Send, X, AlertTriangle, Flame, Clock, Calendar, ChevronRight, User
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const { 
    tasks, users, projects, currentUser, currentRole, permissions, 
    createTask, updateTaskStatus, deleteTask, searchQuery,
    getTaskComments, addTaskComment 
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  // Selected task for comments & details
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Create Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedTo, setAssignedTo] = useState<string>(currentUser?.id || '');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [isLearningTask, setIsLearningTask] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  // Filter tasks based on role and active filters
  const visibleTasks = tasks.filter((t) => {
    // Role filter: Intern only sees assigned tasks
    if (currentRole === 'intern' && t.assigned_to !== currentUser.id) {
      return false;
    }
    // Priority filter
    if (filterPriority !== 'all' && t.priority !== filterPriority) {
      return false;
    }
    // Search query
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'todo', label: 'To Do', color: 'border-slate-700 bg-slate-900/40 text-slate-300' },
    { id: 'in_progress', label: 'In Progress', color: 'border-blue-800/80 bg-blue-950/20 text-blue-300' },
    { id: 'review', label: 'In Review', color: 'border-purple-800/80 bg-purple-950/20 text-purple-300' },
    { id: 'completed', label: 'Completed', color: 'border-emerald-800/80 bg-emerald-950/20 text-emerald-300' },
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
      setTitle('');
      setDescription('');
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
        return 'bg-gradient-to-r from-red-600/30 to-purple-600/30 text-rose-300 border-rose-500 font-bold animate-pulse shadow-sm shadow-rose-500/20';
      case 'urgent':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'medium':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'low':
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {currentRole === 'admin' ? 'Organization Task Board' : currentRole === 'employee' ? 'My Task Stream & Board' : 'Assigned Learning Tasks'}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {visibleTasks.length} Tasks
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {currentRole === 'intern'
              ? 'Mark tasks In Progress and Complete as you advance through onboarding modules.'
              : 'Interactive Kanban workflow backed directly by PostgreSQL database.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical Priority 🚨</option>
            <option value="urgent">Urgent Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Kanban Board"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {permissions.tasks.create && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => {
            const columnTasks = visibleTasks.filter((t) => t.status === column.id);

            return (
              <div
                key={column.id}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">{column.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks Column List */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnTasks.length === 0 ? (
                    <div className="h-32 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-600">
                      No tasks in {column.label}
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const assignee = users.find((u) => u.id === task.assigned_to);
                      const project = projects.find((p) => p.id === task.project_id);

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-3.5 shadow-sm transition-all group cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase border flex items-center gap-1 ${getPriorityBadge(task.priority)}`}>
                                {task.priority === 'critical' && <Flame className="w-2.5 h-2.5 text-rose-400" />}
                                {task.priority}
                              </span>
                              {task.is_learning_task && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Learning
                                </span>
                              )}
                            </div>

                            {permissions.tasks.delete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTask(task.id);
                                }}
                                className="text-slate-500 hover:text-rose-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-slate-100 mb-1 leading-snug">
                            {task.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                            {task.description}
                          </p>

                          {/* Task Metadata */}
                          <div className="space-y-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                            {project && (
                              <div className="truncate text-blue-400 font-medium">
                                📁 {project.title}
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <UserAvatar user={assignee} size="xs" />
                                <span className="truncate max-w-[80px]">{assignee?.name || 'Unassigned'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {(task.comments_count || 0) > 0 && (
                                  <span className="flex items-center gap-1 text-slate-400">
                                    <MessageSquare className="w-2.5 h-2.5" />
                                    {task.comments_count}
                                  </span>
                                )}
                                <span>{task.due_date}</span>
                              </div>
                            </div>

                            {/* Quick Status Shift Buttons */}
                            {permissions.tasks.updateStatus && (
                              <div 
                                onClick={(e) => e.stopPropagation()} 
                                className="pt-2 flex items-center justify-between gap-1 border-t border-slate-800/40"
                              >
                                {column.id !== 'todo' && (
                                  <button
                                    onClick={() => {
                                      const prevStatus: TaskStatus = column.id === 'completed' ? 'review' : column.id === 'review' ? 'in_progress' : 'todo';
                                      updateTaskStatus(task.id, prevStatus);
                                    }}
                                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px]"
                                  >
                                    ← Move
                                  </button>
                                )}
                                <div className="flex-1" />
                                {column.id !== 'completed' && (
                                  <button
                                    onClick={() => {
                                      const nextStatus: TaskStatus = column.id === 'todo' ? 'in_progress' : column.id === 'in_progress' ? 'review' : 'completed';
                                      updateTaskStatus(task.id, nextStatus);
                                    }}
                                    className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white rounded text-[9px] font-semibold transition-colors"
                                  >
                                    Advance →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Task Title</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Assigned To</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {visibleTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                    No tasks found matching criteria.
                  </td>
                </tr>
              ) : (
                visibleTasks.map((task) => {
                  const assignee = users.find((u) => u.id === task.assigned_to);
                  return (
                    <tr 
                      key={task.id} 
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 font-medium text-white max-w-xs">
                        <div className="flex items-center gap-2">
                          <span>{task.title}</span>
                          {(task.comments_count || 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-blue-400">
                              <MessageSquare className="w-2.5 h-2.5" />
                              {task.comments_count}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{task.description}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase border flex items-center gap-1 w-fit ${getPriorityBadge(task.priority)}`}>
                          {task.priority === 'critical' && <Flame className="w-2.5 h-2.5 text-rose-400" />}
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <UserAvatar user={assignee} size="xs" />
                          <span>{assignee?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-400">{task.due_date}</td>
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {permissions.tasks.updateStatus && task.status !== 'completed' && (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white text-[11px] font-medium transition-colors mr-2"
                          >
                            Complete
                          </button>
                        )}
                        {permissions.tasks.delete && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Details & Comments Drawer / Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase border flex items-center gap-1 ${getPriorityBadge(selectedTask.priority)}`}>
                    {selectedTask.priority === 'critical' && <Flame className="w-2.5 h-2.5 text-rose-400" />}
                    {selectedTask.priority}
                  </span>
                  <span className="text-xs capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedTask.status.replace('_', ' ')}
                  </span>
                  {selectedTask.is_learning_task && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Intern Learning Task
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-white">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              <div>
                <h4 className="text-slate-400 uppercase tracking-wider font-semibold text-[10px] mb-1">Description</h4>
                <p className="text-slate-200 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
                  {selectedTask.description || 'No detailed description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                  <span className="text-[10px] text-slate-500 block mb-1">Assigned To</span>
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>{users.find((u) => u.id === selectedTask.assigned_to)?.name || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                  <span className="text-[10px] text-slate-500 block mb-1">Due Date</span>
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{selectedTask.due_date}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                  <span className="text-[10px] text-slate-500 block mb-1">Associated Project</span>
                  <div className="font-medium text-blue-400 truncate">
                    {projects.find((p) => p.id === selectedTask.project_id)?.title || 'General Workspace'}
                  </div>
                </div>
              </div>

              {/* Task Discussion / Comments */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">Task Discussion & Activity</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {comments.length}
                  </span>
                </div>

                {/* Comment Thread */}
                <div className="space-y-3 mb-4 max-h-56 overflow-y-auto">
                  {loadingComments ? (
                    <div className="text-center py-4 text-slate-500">Loading comments...</div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-6 text-slate-600 border border-dashed border-slate-800 rounded-xl">
                      No comments yet. Start the conversation below!
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                            <span>{c.user_name}</span>
                            {c.user_role && (
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                {c.user_role}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
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
                    placeholder="Write an update, question, or comment..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim() || isSubmittingComment}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create New Task</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deploy PostgreSQL migration & update RBAC"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Task Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide context, acceptance criteria, or links..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">🚨 CRITICAL (Highest Urgency)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Assigned Project</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {permissions.tasks.assign && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Assign User</label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_learning"
                  checked={isLearningTask}
                  onChange={(e) => setIsLearningTask(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="is_learning" className="text-slate-300">
                  Designate as Intern Learning Task
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {isCreating ? 'Saving to Database...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
