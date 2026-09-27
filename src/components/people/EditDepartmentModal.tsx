import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Trash2, X } from 'lucide-react';

interface EditDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDepartment: any | null;
  editDeptName: string;
  setEditDeptName: (name: string) => void;
  editDeptDescription: string;
  setEditDeptDescription: (desc: string) => void;
  editDeptColor: string;
  setEditDeptColor: (col: string) => void;
  editDeptHeadId: string;
  setEditDeptHeadId: (id: string) => void;
  profiles: any[];
  onSubmit: (e: React.FormEvent) => void;
  onDelete: (id: string, name: string) => void;
}

export const EditDepartmentModal: React.FC<EditDepartmentModalProps> = ({
  isOpen,
  onClose,
  editingDepartment,
  editDeptName,
  setEditDeptName,
  editDeptDescription,
  setEditDeptDescription,
  editDeptColor,
  setEditDeptColor,
  editDeptHeadId,
  setEditDeptHeadId,
  profiles,
  onSubmit,
  onDelete,
}) => {
  if (!isOpen || !editingDepartment) return null;

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
          className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-semibold text-white">Edit Department</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Department Name</label>
              <input
                type="text"
                required
                value={editDeptName}
                onChange={(e) => setEditDeptName(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                placeholder="e.g. Frontend Engineering"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Mission / Description</label>
              <textarea
                rows={3}
                value={editDeptDescription}
                onChange={(e) => setEditDeptDescription(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 resize-none"
                placeholder="Core objectives and department roadmap..."
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Department Lead</label>
              <select
                value={editDeptHeadId}
                onChange={(e) => setEditDeptHeadId(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">No Lead Assigned</option>
                {profiles.map((p) => {
                  if (!p) return null;
                  return (
                    <option key={p.userId || p.id} value={p.userId || p.id}>
                      {p.user?.name || p.name || 'Staff Member'} ({p.designation || 'Staff'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Accent Color</label>
              <div className="flex items-center gap-2">
                {['#7C3AED', '#2563EB', '#059669', '#D97706', '#E11D48', '#0891B2', '#4F46E5'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditDeptColor(c)}
                    className={`w-7 h-7 rounded-lg transition-transform ${
                      editDeptColor === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => onDelete(editingDepartment.id, editingDepartment.name)}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editDeptName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
