import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRightLeft, RefreshCw, X } from 'lucide-react';

interface MoveDepartmentMemberModalProps {
  movingMember: any | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  targetDepartmentId: string;
  setTargetDepartmentId: (id: string) => void;
  isMoving: boolean;
  departmentId: string;
  allDepartments: any[];
}

export const MoveDepartmentMemberModal: React.FC<MoveDepartmentMemberModalProps> = ({
  movingMember,
  onClose,
  onSubmit,
  targetDepartmentId,
  setTargetDepartmentId,
  isMoving,
  departmentId,
  allDepartments,
}) => {
  if (!movingMember) return null;

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
            <div className="flex items-center gap-2 text-purple-400">
              <ArrowRightLeft className="w-4 h-4" />
              <h3 className="font-bold text-white text-sm">
                Move {movingMember.user?.name || movingMember.name || 'Member'}
              </h3>
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
              <label className="block text-slate-300 font-medium mb-1.5">Destination Department</label>
              <select
                required
                value={targetDepartmentId}
                onChange={(e) => setTargetDepartmentId(e.target.value)}
                className="w-full bg-[#0F1115] border border-[#2A303D] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#B8FF3B]"
              >
                <option value="">-- Choose Target Department --</option>
                {allDepartments
                  .filter((d) => d.id !== departmentId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
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
                disabled={!targetDepartmentId || isMoving}
                className="px-4 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold disabled:opacity-40 transition cursor-pointer flex items-center gap-1.5"
              >
                {isMoving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                <span>Move Member</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
