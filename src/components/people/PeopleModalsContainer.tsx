import React from 'react';
import { InviteMemberModal } from './InviteMemberModal';
import { CreateTeamModal } from './CreateTeamModal';
import { LeaveRequestModal } from './LeaveRequestModal';
import { RemoveMemberConfirmModal } from './RemoveMemberConfirmModal';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { EditDepartmentModal } from './EditDepartmentModal';
import { TransferDepartmentModal } from './TransferDepartmentModal';
import { DepartmentDetailsModal } from './DepartmentDetailsModal';
import { WorkspaceInvite, User, Team } from '../../types';

interface PeopleModalsContainerProps {
  isInviteModalOpen: boolean;
  setIsInviteModalOpen: (open: boolean) => void;
  loadInvites: () => void;
  addToast: any;
  users: User[];
  teams: Team[];
  generatedInvite: WorkspaceInvite | null;
  setGeneratedInvite: (inv: WorkspaceInvite | null) => void;
  copiedToken: boolean;
  setCopiedToken: (c: boolean) => void;
  isCreateTeamModalOpen: boolean;
  setIsCreateTeamModalOpen: (open: boolean) => void;
  loadData: () => Promise<void>;
  isRequestLeaveModalOpen: boolean;
  setIsRequestLeaveModalOpen: (open: boolean) => void;
  memberToRemove: any;
  setMemberToRemove: (m: any) => void;
  removeConfirmName: string;
  setRemoveConfirmName: (name: string) => void;
  activeActionMenuUserId: string | null;
  setActiveActionMenuUserId: (id: string | null) => void;
  removeWorkspaceMember: any;
  isRemovingMember: boolean;
  setIsRemovingMember: (r: boolean) => void;
  selectedProfile: any;
  setSelectedProfile: (p: any) => void;
  handleUpdateProfile: (e: React.FormEvent) => void;
  currentRole: string;
  departments: any[];
  profiles: any[];
  isEditDepartmentModalOpen: boolean;
  setIsEditDepartmentModalOpen: (open: boolean) => void;
  editingDepartment: any;
  setEditingDepartment: (d: any) => void;
  editDeptName: string;
  setEditDeptName: (n: string) => void;
  editDeptDescription: string;
  setEditDeptDescription: (d: string) => void;
  editDeptColor: string;
  setEditDeptColor: (c: string) => void;
  editDeptHeadId: string;
  setEditDeptHeadId: (id: string) => void;
  handleUpdateDepartmentSubmit: (e: React.FormEvent) => void;
  handleDeleteDepartment: (id: string, name: string) => void;
  isTransferModalOpen: boolean;
  setIsTransferModalOpen: (open: boolean) => void;
  targetReassignUser: any;
  setTargetReassignUser: (u: any) => void;
  selectedNewDeptId: string;
  setSelectedNewDeptId: (id: string) => void;
  handleTransferDepartmentSubmit: (e: React.FormEvent) => void;
  selectedDepartmentDetails: any;
  setSelectedDepartmentDetails: (d: any) => void;
}

export const PeopleModalsContainer: React.FC<PeopleModalsContainerProps> = ({
  isInviteModalOpen,
  setIsInviteModalOpen,
  loadInvites,
  addToast,
  users,
  teams,
  generatedInvite,
  setGeneratedInvite,
  copiedToken,
  setCopiedToken,
  isCreateTeamModalOpen,
  setIsCreateTeamModalOpen,
  loadData,
  isRequestLeaveModalOpen,
  setIsRequestLeaveModalOpen,
  memberToRemove,
  setMemberToRemove,
  removeConfirmName,
  setRemoveConfirmName,
  activeActionMenuUserId,
  setActiveActionMenuUserId,
  removeWorkspaceMember,
  isRemovingMember,
  setIsRemovingMember,
  selectedProfile,
  setSelectedProfile,
  handleUpdateProfile,
  currentRole,
  departments,
  profiles,
  isEditDepartmentModalOpen,
  setIsEditDepartmentModalOpen,
  editingDepartment,
  setEditingDepartment,
  editDeptName,
  setEditDeptName,
  editDeptDescription,
  setEditDeptDescription,
  editDeptColor,
  setEditDeptColor,
  editDeptHeadId,
  setEditDeptHeadId,
  handleUpdateDepartmentSubmit,
  handleDeleteDepartment,
  isTransferModalOpen,
  setIsTransferModalOpen,
  targetReassignUser,
  setTargetReassignUser,
  selectedNewDeptId,
  setSelectedNewDeptId,
  handleTransferDepartmentSubmit,
  selectedDepartmentDetails,
  setSelectedDepartmentDetails,
}) => {
  return (
    <>
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        setIsOpen={setIsInviteModalOpen}
        loadInvites={loadInvites}
        addToast={addToast}
        users={users}
        teams={teams}
        generatedInvite={generatedInvite}
        setGeneratedInvite={setGeneratedInvite}
        copiedToken={copiedToken}
        setCopiedToken={setCopiedToken}
      />

      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        setIsOpen={setIsCreateTeamModalOpen}
        loadData={loadData}
        addToast={addToast}
        users={users}
      />

      <LeaveRequestModal
        isOpen={isRequestLeaveModalOpen}
        setIsOpen={setIsRequestLeaveModalOpen}
        loadData={loadData}
        addToast={addToast}
      />

      <RemoveMemberConfirmModal
        isOpen={!!memberToRemove}
        setIsOpen={(open) => !open && setMemberToRemove(null)}
        memberToRemove={memberToRemove}
        setMemberToRemove={setMemberToRemove}
        removeConfirmName={removeConfirmName}
        setRemoveConfirmName={setRemoveConfirmName}
        activeActionMenuUserId={activeActionMenuUserId}
        setActiveActionMenuUserId={setActiveActionMenuUserId}
        removeWorkspaceMember={removeWorkspaceMember}
        loadData={loadData}
        addToast={addToast}
        isRemovingMember={isRemovingMember}
        setIsRemovingMember={setIsRemovingMember}
      />

      <EmployeeProfileModal
        selectedProfile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onSubmit={handleUpdateProfile}
        setSelectedProfile={setSelectedProfile}
        currentRole={currentRole}
        departments={departments}
        profiles={profiles}
      />

      <EditDepartmentModal
        isOpen={isEditDepartmentModalOpen}
        onClose={() => {
          setIsEditDepartmentModalOpen(false);
          setEditingDepartment(null);
        }}
        editingDepartment={editingDepartment}
        editDeptName={editDeptName}
        setEditDeptName={setEditDeptName}
        editDeptDescription={editDeptDescription}
        setEditDeptDescription={setEditDeptDescription}
        editDeptColor={editDeptColor}
        setEditDeptColor={setEditDeptColor}
        editDeptHeadId={editDeptHeadId}
        setEditDeptHeadId={setEditDeptHeadId}
        profiles={profiles}
        onSubmit={handleUpdateDepartmentSubmit}
        onDelete={handleDeleteDepartment}
      />

      <TransferDepartmentModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTargetReassignUser(null);
        }}
        targetReassignUser={targetReassignUser}
        setTargetReassignUser={setTargetReassignUser}
        selectedNewDeptId={selectedNewDeptId}
        setSelectedNewDeptId={setSelectedNewDeptId}
        profiles={profiles}
        departments={departments}
        onSubmit={handleTransferDepartmentSubmit}
      />

      {selectedDepartmentDetails && (
        <DepartmentDetailsModal
          department={selectedDepartmentDetails}
          isOpen={!!selectedDepartmentDetails}
          onClose={() => setSelectedDepartmentDetails(null)}
          onDepartmentUpdated={async () => {
            await loadData();
            const updated = departments.find((d) => d.id === selectedDepartmentDetails.id);
            if (updated) setSelectedDepartmentDetails(updated);
          }}
          allDepartments={departments}
          allProfiles={profiles}
        />
      )}
    </>
  );
};
