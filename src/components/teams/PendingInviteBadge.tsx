import React from 'react';
import { Mail } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface PendingInviteBadgeProps {
  count?: number;
  className?: string;
  showIcon?: boolean;
}

export const PendingInviteBadge: React.FC<PendingInviteBadgeProps> = ({
  count: propCount,
  className = '',
  showIcon = true,
}) => {
  const { invites, currentRole } = useWorkspace();

  if (currentRole !== 'admin') {
    return null;
  }

  const effectiveCount =
    propCount !== undefined
      ? propCount
      : (invites || []).filter(
          (inv: any) => !inv.accepted_at && !inv.acceptedAt
        ).length;

  if (effectiveCount <= 0) {
    return null;
  }

  return (
    <div
      id="pending-invite-badge"
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm ${className}`}
    >
      {showIcon && <Mail className="w-3.5 h-3.5" />}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
      </span>
      <span className="font-mono">{effectiveCount} Pending</span>
    </div>
  );
};
