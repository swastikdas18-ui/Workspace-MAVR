import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAvatar } from '../common/UserAvatar';
import { X } from 'lucide-react';

interface EmployeeProfileModalProps {
  selectedProfile: any | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setSelectedProfile: (profile: any) => void;
  currentRole: string;
  departments: any[];
  profiles: any[];
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  selectedProfile,
  onClose,
  onSubmit,
  setSelectedProfile,
  currentRole,
  departments,
  profiles,
}) => {
  if (!selectedProfile) return null;

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
          className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <UserAvatar name={selectedProfile.user?.name || 'Staff'} avatar={selectedProfile.user?.avatar} size="md" />
              <div>
                <h3 className="text-base font-semibold text-white">{selectedProfile.user?.name}</h3>
                <p className="text-xs text-slate-400">{selectedProfile.user?.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Designation / Title</label>
                <input
                  type="text"
                  disabled={currentRole !== 'admin'}
                  value={selectedProfile.designation || ''}
                  onChange={(e) => setSelectedProfile({ ...selectedProfile, designation: e.target.value })}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Department</label>
                <select
                  disabled={currentRole !== 'admin'}
                  value={selectedProfile.departmentId || ''}
                  onChange={(e) => setSelectedProfile({ ...selectedProfile, departmentId: e.target.value || null })}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-purple-500"
                >
                  <option value="">General Operations</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Reports To / Manager</label>
                <select
                  disabled={currentRole !== 'admin'}
                  value={selectedProfile.managerId || ''}
                  onChange={(e) => setSelectedProfile({ ...selectedProfile, managerId: e.target.value || null })}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-purple-500"
                >
                  <option value="">No Direct Manager (Top Level)</option>
                  {profiles
                    .filter((p) => p.userId !== selectedProfile.userId)
                    .map((p) => (
                      <option key={p.userId} value={p.userId}>
                        {p.user?.name} ({p.designation})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Employment Type</label>
                <select
                  disabled={currentRole !== 'admin'}
                  value={selectedProfile.employmentType || 'full_time'}
                  onChange={(e) => setSelectedProfile({ ...selectedProfile, employmentType: e.target.value })}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-purple-500"
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contractor">Contractor</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={selectedProfile.location || ''}
                  onChange={(e) => setSelectedProfile({ ...selectedProfile, location: e.target.value })}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g. San Francisco (Hybrid)"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Status</label>
                <select
                  disabled={currentRole !== 'admin'}
                  value={selectedProfile.status || 'active'}
                  onChange={(e) => setSelectedProfile({ ...selectedProfile, status: e.target.value })}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-purple-500"
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Bio / Profile Summary</label>
              <textarea
                rows={2}
                value={selectedProfile.bio || ''}
                onChange={(e) => setSelectedProfile({ ...selectedProfile, bio: e.target.value })}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                placeholder="Short bio and responsibilities..."
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
              >
                Close
              </button>
              {currentRole === 'admin' && (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 cursor-pointer"
                >
                  Save Changes
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
