import React, { useState } from 'react';
import { api } from '../../lib/api';

export const LeaveRequestModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  loadData: () => void;
  addToast: any;
}> = ({ isOpen, setIsOpen, loadData, addToast }) => {
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'annual',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.requestLeave(leaveForm);
      addToast({ type: 'success', title: 'Leave Requested', message: 'Your leave request has been submitted to your manager.' });
      setIsOpen(false);
      setLeaveForm({
        leaveType: 'annual',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        reason: '',
      });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Submission Failed', message: err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative bg-[#0F172A] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-semibold text-slate-100">Submit Leave Request</h3>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18l12-12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Leave Type</label>
            <select
              value={leaveForm.leaveType}
              onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="annual">Annual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Reason for Leave</label>
            <textarea
              rows={3}
              placeholder="Provide context for manager review..."
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition shadow-lg shadow-purple-500/20"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};