import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const LeaveRequestsTable: React.FC<{
  leaves: any[];
  currentRole: string;
  currentUser: any;
  handleReviewLeave: (leaveId: string, decision: 'approved' | 'rejected') => void;
  loadData: () => void;
}> = ({ leaves, currentRole, currentUser, handleReviewLeave, loadData }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-950/60 text-slate-400 border-b border-white/10 uppercase text-[10px] tracking-wider">
          <tr>
            <th className="p-3.5">Employee</th>
            <th className="p-3.5">Type</th>
            <th className="p-3.5">Duration</th>
            <th className="p-3.5">Reason</th>
            <th className="p-3.5">Status</th>
            {(currentRole === 'admin' || (currentUser as any)?.role === 'lead') && <th className="p-3.5 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {leaves.map((l) => (
            <tr key={l.id} className="hover:bg-white/[0.02] transition">
              <td className="p-3.5 font-medium text-slate-100">
                {l.user?.name || 'Team Member'}
              </td>
              <td className="p-3.5 capitalize">{l.leaveType}</td>
              <td className="p-3.5">
                {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                <span className="ml-2 text-slate-500">({l.daysCount}d)</span>
              </td>
              <td className="p-3.5 text-slate-400 max-w-xs truncate">{l.reason}</td>
              <td className="p-3.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    l.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : l.status === 'rejected'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}
                >
                  {l.status}
                </span>
              </td>
              {(currentRole === 'admin' || (currentUser as any)?.role === 'lead') && (
                <td className="p-3.5 text-right">
                  {l.status === 'pending' ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleReviewLeave(l.id, 'approved')}
                        className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition cursor-pointer"
                        title="Approve"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleReviewLeave(l.id, 'rejected')}
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                        title="Reject"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18l12-12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[11px]">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
          {leaves.length === 0 && (
            <tr>
              <td colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <svg className="w-6 h-6 text-slate-600" strokeWidth={1.5} />
                  <p className="text-xs font-semibold text-slate-400">No Leave Requests Yet</p>
                  <p className="text-[11px] text-slate-500">Submit a leave request to get approval from your manager.</p>
                  <button
                    onClick={() => { /* request leave */ }}
                    className="mt-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Request Leave
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};