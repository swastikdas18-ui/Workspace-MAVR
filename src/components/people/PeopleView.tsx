import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api, getFrontendUrl } from '../../lib/api';
import { WorkspaceInvite } from '../../types';
import { PeopleViewHeader } from './PeopleViewHeader';
import { PeopleSubTabNav } from './PeopleSubTabNav';
import { PeopleTabContent } from './PeopleTabContent';
import { PeopleModalsContainer } from './PeopleModalsContainer';

import { usePeopleData } from './usePeopleData';
import { usePeopleActions } from './usePeopleActions';
import { useDepartmentManagement } from './useDepartmentManagement';
import { filterProfiles } from './peopleHelpers';

export const PeopleView: React.FC = () => {
  const { 
    currentUser, currentRole, currentWorkspace, addToast,
    permissions, users, teams, inviteMember, invites, loadInvites,
    removeWorkspaceMember, projects, tasks
  } = useWorkspace();

  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'departments' | 'invitations' | 'leaves' | 'attendance'>('directory');

  // Modal State
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<WorkspaceInvite | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [inviteStatusFilter, setInviteStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'expired'>('all');
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  // Directory State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('');
  const [selectedEmploymentTypeFilter, setSelectedEmploymentTypeFilter] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
  const [removeConfirmName, setRemoveConfirmName] = useState('');
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [activeActionMenuUserId, setActiveActionMenuUserId] = useState<string | null>(null);
  const [isRequestLeaveModalOpen, setIsRequestLeaveModalOpen] = useState(false);

  // People Data
  const {
    profiles,
    departments,
    leaves,
    todayAttendance,
    setTodayAttendance,
    isCheckedIn,
    setIsCheckedIn,
    attendanceHistory,
    loadData,
  } = usePeopleData({
    currentRole,
    workspaceId: currentWorkspace?.id,
    loadInvites,
  });

  // People Actions
  const {
    handleCopyLink,
    handleRevokeInvite,
    handleCheckIn,
    handleCheckOut,
    handleReviewLeave,
  } = usePeopleActions({
    loadData,
    loadInvites,
    addToast,
    setCopiedToken,
    setRevokingInviteId,
    setIsCheckedIn,
    setTodayAttendance,
  });

  // Department Management
  const {
    deptSearchQuery,
    setDeptSearchQuery,
    targetReassignUser,
    setTargetReassignUser,
    isTransferModalOpen,
    setIsTransferModalOpen,
    selectedNewDeptId,
    setSelectedNewDeptId,
    isEditDepartmentModalOpen,
    setIsEditDepartmentModalOpen,
    editingDepartment,
    setEditingDepartment,
    selectedDepartmentDetails,
    setSelectedDepartmentDetails,
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
    handleTransferDepartmentSubmit,
  } = useDepartmentManagement({
    loadData,
    addToast,
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    try {
      await api.updateEmployeeProfile(selectedProfile.userId, {
        designation: selectedProfile.designation,
        departmentId: selectedProfile.departmentId || null,
        managerId: selectedProfile.managerId || null,
        employmentType: selectedProfile.employmentType,
        status: selectedProfile.status,
        bio: selectedProfile.bio,
        skills: selectedProfile.skills,
        location: selectedProfile.location,
        phone: selectedProfile.phone,
        emergencyContact: selectedProfile.emergencyContact,
      });
      addToast({ type: 'success', title: 'Profile Updated', message: 'Employee profile changes saved.' });
      setSelectedProfile(null);
      await loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update Failed', message: err.message || 'Failed to update profile.' });
    }
  };

  const filteredProfiles = filterProfiles(
    profiles,
    searchQuery,
    selectedDepartmentFilter,
    selectedEmploymentTypeFilter,
    departments
  );

  return (
    <div className="space-y-6">
      <PeopleViewHeader
        permissions={permissions}
        isCheckedIn={isCheckedIn}
        onOpenCreateTeam={() => setIsCreateTeamModalOpen(true)}
        onOpenInviteModal={() => {
          setGeneratedInvite(null);
          setIsInviteModalOpen(true);
        }}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onOpenRequestLeave={() => setIsRequestLeaveModalOpen(true)}
      />

      <PeopleSubTabNav
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        currentRole={currentRole}
        invites={invites}
        loadInvites={loadInvites}
      />

      <PeopleTabContent
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        currentRole={currentRole}
        currentUser={currentUser}
        permissions={permissions}
        invites={invites}
        inviteStatusFilter={inviteStatusFilter}
        setInviteStatusFilter={setInviteStatusFilter}
        teams={teams}
        onOpenInviteModal={() => {
          setGeneratedInvite(null);
          setIsInviteModalOpen(true);
        }}
        handleCopyLink={handleCopyLink}
        handleRevokeInvite={handleRevokeInvite}
        revokingInviteId={revokingInviteId}
        departments={departments}
        profiles={profiles}
        projects={projects}
        tasks={tasks}
        deptSearchQuery={deptSearchQuery}
        setDeptSearchQuery={setDeptSearchQuery}
        onOpenCreateTeam={() => setIsCreateTeamModalOpen(true)}
        setEditingDepartment={setEditingDepartment}
        setEditDeptName={setEditDeptName}
        setEditDeptDescription={setEditDeptDescription}
        setEditDeptColor={setEditDeptColor}
        setEditDeptHeadId={setEditDeptHeadId}
        setIsEditDepartmentModalOpen={setIsEditDepartmentModalOpen}
        setTargetReassignUser={setTargetReassignUser}
        setSelectedNewDeptId={setSelectedNewDeptId}
        setIsTransferModalOpen={setIsTransferModalOpen}
        setSelectedDepartmentDetails={setSelectedDepartmentDetails}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDepartmentFilter={selectedDepartmentFilter}
        setSelectedDepartmentFilter={setSelectedDepartmentFilter}
        selectedEmploymentTypeFilter={selectedEmploymentTypeFilter}
        setSelectedEmploymentTypeFilter={setSelectedEmploymentTypeFilter}
        filteredProfiles={filteredProfiles}
        activeActionMenuUserId={activeActionMenuUserId}
        setActiveActionMenuUserId={setActiveActionMenuUserId}
        setMemberToRemove={setMemberToRemove}
        setRemoveConfirmName={setRemoveConfirmName}
        setSelectedProfile={setSelectedProfile}
        leaves={leaves}
        setIsRequestLeaveModalOpen={setIsRequestLeaveModalOpen}
        handleReviewLeave={handleReviewLeave}
        isCheckedIn={isCheckedIn}
        todayAttendance={todayAttendance}
        attendanceHistory={attendanceHistory}
        handleCheckIn={handleCheckIn}
        handleCheckOut={handleCheckOut}
      />

      <PeopleModalsContainer
        isInviteModalOpen={isInviteModalOpen}
        setIsInviteModalOpen={setIsInviteModalOpen}
        loadInvites={loadInvites}
        addToast={addToast}
        users={users}
        teams={teams}
        generatedInvite={generatedInvite}
        setGeneratedInvite={setGeneratedInvite}
        copiedToken={copiedToken}
        setCopiedToken={setCopiedToken}
        isCreateTeamModalOpen={isCreateTeamModalOpen}
        setIsCreateTeamModalOpen={setIsCreateTeamModalOpen}
        loadData={loadData}
        isRequestLeaveModalOpen={isRequestLeaveModalOpen}
        setIsRequestLeaveModalOpen={setIsRequestLeaveModalOpen}
        memberToRemove={memberToRemove}
        setMemberToRemove={setMemberToRemove}
        removeConfirmName={removeConfirmName}
        setRemoveConfirmName={setRemoveConfirmName}
        activeActionMenuUserId={activeActionMenuUserId}
        setActiveActionMenuUserId={setActiveActionMenuUserId}
        removeWorkspaceMember={removeWorkspaceMember}
        isRemovingMember={isRemovingMember}
        setIsRemovingMember={setIsRemovingMember}
        selectedProfile={selectedProfile}
        setSelectedProfile={setSelectedProfile}
        handleUpdateProfile={handleUpdateProfile}
        currentRole={currentRole}
        departments={departments}
        profiles={profiles}
        isEditDepartmentModalOpen={isEditDepartmentModalOpen}
        setIsEditDepartmentModalOpen={setIsEditDepartmentModalOpen}
        editingDepartment={editingDepartment}
        setEditingDepartment={setEditingDepartment}
        editDeptName={editDeptName}
        setEditDeptName={setEditDeptName}
        editDeptDescription={editDeptDescription}
        setEditDeptDescription={setEditDeptDescription}
        editDeptColor={editDeptColor}
        setEditDeptColor={setEditDeptColor}
        editDeptHeadId={editDeptHeadId}
        setEditDeptHeadId={setEditDeptHeadId}
        handleUpdateDepartmentSubmit={handleUpdateDepartmentSubmit}
        handleDeleteDepartment={handleDeleteDepartment}
        isTransferModalOpen={isTransferModalOpen}
        setIsTransferModalOpen={setIsTransferModalOpen}
        targetReassignUser={targetReassignUser}
        setTargetReassignUser={setTargetReassignUser}
        selectedNewDeptId={selectedNewDeptId}
        setSelectedNewDeptId={setSelectedNewDeptId}
        handleTransferDepartmentSubmit={handleTransferDepartmentSubmit}
        selectedDepartmentDetails={selectedDepartmentDetails}
        setSelectedDepartmentDetails={setSelectedDepartmentDetails}
      />
    </div>
  );
};
