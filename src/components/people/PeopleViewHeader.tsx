import React from 'react';
import { PageHeader } from '../common/PageHeader';
import { UserPlus, Clock, UserCheck, Calendar } from 'lucide-react';

interface PeopleViewHeaderProps {
  permissions: any;
  isCheckedIn: boolean;
  onOpenCreateTeam: () => void;
  onOpenInviteModal: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onOpenRequestLeave: () => void;
}

export const PeopleViewHeader: React.FC<PeopleViewHeaderProps> = ({
  permissions,
  isCheckedIn,
  onOpenCreateTeam,
  onOpenInviteModal,
  onCheckIn,
  onCheckOut,
  onOpenRequestLeave,
}) => {
  return (
    <PageHeader
      title="People OS"
      description="Manage employee directory, departments, member invitations, leave requests, and live attendance."
    >
      <div className="flex items-center gap-3">
        {permissions?.teams?.manageTeams && (
          <button
            onClick={onOpenCreateTeam}
            className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-[#1E293B] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
          >
            <span>Create Department</span>
          </button>
        )}

        {permissions?.teams?.inviteMembers && (
          <button
            onClick={onOpenInviteModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#B8FF3B] hover:bg-[#CCFF66] text-[#0F1115] text-xs font-bold shadow-md shadow-[#B8FF3B]/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Invite Member</span>
          </button>
        )}

        {isCheckedIn ? (
          <button
            onClick={onCheckOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            Check Out
          </button>
        ) : (
          <button
            onClick={onCheckIn}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#B8FF3B]/10 hover:bg-[#B8FF3B]/20 text-[#B8FF3B] border border-[#B8FF3B]/30 text-xs font-semibold transition cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Check In
          </button>
        )}

        <button
          onClick={onOpenRequestLeave}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#242936] hover:bg-[#2E3545] text-slate-200 border border-[#2A303D] text-xs font-semibold transition cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          Request Leave
        </button>
      </div>
    </PageHeader>
  );
};
