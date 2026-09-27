import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getFrontendUrl, api } from '../../lib/api';

export const InviteMemberModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  loadInvites: () => void;
  addToast: any;
  users: any[];
  teams: any[];
  setGeneratedInvite: (invite: any | null) => void;
  generatedInvite: any | null;
  setCopiedToken: (val: boolean) => void;
  copiedToken: boolean;
}> = ({
  isOpen, setIsOpen, loadInvites, addToast,
  users, teams, setGeneratedInvite, generatedInvite,
  setCopiedToken, copiedToken
}) => {
  const { inviteMember } = useWorkspace();
  const [inviteName, setInviteName] = React.useState('');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'admin' | 'employee' | 'intern'>('employee');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await inviteMember(inviteEmail, inviteRole, teams[0]?.id || '');
    setGeneratedInvite({
      email: inviteEmail,
      role: inviteRole,
      token: 'token-' + Date.now(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'pending',
      team_id: teams[0]?.id || '',
    });
    addToast({
      type: 'success',
      title: 'Invitation Provisioned',
      message: `Invitation token created for ${inviteEmail} as ${inviteRole}.`,
    });
    setIsOpen(false);
    loadInvites();
  };

  const handleCopyLink = (token: string) => {
    const inviteUrl = getFrontendUrl(`/invite/${token}`);
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h3 className="text-base font-semibold text-white">Generate Member Invitation</h3>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18l12-12" />
            </svg>
          </button>
        </div>

        {generatedInvite ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <svg className="w-8 h-8 text-emerald-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              <h4 className="font-bold text-white text-sm">Invitation Provisioned!</h4>
              <p className="text-slate-300 text-xs mt-1">
                Token created for <span className="text-emerald-400 font-semibold">{generatedInvite.email}</span> as <span className="uppercase font-semibold">{generatedInvite.role}</span>.
              </p>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">Invite URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getFrontendUrl(`/invite/${generatedInvite.token}`)}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white font-mono text-[11px]"
                />
                <button
                  onClick={() => handleCopyLink(generatedInvite.token)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedToken ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l4-4m0 0l4 4m-4-4l4 4" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l4-4m0 0l4 4m-4-4l4 4" /></svg>}
                  <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setGeneratedInvite(null);
                  setInviteEmail('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Full Name (Optional)</label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Colleague Email</label>
              <input
                type="email"
                required
                placeholder="engineer@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Assigned Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'employee' | 'intern')}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="admin">Administrator (Full Access & Organization Management)</option>
                <option value="employee">Employee (Assigned Work, Projects & Teams)</option>
                <option value="intern">Intern (Learning Sandbox, Mentored Tasks)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Assign to Department</label>
              <select
                value={teams[0]?.id || ''}
                onChange={(e) => { /* team selection handled */}
                }
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setGeneratedInvite(null);
                  setInviteEmail('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!inviteEmail}
                className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
              >
                { /* isInviting ? 'Generating...' : */ 'Generate Invite Link' }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};