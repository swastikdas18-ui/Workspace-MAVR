import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, AlertTriangle, Layers, Clock, Hash, Plus, Check } from 'lucide-react';
import { TaskPriority, Project, User } from '../../types';
import { AssigneePicker } from './AssigneePicker';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  priority: TaskPriority;
  setPriority: (v: TaskPriority) => void;
  projectId: string;
  setProjectId: (v: string) => void;
  assignedTo: string;
  setAssignedTo: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  storyPoints: number;
  setStoryPoints: (v: number) => void;
  estimatedHours: number;
  setEstimatedHours: (v: number) => void;
  isLearningTask: boolean;
  setIsLearningTask: (v: boolean) => void;
  isCreating: boolean;
  projects: Project[];
  users: User[];
  canAssign: boolean;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
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
  setIsLearningTask,
  isCreating,
  projects,
  users,
  canAssign,
}) => {
  const handleAssigneeChange = (newAssigneeId: string) => {
    setAssignedTo(newAssigneeId);
    const targetUser = users.find((u) => u.id === newAssigneeId);
    if (targetUser?.role === 'intern') {
      setIsLearningTask(true);
    } else {
      setIsLearningTask(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-[#171A21] border border-[#2A303D] rounded-2xl shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A303D] bg-[#111318]/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#B8FF3B]/10 border border-[#B8FF3B]/30 flex items-center justify-center text-[#B8FF3B]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">Create Work Item</h3>
                  <p className="text-[11px] text-slate-400">Add a new operational task to your workspace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="text-slate-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden text-xs">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Title */}
                <div>
                  <label htmlFor="task-title-input" className="block text-slate-300 font-medium mb-1.5">
                    Task Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="task-title-input"
                    type="text"
                    required
                    placeholder="e.g. Implement resilient connection pool failover"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#111318] border border-[#2A303D] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#B8FF3B]/60 focus:ring-2 focus:ring-[#B8FF3B]/10 transition-all font-medium"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="task-description-input" className="block text-slate-300 font-medium mb-1.5">
                    Description & Acceptance Criteria <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    id="task-description-input"
                    rows={3}
                    required
                    placeholder="Detail specific deliverables, technical constraints, testing requirements..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#111318] border border-[#2A303D] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#B8FF3B]/60 focus:ring-2 focus:ring-[#B8FF3B]/10 transition-all resize-y min-h-[75px]"
                  />
                </div>

                {/* Priority & Associated Initiative Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="task-priority-select" className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                      Priority
                    </label>
                    <div className="relative">
                      <select
                        id="task-priority-select"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TaskPriority)}
                        className="w-full bg-[#111318] border border-[#2A303D] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#B8FF3B]/60 transition-colors cursor-pointer appearance-none"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent Priority</option>
                        <option value="critical">🚨 Critical Priority</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="task-project-select" className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Associated Initiative <span className="text-rose-400">*</span>
                    </label>
                    <select
                      id="task-project-select"
                      value={projectId}
                      required
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full bg-[#111318] border border-[#2A303D] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#B8FF3B]/60 transition-colors cursor-pointer"
                    >
                      {projects.length === 0 ? (
                        <option value="">No initiatives found — create a project first</option>
                      ) : (
                        projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Assignee & Target Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {canAssign ? (
                    <div>
                      <AssigneePicker
                        users={users}
                        selectedUserId={assignedTo}
                        onSelectUser={handleAssigneeChange}
                        label="Assignee"
                        placeholder="Search team member..."
                        allowClear={false}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">Assignee</label>
                      <div className="px-3 py-2 rounded-xl bg-[#111318] border border-[#2A303D] text-slate-400 text-xs">
                        Self (Restricted permission)
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="task-due-date-input" className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Target Due Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="task-due-date-input"
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-[#111318] border border-[#2A303D] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#B8FF3B]/60 transition-colors"
                    />
                  </div>
                </div>

                {/* Story Points & Estimated Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="task-story-points-input" className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      Story Points (1 - 21)
                    </label>
                    <input
                      id="task-story-points-input"
                      type="number"
                      min={1}
                      max={21}
                      value={storyPoints}
                      onChange={(e) => setStoryPoints(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#111318] border border-[#2A303D] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#B8FF3B]/60 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="task-estimated-hours-input" className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Estimated Hours
                    </label>
                    <input
                      id="task-estimated-hours-input"
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#111318] border border-[#2A303D] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#B8FF3B]/60 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Footer Actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2A303D] bg-[#111318]/70 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !title.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#B8FF3B] hover:bg-[#CCFF66] text-black font-semibold shadow-lg shadow-[#B8FF3B]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Create Task</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
