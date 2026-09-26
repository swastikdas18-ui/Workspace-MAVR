import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { UserRole, WorkspaceInvite, Team, User } from '../../types';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { DirectoryMetricsCards } from './DirectoryMetricsCards';
import { getFrontendUrl } from '../../lib/api';
import { TeamDirectoryTable } from './TeamDirectoryTable';
import { DepartmentCardsGrid } from './DepartmentCardsGrid';
import { PendingInvitesSection } from './PendingInvitesSection';
import { TeamsModalsContainer } from './TeamsModalsContainer';

export const TeamsView: React.FC = () => {
  const { 
    teams, users, currentUser, currentRole, permissions, 
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

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!activeSelectedTeam) return;
    if (window.confirm(`Are you sure you want to remove ${userName} from ${activeSelectedTeam.name}?`)) {
      await removeTeamMember(activeSelectedTeam.id, userId);
    }
  };

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

  const employeeCount = users.filter(u => u.role === 'employee').length;
  const internCount = users.filter(u => u.role === 'intern').length;
  const pendingInvites = (invites || []).filter(
    (inv: any) => !inv.accepted_at && !inv.acceptedAt
  );

  return (
    <div className="space-y-6">
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
      <DirectoryMetricsCards
        totalUsers={users.length}
        totalTeams={teams.length}
        employeeCount={employeeCount}
        internCount={internCount}
        pendingInvitesCount={pendingInvites.length}
      />

      {/* Department Cards Grid */}
      <DepartmentCardsGrid
        visibleTeams={visibleTeams}
        users={users}
        canManageTeams={permissions.teams.manageTeams}
        getTeamMembers={getTeamMembers}
        onSelectTeam={setSelectedTeam}
        onOpenCreateTeam={() => setIsCreateTeamModalOpen(true)}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
      />

      {/* Pending Workspace Invites */}
      {currentRole === 'admin' && (
        <PendingInvitesSection pendingInvites={pendingInvites} onCopyLink={handleCopyLink} />
      )}

      {/* Complete Directory Table */}
      <TeamDirectoryTable users={users} teams={teams} />

      {/* Modals Container */}
      <TeamsModalsContainer
        activeSelectedTeam={activeSelectedTeam}
        onCloseSelectedTeam={() => setSelectedTeam(null)}
        users={users}
        teams={teams}
        canManageTeams={permissions.teams.manageTeams}
        getTeamMembers={getTeamMembers}
        setSelectedUserIdsToAdd={setSelectedUserIdsToAdd}
        setIsAddMembersModalOpen={setIsAddMembersModalOpen}
        setSelectedNewLeadId={setSelectedNewLeadId}
        setIsChangeLeadModalOpen={setIsChangeLeadModalOpen}
        setMemberToMove={setMemberToMove}
        setTargetMoveTeamId={setTargetMoveTeamId}
        setIsMoveMemberModalOpen={setIsMoveMemberModalOpen}
        onRemoveMember={handleRemoveMember}
        isAddMembersModalOpen={isAddMembersModalOpen}
        selectedUserIdsToAdd={selectedUserIdsToAdd}
        memberSearchQuery={memberSearchQuery}
        setMemberSearchQuery={setMemberSearchQuery}
        onAddMembersSubmit={handleAddMembersSubmit}
        isSubmitting={isSubmitting}
        isMoveMemberModalOpen={isMoveMemberModalOpen}
        memberToMove={memberToMove}
        targetMoveTeamId={targetMoveTeamId}
        onMoveMemberSubmit={handleMoveMemberSubmit}
        isChangeLeadModalOpen={isChangeLeadModalOpen}
        selectedNewLeadId={selectedNewLeadId}
        onChangeLeadSubmit={handleChangeLeadSubmit}
        isInviteModalOpen={isInviteModalOpen}
        setIsInviteModalOpen={setIsInviteModalOpen}
        setGeneratedInvite={setGeneratedInvite}
        onInviteSubmit={handleInviteSubmit}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        inviteRole={inviteRole}
        setInviteRole={setInviteRole}
        inviteTeamId={inviteTeamId}
        setInviteTeamId={setInviteTeamId}
        generatedInvite={generatedInvite}
        copiedToken={copiedToken}
        onCopyLink={handleCopyLink}
        isInviting={isInviting}
        isCreateTeamModalOpen={isCreateTeamModalOpen}
        setIsCreateTeamModalOpen={setIsCreateTeamModalOpen}
        onCreateTeamSubmit={handleCreateTeamSubmit}
        teamName={teamName}
        setTeamName={setTeamName}
        teamDescription={teamDescription}
        setTeamDescription={setTeamDescription}
        teamColor={teamColor}
        setTeamColor={setTeamColor}
        teamLeadId={teamLeadId}
        setTeamLeadId={setTeamLeadId}
      />
    </div>
  );
};
