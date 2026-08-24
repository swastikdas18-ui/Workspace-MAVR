import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { UserRole, WorkspaceInvite } from '../../types';
import { 
  Users, Plus, Mail, Shield, Briefcase, GraduationCap, 
  UserPlus, CheckCircle2, ChevronRight, X, Copy, Check, Link2, Clock,
  FolderKanban, Sparkles
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { MetricCard } from '../common/MetricCard';
import { EmptyState } from '../common/EmptyState';
import { UserAvatar } from '../common/UserAvatar';
import { RoleBadge } from '../common/RoleBadge';
import { motion, AnimatePresence } from 'motion/react';

export const TeamsView: React.FC = () => {
  const { 
    teams, users, projects, currentUser, currentRole, permissions, 
    createTeam, inviteMember, invites, loadInvites, searchQuery, addToast
  } = useWorkspace();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  
  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('employee');
  const [inviteTeamId, setInviteTeamId] = useState<string>(teams[0]?.id || '');
  const [generatedInvite, setGeneratedInvite] = useState<WorkspaceInvite | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Create Team Form State
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#7C3AED');
  const [teamLeadId, setTeamLeadId] = useState<string>(currentUser?.id || '');

  useEffect(() => {
    if (currentRole === 'admin') {
      loadInvites();
    }
  }, [currentRole]);

  // Filter teams
  const visibleTeams = teams.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    const invite = await inviteMember(inviteEmail, inviteRole, inviteTeamId);
    setIsInviting(false);
    if (invite) {
      setGeneratedInvite(invite);
    }
  };

  const handleCopyLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(true);
    addToast({
      type: 'success',
      title: 'Invite Link Copied',
      message: 'Workspace invitation URL copied to clipboard.',
    });
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createTeam({
      name: teamName,
      description: teamDescription,
      lead_id: teamLeadId,
      color: teamColor
    });
    if (success) {
      setIsCreateTeamModalOpen(false);
      setTeamName('');
      setTeamDescription('');
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const employeeCount = users.filter(u => u.role === 'employee').length;
  const internCount = users.filter(u => u.role === 'intern').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={currentRole === 'admin' ? 'Organization Directory & Teams' : 'Collaborators & Teams'}
        description={
          currentRole === 'admin'
            ? 'Departmental taxonomy, cryptographic invite provisioning, and member directory.'
            : 'Collaborate with your team peers, department leads, and cross-functional partners.'
        }
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-white/[0.08]">
            {users.length} Active Members
          </span>
        }
        actions={
          permissions.teams.inviteMembers && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreateTeamModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-[#1E293B] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
              >
                <span>Create Team</span>
              </button>

              <button
                onClick={() => {
                  setGeneratedInvite(null);
                  setIsInviteModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            </div>
          )
        }
      />

      {/* Directory Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Workspace Size"
          value={users.length}
          icon={Users}
          color="purple"
          trend={{ value: `${teams.length} departments`, direction: 'neutral', label: 'structured' }}
          sparklineData={[12, 14, 15, 18, 20, 22, 25]}
        />
        <MetricCard
          label="Employees"
          value={employeeCount}
          icon={Briefcase}
          color="blue"
          trend={{ value: 'Full Access', direction: 'neutral', label: 'operational' }}
          sparklineData={[8, 10, 11, 12, 14, 15, 17]}
        />
        <MetricCard
          label="Learning Sandbox"
          value={internCount}
          icon={GraduationCap}
          color="emerald"
          trend={{ value: 'Onboarding', direction: 'neutral', label: 'mentored' }}
          sparklineData={[1, 2, 3, 4, 3, 5, 6]}
        />
        <MetricCard
          label="Pending Invitations"
          value={invites.length}
          icon={Mail}
          color="amber"
          trend={{ value: '7-Day Token', direction: 'neutral', label: 'awaiting join' }}
          sparklineData={[2, 3, 4, 2, 1, 3, 4]}
        />
      </div>

      {/* Department Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Functional Departments</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{visibleTeams.length} Teams</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visibleTeams.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-[#111827] rounded-2xl border border-white/[0.08]">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">No Teams Found</p>
              <p className="text-xs text-slate-400 mt-1">Create your first department team to organize members.</p>
            </div>
          ) : (
            visibleTeams.map((team) => {
              const lead = users.find((u) => u.id === team.lead_id);
              const members = users.filter((u) => u.teamId === team.id);

              return (
                <motion.div
                  key={team.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full shadow-sm"
                          style={{ backgroundColor: team.color || '#7C3AED' }}
                        />
                        <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                          {team.name}
                        </h4>
                      </div>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0F172A] border border-white/[0.06] text-slate-300 font-mono">
                        {members.length} Members
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 leading-relaxed line-clamp-2">
                      {team.description}
                    </p>

                    {/* Team Lead Card */}
                    <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04] mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar name={lead?.name} avatar={lead?.avatar} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{lead?.name || 'Assigned Lead'}</p>
                          <p className="text-[10px] text-slate-400 truncate">{lead?.title || 'Department Lead'}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase">
                        Lead
                      </span>
                    </div>
                  </div>

                  {/* Member Avatars Preview */}
                  <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px]">Department Roster:</span>
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {members.map((m) => (
                        <UserAvatar key={m.id} name={m.name} avatar={m.avatar} size="xs" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Pending Workspace Invites (Admin view) */}
      {currentRole === 'admin' && invites.length > 0 && (
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Active Cryptographic Invite Tokens</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{invites.length} Pending</span>
          </div>

          <div className="divide-y divide-white/[0.04] text-xs">
            {invites.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{inv.email}</span>
                    <RoleBadge role={inv.role} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    Token: {inv.token.substring(0, 16)}...
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(inv.token)}
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
      )}

      {/* Complete Directory Table */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0F172A]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Organization Member Roster</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{users.length} Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#0F172A]/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3.5 px-4">Member Name</th>
              <th className="py-3.5 px-4">Role Matrix</th>
              <th className="py-3.5 px-4">Role Title</th>
              <th className="py-3.5 px-4">Department Team</th>
              <th className="py-3.5 px-4">Enterprise Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-slate-300">
            {users.map((user) => {
              const userTeam = teams.find((t) => t.id === user.teamId);
              return (
                <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
                      <span className="font-semibold text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-medium">{user.title}</td>
                  <td className="py-3.5 px-4">
                    {userTeam ? (
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: userTeam.color }} />
                        {userTeam.name}
                      </span>
                    ) : (
                      <span className="text-slate-500">Executive</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{user.email}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsInviteModalOpen(false);
                setGeneratedInvite(null);
              }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-base font-semibold text-white">Generate Member Invitation</h3>
                <button 
                  onClick={() => {
                    setIsInviteModalOpen(false);
                    setGeneratedInvite(null);
                  }} 
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {generatedInvite ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
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
                        value={`${window.location.origin}/invite/${generatedInvite.token}`}
                        className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white font-mono text-[11px]"
                      />
                      <button
                        onClick={() => handleCopyLink(generatedInvite.token)}
                        className="px-3.5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setIsInviteModalOpen(false);
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
                <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
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
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="employee">Employee (Assigned Work, Projects & Teams)</option>
                      <option value="intern">Intern (Learning Sandbox, Mentored Tasks)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Assign to Department</label>
                    <select
                      value={inviteTeamId}
                      onChange={(e) => setInviteTeamId(e.target.value)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isInviting}
                      className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                    >
                      {isInviting ? 'Generating...' : 'Generate Invite Link'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Team Modal */}
      <AnimatePresence>
        {isCreateTeamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateTeamModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-base font-semibold text-white">Create Department Team</h3>
                <button onClick={() => setIsCreateTeamModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Infrastructure & Platform Engineering"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Mission & Domain</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Core scope and team deliverables..."
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Color Marker</label>
                    <input
                      type="color"
                      value={teamColor}
                      onChange={(e) => setTeamColor(e.target.value)}
                      className="w-full h-10 bg-[#111827] border border-white/[0.08] rounded-xl p-1 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Team Lead</label>
                    <select
                      value={teamLeadId}
                      onChange={(e) => setTeamLeadId(e.target.value)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsCreateTeamModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 cursor-pointer"
                  >
                    Create Department
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
