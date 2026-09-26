import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, Users, Plus, ArrowRightLeft, UserMinus, Search, Check } from 'lucide-react';
import { Team, User } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { RoleBadge } from '../common/RoleBadge';
import { EmptyState } from '../common/EmptyState';

interface TeamDetailsModalProps {
  team: Team | null;
  onClose: () => void;
  users: User[];
  teams: Team[];
  canManageTeams: boolean;
  getTeamMembers: (team: Team) => User[];
  onOpenAddMembers: () => void;
  onOpenChangeLead: () => void;
  onOpenMoveMember: (member: User) => void;
  onRemoveMember: (userId: string, userName: string) => void;
}

export const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({
  team,
  onClose,
  users,
  teams,
  canManageTeams,
  getTeamMembers,
  onOpenAddMembers,
  onOpenChangeLead,
  onOpenMoveMember,
  onRemoveMember,
}) => {
  return (
    <AnimatePresence>
      {team && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-2xl p-6 shadow-2xl z-10 space-y-5 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: team.color || '#7C3AED' }}
                  />
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {team.name}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono">
                    {getTeamMembers(team).length} Members
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
                  {team.description || 'Department team'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Team Lead Section */}
            <div className="p-4 rounded-2xl bg-[#111827] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const lead = users.find((u) => u.id === team.lead_id);
                  return (
                    <>
                      <UserAvatar name={lead?.name} avatar={lead?.avatar} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{lead?.name || 'Unassigned Lead'}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1 font-bold">
                            <Crown className="w-3 h-3 text-amber-400" />
                            Team Lead
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{lead?.email || 'No email assigned'}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {canManageTeams && (
                <button
                  onClick={onOpenChangeLead}
                  className="px-3 py-1.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Change Team Lead</span>
                </button>
              )}
            </div>

            {/* Members List Section Header */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-semibold text-white">Department Members</h4>
                <span className="text-xs text-slate-500 font-mono">
                  ({getTeamMembers(team).length})
                </span>
              </div>

              {canManageTeams && (
                <button
                  onClick={onOpenAddMembers}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Members</span>
                </button>
              )}
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto pr-1 divide-y divide-white/[0.04] space-y-1">
              {getTeamMembers(team).length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Members Yet"
                  description={`${team.name} has no members assigned. Add colleagues to start collaborating.`}
                  actionLabel={canManageTeams ? 'Add Members' : undefined}
                  onAction={onOpenAddMembers}
                  size="compact"
                />
              ) : (
                getTeamMembers(team).map((member) => {
                  const isLead = member.id === team.lead_id;
                  return (
                    <div
                      key={member.id}
                      className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-800/30 px-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={member.name} avatar={member.avatar} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-xs truncate">{member.name}</span>
                            <RoleBadge role={member.role} />
                            {isLead && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase font-bold">
                                Lead
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{member.email}</p>
                        </div>
                      </div>

                      {canManageTeams && (
                        <div className="flex items-center gap-2 shrink-0">
                          {teams.length > 1 && (
                            <button
                              onClick={() => onOpenMoveMember(member)}
                              title="Move to another team"
                              className="px-2.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-300 hover:text-white text-[11px] border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                              <span>Move</span>
                            </button>
                          )}

                          <button
                            onClick={() => onRemoveMember(member.id, member.name)}
                            title="Remove from team"
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[11px] border border-red-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/[0.08] flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
