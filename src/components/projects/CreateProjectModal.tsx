import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, Check } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { Department } from '../../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  budget: string;
  setBudget: (v: string) => void;
  departments: Department[];
  selectedDepartmentId: string;
  setSelectedDepartmentId: (id: string) => void;
  users: any[];
  selectedMembers: string[];
  toggleMemberSelection: (userId: string) => void;
  tagsInput: string;
  setTagsInput: (v: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  setTitle,
  description,
  setDescription,
  dueDate,
  setDueDate,
  budget,
  setBudget,
  departments,
  selectedDepartmentId,
  setSelectedDepartmentId,
  users,
  selectedMembers,
  toggleMemberSelection,
  tagsInput,
  setTagsInput,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-lg bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4 max-h-[88vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h3 className="text-base font-semibold text-white">Create Strategic Initiative</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Initiative Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Next-Gen Enterprise AI Orchestrator"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Description & Key Milestones</label>
              <textarea
                rows={3}
                required
                placeholder="Define core deliverables, technical scope, and expected outcome..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Allocated Budget</label>
                <input
                  type="text"
                  placeholder="e.g. $45,000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {departments.length > 0 && (
              <div>
                <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Assign To Department</span>
                </label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-[#111827] rounded-xl border border-emerald-500/20">
                  {departments.map((dept) => {
                    const isSelected = selectedDepartmentId === dept.id;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => setSelectedDepartmentId(isSelected ? '' : dept.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Building2 className="w-3 h-3 text-emerald-400" />
                        <span>{dept.name}</span>
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Assign Individual Members</label>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-[#111827] rounded-xl border border-white/[0.06]">
                {users.map((user: any) => {
                  const targetUserId = user.userId || user.user_id || user.id;
                  const isSelected = selectedMembers.includes(targetUserId);
                  return (
                    <button
                      key={targetUserId}
                      type="button"
                      onClick={() => toggleMemberSelection(targetUserId)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <UserAvatar user={user} size="sm" />
                      <span>{user.name}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Tags (Comma Separated)</label>
              <input
                type="text"
                placeholder="e.g. Infrastructure, Security, AI, Frontend"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
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
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Launch Initiative
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
