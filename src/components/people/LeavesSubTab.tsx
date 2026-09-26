import React from 'react';
import { LeaveRequestsTable } from './LeaveRequestsTable';

interface LeavesSubTabProps {
  leaves: any[];
  currentRole: string;
  currentUser: any;
  onOpenRequestModal: () => void;
  onReviewLeave: (leaveId: string, decision: 'approved' | 'rejected') => void;
}

export const LeavesSubTab: React.FC<LeavesSubTabProps> = ({
  leaves,
  currentRole,
  currentUser,
  onOpenRequestModal,
  onReviewLeave,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Leave Requests & Approvals</h3>
          <button
            onClick={onOpenRequestModal}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition cursor-pointer"
          >
            + Request Leave
          </button>
        </div>

        <LeaveRequestsTable
          leaves={leaves}
          currentRole={currentRole}
          currentUser={currentUser}
          handleReviewLeave={onReviewLeave}
          loadData={() => {}}
        />
      </div>
    </div>
  );
};
