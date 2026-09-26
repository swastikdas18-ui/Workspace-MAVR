import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const RemoveMemberConfirmModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  memberToRemove: any;
  setMemberToRemove: (val: any) => void;
  removeConfirmName: string;
  setRemoveConfirmName: (name: string) => void;
  activeActionMenuUserId: string | null;
  setActiveActionMenuUserId: (val: string | null) => void;
  removeWorkspaceMember: (id: string) => Promise<boolean>;
  loadData: () => void;
  addToast: any;
  isRemovingMember: boolean;
  setIsRemovingMember: (val: boolean) => void;
}> = ({
  isOpen, setIsOpen, memberToRemove, setMemberToRemove,
  removeConfirmName, setRemoveConfirmName,
  activeActionMenuUserId, setActiveActionMenuUserId,
  removeWorkspaceMember, loadData, addToast,
  isRemovingMember, setIsRemovingMember
}) => {
  const targetName = memberToRemove.user?.name || memberToRemove.name || (memberToRemove.user?.email ? memberToRemove.user.email.split('@')[0] : 'Member');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUserId = memberToRemove.userId || memberToRemove.user?.id || memberToRemove.id;
    setIsRemovingMember(true);
    try {
      const ok = await removeWorkspaceMember(targetUserId);
      if (ok) {
        setMemberToRemove(null);
        setRemoveConfirmName('');
        setActiveActionMenuUserId(null);
        addToast({
          type: 'info',
          title: 'Member Removed',
          message: `Member "${targetName}" was removed from the workspace.`,
        });
        loadData();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Remove Member',
        message: err.message || 'An error occurred while removing the member.',
      });
    } finally {
      setIsRemovingMember(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="relative bg-[#171A21] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-rose-400">
            <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18M6 6l12 12" />
            </svg>
            <h3 className="font-bold text-slate-100 text-base">Remove Member</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setMemberToRemove(null);
              setRemoveConfirmName('');
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
            <p className="text-rose-200 font-medium leading-relaxed">
              This action will permanently revoke access for <strong className="text-white font-bold">{targetName}</strong>.
            </p>
            <ul className="list-disc list-inside text-rose-300/80 space-y-1 text-[11px]">
              <li>Revokes all workspace permissions and roles</li>
              <li>Unassigns from all projects and departments</li>
              <li>Immediately terminates all active sessions</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <label className="block text-slate-300 font-medium">
              Type <span className="font-bold text-white select-all">"{targetName}"</span> to confirm:
            </label>
            <input
              type="text"
              required
              value={removeConfirmName}
              onChange={(e) => setRemoveConfirmName(e.target.value)}
              placeholder={targetName}
              autoFocus
              className="w-full bg-[#111827] border border-white/10 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none transition text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setMemberToRemove(null);
                setRemoveConfirmName('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
          >
            Cancel
          </button>

            <button
              type="submit"
              disabled={!removeConfirmName.trim().toLowerCase() === targetName.trim().toLowerCase() || isRemovingMember}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-600/20"
            >
              {isRemovingMember ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v5h.582m-15.356-2A8.001 8.001 0 005.582 21m0 0H15" /></svg>
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                  </svg>
                  <span>Remove Member</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};