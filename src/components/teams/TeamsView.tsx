import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { UserRole, WorkspaceInvite, Team, User } from '../../types';
import { 
  Users, Plus, Mail, Shield, Briefcase, GraduationCap, 
  UserPlus, CheckCircle2, ChevronRight, X, Copy, Check, Link2, Clock,
  FolderKanban, Sparkles, UserMinus, ArrowRightLeft, Crown, Settings2,
  Trash2, Search
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { MetricCard } from '../common/MetricCard';
import { EmptyState } from '../common/EmptyState';
import { UserAvatar } from '../common/UserAvatar';
import { RoleBadge } from '../common/RoleBadge';
import { PendingInviteBadge } from './PendingInviteBadge';
import { getFrontendUrl } from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';

export const TeamsView: React.FC = () => {
  const { 
    teams, users, projects, currentUser, currentRole, permissions, 
    createTeam, inviteMember, invites, loadInvites, searchQuery, addToast,
    addTeamMembers, removeTeamMember, moveTeamMember, setTeamLead
  } = useWorkspace();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  
  // Team Details & Management Modal State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [selectedUserIdsToAdd, setSelectedUserIdsToAdd] = useState<string[]>([]);
  const [isMoveMemberModalOpen, setIsMoveMemberModalOpen] = useState(false);
  const [memberToMove, setMemberToMove] = useState<User | null>(null);
  const [targetMoveTeamId, setTargetMoveTeamId] = useState<string>('');
  const [isChangeLeadModalOpen, setIsChangeLeadModalOpen] = useState(false);
  const [selectedNewLeadId, setSelectedNewLeadId] = useState<string>('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  // Keep selectedTeam synced with latest teams array
  const activeSelectedTeam = selectedTeam ? teams.find((t) => t.id === selectedTeam.id) || selectedTeam : null;

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
    const inviteUrl = getFrontendUrl(`/invite/${token}`);
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

  // Helper to get members of a team
  const getTeamMembers = (team: Team) => {
    return users.filter(
      (u) =>
        u.team_id === team.id ||
        (u as any).teamId === team.id ||
        ((team as any).members && (team as any).members.includes(u.id)) ||
        ((team as any).memberIds && (team as any).memberIds.includes(u.id)) ||
        ((team as any).member_ids && (team as any).member_ids.includes(u.id))
    );
  };

  // Helper to get workspace members NOT in this team
  const getEligibleMembersToAdd = (team: Team) => {
    const currentMemberIds = new Set(getTeamMembers(team).map((m) => m.id));
    return users.filter((u) => !currentMemberIds.has(u.id));
  };

  // Handle Add Members
  const handleAddMembersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedTeam || selectedUserIdsToAdd.length === 0) return;
    setIsSubmitting(true);
    const success = await addTeamMembers(activeSelectedTeam.id, selectedUserIdsToAdd);
    setIsSubmitting(false);
    if (success) {
      setIsAddMembersModalOpen(false);
      setSelectedUserIdsToAdd([]);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!activeSelectedTeam) return;
    if (window.confirm(`Are you sure you want to remove ${userName} from ${activeSelectedTeam.name}?`)) {
      await removeTeamMember(activeSelectedTeam.id, userId);
    }
  };

  // Handle Move Member
  const handleMoveMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedTeam || !memberToMove || !targetMoveTeamId) return;
    setIsSubmitting(true);
    const success = await moveTeamMember(activeSelectedTeam.id, targetMoveTeamId, memberToMove.id);
    setIsSubmitting(false);
    if (success) {
      setIsMoveMemberModalOpen(false);
      setMemberToMove(null);
      setTargetMoveTeamId('');
    }
  };

  // Handle Change Team Lead
  const handleChangeLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedTeam || !selectedNewLeadId) return;
    setIsSubmitting(true);
    const success = await setTeamLead(activeSelectedTeam.id, selectedNewLeadId);
    setIsSubmitting(false);
    if (success) {
      setIsChangeLeadModalOpen(false);
      setSelectedNewLeadId('');
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const employeeCount = users.filter(u => u.role === 'employee').length;
  const internCount = users.filter(u => u.role === 'intern').length;
  const pendingInvites = (invites || []).filter(
    (inv: any) => !inv.accepted_at && !inv.acceptedAt
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={currentRole === 'admin' ? 'Organization Directory & Teams' : 'Collaborators & Teams'}
        description={
          currentRole === 'admin'
            ? 'Departmental taxonomy, team membership management, and member directory.'
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
          sparklineData={[0, 0, 0, 0, 0, 0, users.length]}
        />
        <MetricCard
          label="Employees"
          value={employeeCount}
          icon={Briefcase}
          color="blue"
          trend={{ value: 'Full Access', direction: 'neutral', label: 'operational' }}
          sparklineData={[0, 0, 0, 0, 0, 0, employeeCount]}
        />
        <MetricCard
          label="Learning Sandbox"
          value={internCount}
          icon={GraduationCap}
          color="emerald"
          trend={{ value: 'Onboarding', direction: 'neutral', label: 'mentored' }}
          sparklineData={[0, 0, 0, 0, 0, 0, internCount]}
        />
        <MetricCard
          label="Pending Invitations"
          value={pendingInvites.length}
          icon={Mail}
          color="amber"
          trend={{ value: `${pendingInvites.length} unaccepted`, direction: 'neutral', label: 'invites' }}
          sparklineData={[0, 0, 0, 0, 0, 0, pendingInvites.length]}
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
              const members = getTeamMembers(team);

              return (
                <motion.div
                  key={team.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSelectedTeam(team)}
                  className="ui-card-interactive p-5 flex flex-col justify-between group cursor-pointer"
                >
                  {/* Card Header: Team Name, Color Dot & Count Badge */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.04]">
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
                      {members.length} {members.length === 1 ? 'Member' : 'Members'}
                    </span>
                  </div>

                  {/* Card Content: Description & Lead Card */}
                  <div className="py-3 flex-1 space-y-3">
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {team.description || 'Department team'}
                    </p>

                    {/* Team Lead Card */}
                    <div className="p-3 rounded-xl bg-[#0F172A] border border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar name={lead?.name} avatar={lead?.avatar} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{lead?.name || 'Assigned Lead'}</p>
                          <p className="text-[10px] text-slate-400 truncate">{lead?.title || 'Department Lead'}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" />
                        Lead
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Manage Link & Member Avatars */}
                  <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-400 group-hover:text-purple-300 font-medium">
                      <span>Manage Team</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {members.slice(0, 5).map((m) => (
                        <UserAvatar key={m.id} name={m.name} avatar={m.avatar} size="xs" />
                      ))}
                      {members.length > 5 && (
                        <span className="w-5 h-5 rounded-full bg-slate-800 border border-white/[0.1] text-[9px] flex items-center justify-center text-slate-300 font-mono">
                          +{members.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Pending Workspace Invites (Admin view) */}
      {currentRole === 'admin' && pendingInvites.length > 0 && (
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
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{user.title || 'Team Member'}</td>
                    <td className="py-3.5 px-4">
                      {userTeam ? (
                        <span className="text-slate-300 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: userTeam.color }} />
                          {userTeam.name}
                        </span>
                      ) : (
                        <span className="text-slate-500">Unassigned</span>
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

      {/* ========================================================================= */}
      {/* TEAM DETAILS MODAL / PAGE */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeSelectedTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTeam(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-2xl p-6 shadow-2xl z-10 space-y-5 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: activeSelectedTeam.color || '#7C3AED' }}
                    />
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {activeSelectedTeam.name}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono">
                      {getTeamMembers(activeSelectedTeam).length} Members
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
                    {activeSelectedTeam.description || 'Department team'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Team Lead Section */}
              <div className="p-4 rounded-2xl bg-[#111827] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const lead = users.find((u) => u.id === activeSelectedTeam.lead_id);
                    return (
                      <>
                        <UserAvatar name={lead?.name} avatar={lead?.avatar} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{lead?.name || 'Unassigned Lead'}</h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1 font-bold">
                              <Crown className="w-3 h-3 text-amber-400" />
                              Team Lead
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{lead?.email || 'No email assigned'}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {permissions.teams.manageTeams && (
                  <button
                    onClick={() => {
                      setSelectedNewLeadId(activeSelectedTeam.lead_id || '');
                      setIsChangeLeadModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Change Team Lead</span>
                  </button>
                )}
              </div>

              {/* Members List Section Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-semibold text-white">Department Members</h4>
                  <span className="text-xs text-slate-500 font-mono">
                    ({getTeamMembers(activeSelectedTeam).length})
                  </span>
                </div>

                {permissions.teams.manageTeams && (
                  <button
                    onClick={() => {
                      setSelectedUserIdsToAdd([]);
                      setIsAddMembersModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Members</span>
                  </button>
                )}
              </div>

              {/* Members List */}
              <div className="flex-1 overflow-y-auto pr-1 divide-y divide-white/[0.04] space-y-1">
                {getTeamMembers(activeSelectedTeam).length === 0 ? (
                  <div className="p-8 text-center bg-[#111827]/50 rounded-2xl border border-white/[0.04]">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-300">No members in this team yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Click "Add Members" above to assign colleagues.</p>
                  </div>
                ) : (
                  getTeamMembers(activeSelectedTeam).map((member) => {
                    const isLead = member.id === activeSelectedTeam.lead_id;
                    return (
                      <div
                        key={member.id}
                        className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-800/30 px-3 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar name={member.name} avatar={member.avatar} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-xs truncate">{member.name}</span>
                              <RoleBadge role={member.role} />
                              {isLead && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase font-bold">
                                  Lead
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono truncate">{member.email}</p>
                          </div>
                        </div>

                        {permissions.teams.manageTeams && (
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Move Member Button */}
                            {teams.length > 1 && (
                              <button
                                onClick={() => {
                                  setMemberToMove(member);
                                  const otherTeams = teams.filter((t) => t.id !== activeSelectedTeam.id);
                                  setTargetMoveTeamId(otherTeams[0]?.id || '');
                                  setIsMoveMemberModalOpen(true);
                                }}
                                title="Move to another team"
                                className="px-2.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-300 hover:text-white text-[11px] border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                                <span>Move</span>
                              </button>
                            )}

                            {/* Remove Member Button */}
                            <button
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              title="Remove from team"
                              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[11px] border border-red-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-white/[0.08] flex justify-end">
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ADD MEMBERS MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddMembersModalOpen && activeSelectedTeam && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddMembersModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div>
                  <h3 className="text-base font-bold text-white">Add Members to {activeSelectedTeam.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Select workspace members to assign to this department.</p>
                </div>
                <button
                  onClick={() => setIsAddMembersModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter available members by name or email..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Available Members List */}
              <form onSubmit={handleAddMembersSubmit} className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] pr-1 space-y-1">
                  {(() => {
                    const eligible = getEligibleMembersToAdd(activeSelectedTeam).filter((u) => {
                      if (!memberSearchQuery) return true;
                      const q = memberSearchQuery.toLowerCase();
                      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                    });

                    if (eligible.length === 0) {
                      return (
                        <div className="p-8 text-center bg-[#111827]/50 rounded-2xl border border-white/[0.04]">
                          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-white">No eligible members available</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            All workspace members are already assigned to this team, or match the search filter.
                          </p>
                        </div>
                      );
                    }

                    return eligible.map((u) => {
                      const isSelected = selectedUserIdsToAdd.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedUserIdsToAdd((prev) =>
                              isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-500/15 border border-purple-500/40 text-white'
                              : 'hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white text-xs truncate">{u.name}</span>
                                <RoleBadge role={u.role} />
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                                : 'border-white/[0.2] bg-transparent'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedUserIdsToAdd.length} selected
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsAddMembersModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={selectedUserIdsToAdd.length === 0 || isSubmitting}
                      className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Adding...' : `Add ${selectedUserIdsToAdd.length} Member${selectedUserIdsToAdd.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MOVE MEMBER MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isMoveMemberModalOpen && activeSelectedTeam && memberToMove && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoveMemberModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-base font-bold text-white">Transfer Team Member</h3>
                <button onClick={() => setIsMoveMemberModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-[#111827] border border-white/[0.08] flex items-center gap-3">
                <UserAvatar name={memberToMove.name} avatar={memberToMove.avatar} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs truncate">{memberToMove.name}</span>
                    <RoleBadge role={memberToMove.role} />
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{memberToMove.email}</p>
                </div>
              </div>

              <form onSubmit={handleMoveMemberSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Destination Department</label>
                  <select
                    value={targetMoveTeamId}
                    onChange={(e) => setTargetMoveTeamId(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {teams
                      .filter((t) => t.id !== activeSelectedTeam.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({getTeamMembers(t).length} members)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-slate-300 text-[11px] leading-relaxed">
                  Transferring will immediately remove <span className="text-white font-semibold">{memberToMove.name}</span> from <span className="text-white font-semibold">{activeSelectedTeam.name}</span> and add them to the selected destination team.
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsMoveMemberModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !targetMoveTeamId}
                    className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* CHANGE TEAM LEAD MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isChangeLeadModalOpen && activeSelectedTeam && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChangeLeadModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Assign Team Lead</span>
                </h3>
                <button onClick={() => setIsChangeLeadModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleChangeLeadSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Select Workspace Member</label>
                  <select
                    value={selectedNewLeadId}
                    onChange={(e) => setSelectedNewLeadId(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.toUpperCase()}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The selected member will be designated as the formal lead for <span className="text-white font-semibold">{activeSelectedTeam.name}</span> and added to the team roster if not already present.
                </p>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsChangeLeadModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedNewLeadId}
                    className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Updating...' : 'Assign Lead'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* INVITE MEMBER MODAL */}
      {/* ========================================================================= */}
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
                        value={getFrontendUrl(`/invite/${generatedInvite.token}`)}
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
                      <option value="admin">Administrator (Full Access & Organization Management)</option>
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

      {/* ========================================================================= */}
      {/* CREATE TEAM MODAL */}
      {/* ========================================================================= */}
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

