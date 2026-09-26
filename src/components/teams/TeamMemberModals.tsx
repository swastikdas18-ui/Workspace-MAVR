import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Search, Check, Crown } from 'lucide-react';
import { Team, User } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { RoleBadge } from '../common/RoleBadge';

interface AddTeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  users: User[];
  getTeamMembers: (team: Team) => User[];
  selectedUserIdsToAdd: string[];
  setSelectedUserIdsToAdd: React.Dispatch<React.SetStateAction<string[]>>;
  memberSearchQuery: string;
  setMemberSearchQuery: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const AddTeamMembersModal: React.FC<AddTeamMembersModalProps> = ({
  isOpen,
  onClose,
  team,
  users,
  getTeamMembers,
  selectedUserIdsToAdd,
  setSelectedUserIdsToAdd,
  memberSearchQuery,
  setMemberSearchQuery,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen || !team) return null;

  const currentMemberIds = new Set(getTeamMembers(team).map((m) => m.id));
  const eligible = users
    .filter((u) => !currentMemberIds.has(u.id))
    .filter((u) => {
      if (!memberSearchQuery) return true;
      const q = memberSearchQuery.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 space-y-4 max-h-[85vh] flex flex-col"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div>
              <h3 className="text-base font-bold text-white">Add Members to {team.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Select workspace members to assign to this department.</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter available members by name or email..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full bg-[#111827] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <form onSubmit={onSubmit} className="flex-1 flex flex-col space-y-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] pr-1 space-y-1">
              {eligible.length === 0 ? (
                <div className="p-8 text-center bg-[#111827]/50 rounded-2xl border border-white/[0.04]">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">No eligible members available</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    All workspace members are already assigned to this team, or match the search filter.
                  </p>
                </div>
              ) : (
                eligible.map((u) => {
                  const isSelected = selectedUserIdsToAdd.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUserIdsToAdd((prev) =>
                          isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                        );
                      }}
                      className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-purple-500/15 border border-purple-500/40 text-white'
                          : 'hover:bg-slate-800/40 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-xs truncate">{u.name}</span>
                            <RoleBadge role={u.role} />
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                            : 'border-white/[0.2] bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {selectedUserIdsToAdd.length} selected
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedUserIdsToAdd.length === 0 || isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Adding...' : `Add ${selectedUserIdsToAdd.length} Member${selectedUserIdsToAdd.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface MoveTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  memberToMove: User | null;
  teams: Team[];
  targetMoveTeamId: string;
  setTargetMoveTeamId: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  getTeamMembers: (team: Team) => User[];
}

export const MoveTeamMemberModal: React.FC<MoveTeamMemberModalProps> = ({
  isOpen,
  onClose,
  team,
  memberToMove,
  teams,
  targetMoveTeamId,
  setTargetMoveTeamId,
  onSubmit,
  isSubmitting,
  getTeamMembers,
}) => {
  if (!isOpen || !team || !memberToMove) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h3 className="text-base font-bold text-white">Transfer Team Member</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-[#111827] border border-white/[0.08] flex items-center gap-3">
            <UserAvatar name={memberToMove.name} avatar={memberToMove.avatar} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-xs truncate">{memberToMove.name}</span>
                <RoleBadge role={memberToMove.role} />
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">{memberToMove.email}</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Destination Department</label>
              <select
                value={targetMoveTeamId}
                onChange={(e) => setTargetMoveTeamId(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {teams
                  .filter((t) => t.id !== team.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({getTeamMembers(t).length} members)
                    </option>
                  ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-slate-300 text-[11px] leading-relaxed">
              Transferring will immediately remove <span className="text-white font-semibold">{memberToMove.name}</span> from <span className="text-white font-semibold">{team.name}</span> and add them to the selected destination team.
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
                disabled={isSubmitting || !targetMoveTeamId}
                className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface ChangeTeamLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  users: User[];
  selectedNewLeadId: string;
  setSelectedNewLeadId: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const ChangeTeamLeadModal: React.FC<ChangeTeamLeadModalProps> = ({
  isOpen,
  onClose,
  team,
  users,
  selectedNewLeadId,
  setSelectedNewLeadId,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen || !team) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Assign Team Lead</span>
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Select Workspace Member</label>
              <select
                value={selectedNewLeadId}
                onChange={(e) => setSelectedNewLeadId(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.toUpperCase()}) - {u.email}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              The selected member will be designated as the formal lead for <span className="text-white font-semibold">{team.name}</span> and added to the team roster if not already present.
            </p>

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
                disabled={isSubmitting || !selectedNewLeadId}
                className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Updating...' : 'Assign Lead'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
