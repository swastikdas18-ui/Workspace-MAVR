import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, RefreshCw, X } from 'lucide-react';

interface AddDepartmentMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentName: string;
  candidateProfiles: any[];
  selectedAddUserId: string;
  setSelectedAddUserId: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAdding: boolean;
}

export const AddDepartmentMemberModal: React.FC<AddDepartmentMemberModalProps> = ({
  isOpen,
  onClose,
  departmentName,
  candidateProfiles,
  selectedAddUserId,
  setSelectedAddUserId,
  onSubmit,
  isAdding,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#171A21] border border-[#2A303D] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#2A303D]">
            <div className="flex items-center gap-2 text-[#B8FF3B]">
              <UserPlus className="w-4 h-4" />
              <h3 className="font-bold text-white text-sm">Add Member to {departmentName}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Select Workspace Member</label>
              {candidateProfiles.length === 0 ? (
                <p className="p-3 bg-[#0F1115] border border-[#2A303D] rounded-xl text-slate-400 text-xs">
                  All workspace members are already assigned to this department.
                </p>
              ) : (
                <select
                  required
                  value={selectedAddUserId}
                  onChange={(e) => setSelectedAddUserId(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#2A303D] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#B8FF3B]"
                >
                  <option value="">-- Choose Member --</option>
                  {candidateProfiles.map((p) => {
                    const id = p.userId || p.user?.id || p.id;
                    const name = p.user?.name || p.name || p.email;
                    const deptName = p.department?.name ? `(Current: ${p.department.name})` : '(Unassigned)';
                    return (
                      <option key={id} value={id}>
                        {name} {deptName}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A303D]">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedAddUserId || isAdding}
                className="px-4 py-1.5 rounded-xl bg-[#B8FF3B] hover:bg-[#A8EF2B] text-slate-950 font-bold disabled:opacity-40 transition cursor-pointer flex items-center gap-1.5"
              >
                {isAdding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>Add Member</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
