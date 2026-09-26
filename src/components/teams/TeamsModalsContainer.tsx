import React from 'react';
import { TeamDetailsModal } from './TeamDetailsModal';
import { AddTeamMembersModal, MoveTeamMemberModal, ChangeTeamLeadModal } from './TeamMemberModals';
import { InviteMemberModal, CreateTeamModal } from './TeamActionModals';
import { Team, User, WorkspaceInvite, UserRole } from '../../types';

interface TeamsModalsContainerProps {
  activeSelectedTeam: Team | null;
  onCloseSelectedTeam: () => void;
  users: User[];
  teams: Team[];
  canManageTeams: boolean;
  getTeamMembers: (team: Team) => User[];
  setSelectedUserIdsToAdd: React.Dispatch<React.SetStateAction<string[]>>;
  setIsAddMembersModalOpen: (open: boolean) => void;
  setSelectedNewLeadId: (id: string) => void;
  setIsChangeLeadModalOpen: (open: boolean) => void;
  setMemberToMove: (member: User | null) => void;
  setTargetMoveTeamId: (id: string) => void;
  setIsMoveMemberModalOpen: (open: boolean) => void;
  onRemoveMember: (userId: string, userName: string) => void;
  isAddMembersModalOpen: boolean;
  selectedUserIdsToAdd: string[];
  memberSearchQuery: string;
  setMemberSearchQuery: (v: string) => void;
  onAddMembersSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  isMoveMemberModalOpen: boolean;
  memberToMove: User | null;
  targetMoveTeamId: string;
  onMoveMemberSubmit: (e: React.FormEvent) => void;
  isChangeLeadModalOpen: boolean;
  selectedNewLeadId: string;
  onChangeLeadSubmit: (e: React.FormEvent) => void;
  isInviteModalOpen: boolean;
  setIsInviteModalOpen: (open: boolean) => void;
  setGeneratedInvite: (inv: WorkspaceInvite | null) => void;
  onInviteSubmit: (e: React.FormEvent) => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: UserRole;
  setInviteRole: (v: UserRole) => void;
  inviteTeamId: string;
  setInviteTeamId: (v: string) => void;
  generatedInvite: WorkspaceInvite | null;
  copiedToken: boolean;
  onCopyLink: (token: string) => void;
  isInviting: boolean;
  isCreateTeamModalOpen: boolean;
  setIsCreateTeamModalOpen: (open: boolean) => void;
  onCreateTeamSubmit: (e: React.FormEvent) => void;
  teamName: string;
  setTeamName: (v: string) => void;
  teamDescription: string;
  setTeamDescription: (v: string) => void;
  teamColor: string;
  setTeamColor: (v: string) => void;
  teamLeadId: string;
  setTeamLeadId: (v: string) => void;
}

export const TeamsModalsContainer: React.FC<TeamsModalsContainerProps> = ({
  activeSelectedTeam,
  onCloseSelectedTeam,
  users,
  teams,
  canManageTeams,
  getTeamMembers,
  setSelectedUserIdsToAdd,
  setIsAddMembersModalOpen,
  setSelectedNewLeadId,
  setIsChangeLeadModalOpen,
  setMemberToMove,
  setTargetMoveTeamId,
  setIsMoveMemberModalOpen,
  onRemoveMember,
  isAddMembersModalOpen,
  selectedUserIdsToAdd,
  memberSearchQuery,
  setMemberSearchQuery,
  onAddMembersSubmit,
  isSubmitting,
  isMoveMemberModalOpen,
  memberToMove,
  targetMoveTeamId,
  onMoveMemberSubmit,
  isChangeLeadModalOpen,
  selectedNewLeadId,
  onChangeLeadSubmit,
  isInviteModalOpen,
  setIsInviteModalOpen,
  setGeneratedInvite,
  onInviteSubmit,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviteTeamId,
  setInviteTeamId,
  generatedInvite,
  copiedToken,
  onCopyLink,
  isInviting,
  isCreateTeamModalOpen,
  setIsCreateTeamModalOpen,
  onCreateTeamSubmit,
  teamName,
  setTeamName,
  teamDescription,
  setTeamDescription,
  teamColor,
  setTeamColor,
  teamLeadId,
  setTeamLeadId,
}) => {
  return (
    <>
      <TeamDetailsModal
        team={activeSelectedTeam}
        onClose={onCloseSelectedTeam}
        users={users}
        teams={teams}
        canManageTeams={canManageTeams}
        getTeamMembers={getTeamMembers}
        onOpenAddMembers={() => {
          setSelectedUserIdsToAdd([]);
          setIsAddMembersModalOpen(true);
        }}
        onOpenChangeLead={() => {
          setSelectedNewLeadId(activeSelectedTeam?.lead_id || '');
          setIsChangeLeadModalOpen(true);
        }}
        onOpenMoveMember={(member) => {
          setMemberToMove(member);
          const otherTeams = teams.filter((t) => t.id !== activeSelectedTeam?.id);
          setTargetMoveTeamId(otherTeams[0]?.id || '');
          setIsMoveMemberModalOpen(true);
        }}
        onRemoveMember={onRemoveMember}
      />

      <AddTeamMembersModal
        isOpen={isAddMembersModalOpen}
        onClose={() => setIsAddMembersModalOpen(false)}
        team={activeSelectedTeam}
        users={users}
        getTeamMembers={getTeamMembers}
        selectedUserIdsToAdd={selectedUserIdsToAdd}
        setSelectedUserIdsToAdd={setSelectedUserIdsToAdd}
        memberSearchQuery={memberSearchQuery}
        setMemberSearchQuery={setMemberSearchQuery}
        onSubmit={onAddMembersSubmit}
        isSubmitting={isSubmitting}
      />

      <MoveTeamMemberModal
        isOpen={isMoveMemberModalOpen}
        onClose={() => setIsMoveMemberModalOpen(false)}
        team={activeSelectedTeam}
        memberToMove={memberToMove}
        teams={teams}
        targetMoveTeamId={targetMoveTeamId}
        setTargetMoveTeamId={setTargetMoveTeamId}
        onSubmit={onMoveMemberSubmit}
        isSubmitting={isSubmitting}
        getTeamMembers={getTeamMembers}
      />

      <ChangeTeamLeadModal
        isOpen={isChangeLeadModalOpen}
        onClose={() => setIsChangeLeadModalOpen(false)}
        team={activeSelectedTeam}
        users={users}
        selectedNewLeadId={selectedNewLeadId}
        setSelectedNewLeadId={setSelectedNewLeadId}
        onSubmit={onChangeLeadSubmit}
        isSubmitting={isSubmitting}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setGeneratedInvite(null);
        }}
        onSubmit={onInviteSubmit}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        inviteRole={inviteRole}
        setInviteRole={setInviteRole}
        inviteTeamId={inviteTeamId}
        setInviteTeamId={setInviteTeamId}
        generatedInvite={generatedInvite}
        copiedToken={copiedToken}
        onCopyLink={onCopyLink}
        isInviting={isInviting}
        teams={teams}
      />

      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onSubmit={onCreateTeamSubmit}
        teamName={teamName}
        setTeamName={setTeamName}
        teamDescription={teamDescription}
        setTeamDescription={setTeamDescription}
        teamColor={teamColor}
        setTeamColor={setTeamColor}
        teamLeadId={teamLeadId}
        setTeamLeadId={setTeamLeadId}
        users={users}
      />
    </>
  );
};
