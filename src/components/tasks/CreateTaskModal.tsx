import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { TaskPriority, Project, User } from '../../types';

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
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 text-xs">
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
                    <option value="critical">🚨 CRITICAL</option>
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
                {canAssign && (
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Story Points</label>
                  <input
                    type="number"
                    min={1}
                    max={21}
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min={1}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={onClose}
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
  );
};
