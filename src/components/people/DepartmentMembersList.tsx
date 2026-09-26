import React from 'react';
import { motion } from 'motion/react';
import { Crown, UserMinus, ArrowRightLeft } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

interface DepartmentMembersListProps {
  filteredMembers: any[];
  department: any;
  isAdmin: boolean;
  busyMemberId: string | null;
  onPromoteLead: (member: any) => void;
  onStartMove: (member: any) => void;
  onRemoveMember: (member: any) => void;
}

export const DepartmentMembersList: React.FC<DepartmentMembersListProps> = ({
  filteredMembers,
  department,
  isAdmin,
  busyMemberId,
  onPromoteLead,
  onStartMove,
  onRemoveMember,
}) => {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {filteredMembers.map((member) => {
        const targetUserId = member.userId || member.user?.id;
        const name = member.user?.name || member.name || (member.user?.email ? member.user.email.split('@')[0] : 'Member');
        const email = member.user?.email || member.email || '';
        const role = (member.user?.role || member.role || 'employee').toLowerCase();
        const isLead = member.departmentPosition === 'lead' || department.headId === targetUserId;
        const isBusy = busyMemberId === targetUserId;

        return (
          <motion.div
            key={targetUserId || member.id}
            layout
            className="p-3.5 rounded-xl bg-[#171A21] border border-[#2A303D] hover:border-slate-700 transition flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <UserAvatar name={name} avatar={member.user?.avatar} size="md" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-white text-xs truncate">{name}</h4>
                  {isLead ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Crown className="w-3 h-3 text-amber-400" />
                      Department Lead
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-white/5">
                      Member
                    </span>
                  )}
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-400 border border-white/5">
                    {role}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                  <span className="text-slate-300 font-medium">{member.designation || 'Team Member'}</span>
                  <span>•</span>
                  <span className="truncate">{email}</span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onPromoteLead(member)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                    isLead
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title={isLead ? 'Demote Lead' : 'Promote to Lead'}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{isLead ? 'Lead' : 'Promote'}</span>
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onStartMove(member)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                  title="Move to another department"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Move</span>
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRemoveMember(member)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition cursor-pointer flex items-center gap-1"
                  title="Remove from department"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
