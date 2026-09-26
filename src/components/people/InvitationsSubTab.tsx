import React from 'react';
import { motion } from 'motion/react';
import { Building2, Calendar, Copy, Trash2, Mail, UserPlus } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface InvitationsSubTabProps {
  invites: any[];
  inviteStatusFilter: 'all' | 'pending' | 'accepted' | 'expired';
  setInviteStatusFilter: (status: 'all' | 'pending' | 'accepted' | 'expired') => void;
  teams: any[];
  permissions: any;
  onOpenInviteModal: () => void;
  handleCopyLink: (token: string) => void;
  handleRevokeInvite: (id: string) => void;
  revokingInviteId: string | null;
}

export const InvitationsSubTab: React.FC<InvitationsSubTabProps> = ({
  invites,
  inviteStatusFilter,
  setInviteStatusFilter,
  teams,
  permissions,
  onOpenInviteModal,
  handleCopyLink,
  handleRevokeInvite,
  revokingInviteId,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-[#171A21] border border-[#2A303D] rounded-xl text-xs">
          {(['all', 'pending', 'accepted', 'expired'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setInviteStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                inviteStatusFilter === st
                  ? 'bg-[#B8FF3B]/15 text-[#B8FF3B] border border-[#B8FF3B]/30 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}{' '}
              {st !== 'all' &&
                `(${
                  invites.filter((inv) => {
                    const now = new Date();
                    const isExp = inv.expires_at ? new Date(inv.expires_at) < now : false;
                    const computedStatus = inv.accepted_at ? 'accepted' : isExp ? 'expired' : inv.status || 'pending';
                    return computedStatus === st;
                  }).length
                })`}
            </button>
          ))}
        </div>

        {permissions?.teams?.inviteMembers && (
          <button
            onClick={onOpenInviteModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invites
          .filter((inv) => {
            if (inviteStatusFilter === 'all') return true;
            const now = new Date();
            const isExp = inv.expires_at ? new Date(inv.expires_at) < now : false;
            const computedStatus = inv.accepted_at ? 'accepted' : isExp ? 'expired' : inv.status || 'pending';
            return computedStatus === inviteStatusFilter;
          })
          .map((inv) => {
            const now = new Date();
            const isExp = inv.expires_at ? new Date(inv.expires_at) < now : false;
            const computedStatus = inv.accepted_at ? 'accepted' : isExp ? 'expired' : inv.status || 'pending';
            const matchedTeam = teams.find((t) => t.id === inv.team_id);

            return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-emerald-500/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-2">
                      <h4 className="font-semibold text-slate-100 text-sm truncate">{inv.email}</h4>
                      <p className="text-xs text-emerald-400 capitalize mt-0.5 font-medium">Role: {inv.role}</p>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        computedStatus === 'accepted'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : computedStatus === 'expired'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}
                    >
                      {computedStatus}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                    {matchedTeam && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Department: <strong className="text-slate-200">{matchedTeam.name}</strong>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {computedStatus === 'accepted'
                          ? `Accepted: ${inv.accepted_at ? new Date(inv.accepted_at).toLocaleDateString() : 'Yes'}`
                          : `Expires: ${new Date(inv.expires_at).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopyLink(inv.token)}
                    className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-purple-400" />
                    <span>Copy Invite Link</span>
                  </button>

                  {computedStatus !== 'accepted' && permissions?.teams?.manageTeams && (
                    <button
                      disabled={revokingInviteId === inv.id}
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 font-medium flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{revokingInviteId === inv.id ? 'Revoking...' : 'Revoke'}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
      </div>

      {invites.length === 0 && (
        <EmptyState
          icon={Mail}
          title="No Pending Invitations"
          description="Invite team members by email to provision workspace access. Generated invitation tokens expire after 7 days."
          actionLabel={permissions?.teams?.manageTeams ? 'Invite Member' : undefined}
          onAction={onOpenInviteModal}
          actionIcon={UserPlus}
          secondaryLabel="Copy Invite Link"
          onSecondaryAction={onOpenInviteModal}
          secondaryIcon={Copy}
          size="compact"
        />
      )}
    </div>
  );
};
