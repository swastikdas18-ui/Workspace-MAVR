import React from 'react';
import { Mail, Copy } from 'lucide-react';
import { PendingInviteBadge } from './PendingInviteBadge';
import { RoleBadge } from '../common/RoleBadge';
import { UserRole } from '../../types';

interface PendingInvitesSectionProps {
  pendingInvites: any[];
  onCopyLink: (token: string) => void;
}

export const PendingInvitesSection: React.FC<PendingInvitesSectionProps> = ({
  pendingInvites,
  onCopyLink,
}) => {
  if (pendingInvites.length === 0) return null;

  return (
    <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">Active Cryptographic Invite Tokens</h3>
        </div>
        <PendingInviteBadge count={pendingInvites.length} />
      </div>

      <div className="divide-y divide-white/[0.04] text-xs">
        {pendingInvites.map((inv) => (
          <div key={inv.id} className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{inv.email}</span>
                <RoleBadge role={inv.role as UserRole} />
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Token: {inv.token.substring(0, 16)}...
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopyLink(inv.token)}
                className="px-3.5 py-1.5 rounded-xl bg-[#0F172A] hover:bg-[#7C3AED] hover:text-white text-slate-200 text-xs flex items-center gap-1.5 border border-white/[0.08] transition-all cursor-pointer shadow-sm"
              >
                <Copy className="w-3.5 h-3.5 text-purple-400" />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
