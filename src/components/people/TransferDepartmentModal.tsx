import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface TransferDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetReassignUser: any;
  setTargetReassignUser: (user: any) => void;
  selectedNewDeptId: string;
  setSelectedNewDeptId: (id: string) => void;
  profiles: any[];
  departments: any[];
  onSubmit: (e: React.FormEvent) => void;
}

export const TransferDepartmentModal: React.FC<TransferDepartmentModalProps> = ({
  isOpen,
  onClose,
  targetReassignUser,
  setTargetReassignUser,
  selectedNewDeptId,
  setSelectedNewDeptId,
  profiles,
  departments,
  onSubmit,
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
          className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h3 className="text-base font-semibold text-white">Assign / Transfer Department</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Select Employee</label>
              <select
                required
                value={targetReassignUser?.userId || targetReassignUser?.id || ''}
                onChange={(e) => {
                  const found = profiles.find((p) => p && ((p.userId || p.id) === e.target.value || p.user?.id === e.target.value));
                  setTargetReassignUser(found || null);
                }}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Choose Employee --</option>
                {profiles.map((p) => {
                  if (!p) return null;
                  const val = p.userId || p.user?.id || p.id;
                  const displayName = p.user?.name || p.name || (p.user?.email ? p.user.email.split('@')[0] : 'Employee');
                  return (
                    <option key={val} value={val}>
                      {displayName} ({p.department?.name || 'General Operations'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Department</label>
              <select
                required
                value={selectedNewDeptId}
                onChange={(e) => setSelectedNewDeptId(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Choose Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
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
                disabled={!targetReassignUser || !selectedNewDeptId}
                className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
              >
                Confirm Assignment
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
