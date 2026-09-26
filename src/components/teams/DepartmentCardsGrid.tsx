import React from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, ChevronRight, Crown } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { UserAvatar } from '../common/UserAvatar';
import { Team, User } from '../../types';

interface DepartmentCardsGridProps {
  visibleTeams: Team[];
  users: User[];
  canManageTeams: boolean;
  getTeamMembers: (team: Team) => User[];
  onSelectTeam: (team: Team) => void;
  onOpenCreateTeam: () => void;
  onOpenInviteModal: () => void;
}

export const DepartmentCardsGrid: React.FC<DepartmentCardsGridProps> = ({
  visibleTeams,
  users,
  canManageTeams,
  getTeamMembers,
  onSelectTeam,
  onOpenCreateTeam,
  onOpenInviteModal,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span>Functional Departments</span>
        </h3>
        <span className="text-xs text-slate-400 font-mono">{visibleTeams.length} Teams</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {visibleTeams.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Users}
              title="No Teams Yet"
              description="Organize your workforce into functional departments. Each team can have a lead, members, and its own colour identity."
              actionLabel={canManageTeams ? 'Create First Team' : undefined}
              onAction={onOpenCreateTeam}
              secondaryLabel="Invite Members"
              onSecondaryAction={onOpenInviteModal}
              secondaryIcon={UserPlus}
            />
          </div>
        ) : (
          visibleTeams.map((team) => {
            const lead = users.find((u) => u.id === team.lead_id);
            const members = getTeamMembers(team);

            return (
              <motion.div
                key={team.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                onClick={() => onSelectTeam(team)}
                className="ui-card-interactive p-5 flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: team.color || '#7C3AED' }}
                    />
                    <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                      {team.name}
                    </h4>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0F172A] border border-white/[0.06] text-slate-300 font-mono">
                    {members.length} {members.length === 1 ? 'Member' : 'Members'}
                  </span>
                </div>

                <div className="py-3 flex-1 space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {team.description || 'Department team'}
                  </p>

                  <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar name={lead?.name} avatar={lead?.avatar} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{lead?.name || 'Assigned Lead'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{lead?.title || 'Department Lead'}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      Lead
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-[11px] text-purple-400 group-hover:text-purple-300 font-medium">
                    <span>Manage Team</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {members.slice(0, 5).map((m) => (
                      <UserAvatar key={m.id} name={m.name} avatar={m.avatar} size="xs" />
                    ))}
                    {members.length > 5 && (
                      <span className="w-5 h-5 rounded-full bg-slate-800 border border-white/[0.1] text-[9px] flex items-center justify-center text-slate-300 font-mono">
                        +{members.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
