import { getFrontendUrl, api } from '../../lib/api';

interface UsePeopleActionsProps {
  loadData: () => Promise<void>;
  loadInvites: () => Promise<void>;
  addToast: (toast: any) => void;
  setCopiedToken: (val: boolean) => void;
  setRevokingInviteId: (id: string | null) => void;
  setIsCheckedIn: (val: boolean) => void;
  setTodayAttendance: (record: any) => void;
}

export function usePeopleActions({
  loadData,
  loadInvites,
  addToast,
  setCopiedToken,
  setRevokingInviteId,
  setIsCheckedIn,
  setTodayAttendance,
}: UsePeopleActionsProps) {
  const handleCopyLink = (token: string) => {
    const inviteUrl = getFrontendUrl(`/invite/${token}`);
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(true);
    addToast({ type: 'success', title: 'Invite Link Copied', message: 'Workspace invitation URL copied to clipboard.' });
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingInviteId(inviteId);
    try {
      await api.cancelInvite(inviteId);
      addToast({ type: 'success', title: 'Invitation Revoked', message: 'The invitation token was invalidated and deleted.' });
      await loadInvites();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Revocation Failed', message: err.message || 'Failed to revoke invitation.' });
    } finally {
      setRevokingInviteId(null);
    }
  };

  const handleCheckIn = async () => {
    try {
      const res = await api.checkInAttendance();
      setIsCheckedIn(true);
      setTodayAttendance(res.record);
      addToast({ type: 'success', title: 'Checked In', message: 'You are now marked present for today.' });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Check In Failed', message: err.message });
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await api.checkOutAttendance();
      setIsCheckedIn(false);
      setTodayAttendance(res.record);
      addToast({ type: 'success', title: 'Checked Out', message: 'Your attendance hours have been recorded.' });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Check Out Failed', message: err.message });
    }
  };

  const handleReviewLeave = async (leaveId: string, decision: 'approved' | 'rejected') => {
    try {
      if (decision === 'approved') {
        await api.approveLeaveRequest(leaveId);
        addToast({ type: 'success', title: 'Leave Approved', message: 'The leave request was approved and schedule updated.' });
      } else {
        await api.rejectLeaveRequest(leaveId);
        addToast({ type: 'info', title: 'Leave Rejected', message: 'The leave request was declined.' });
      }
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err.message });
    }
  };

  return {
    handleCopyLink,
    handleRevokeInvite,
    handleCheckIn,
    handleCheckOut,
    handleReviewLeave,
  };
}
