import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { 
  CheckSquare, Plus, Columns, List, Filter, Trash2, CheckCircle2, 
  Clock, AlertCircle, User, Calendar, Tag, ChevronRight, X 
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const { 
    tasks, users, projects, currentUser, currentRole, permissions, 
    createTask, updateTaskStatus, deleteTask, searchQuery 
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  // Create Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedTo, setAssignedTo] = useState<string>(currentUser?.id || '');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [isLearningTask, setIsLearningTask] = useState(false);

  // Filter tasks based on role and active filters
  const visibleTasks = tasks.filter((t) => {
    // Role filter: Intern only sees assigned tasks; Employee sees assigned or all project tasks
    if (currentRole === 'intern' && t.assigned_to !== currentUser.id) {
      return false;
    }
    if (currentRole === 'employee' && !permissions.tasks.viewAll && t.assigned_to !== currentUser.id) {
      // In employee view, optionally show assigned or whole project
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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = createTask({
      title,
      description,
      status: 'todo',
      priority,
      assigned_to: assignedTo,
      project_id: projectId,
      due_date: dueDate,
      is_learning_task: isLearningTask,
      comments_count: 0
    });
    if (success) {
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
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
              : 'Interactive Kanban workflow with real-time status transitions.'}
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
                          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-sm transition-all group"
                        >
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase border ${getPriorityBadge(task.priority)}`}>
                              {task.priority}
                            </span>

                            {permissions.tasks.delete && (
                              <button
                                onClick={() => deleteTask(task.id)}
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
                              <span>{task.due_date}</span>
                            </div>

                            {/* Quick Status Shift Buttons */}
                            {permissions.tasks.updateStatus && (
                              <div className="pt-2 flex items-center justify-between gap-1 border-t border-slate-800/40">
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
                    <tr key={task.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-medium text-white max-w-xs">
                        <div>{task.title}</div>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{task.description}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase border ${getPriorityBadge(task.priority)}`}>
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
                      <td className="p-3.5 text-right">
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
                  placeholder="e.g. Implement API authentication middleware"
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
