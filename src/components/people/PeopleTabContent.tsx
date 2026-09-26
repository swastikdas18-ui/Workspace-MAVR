import React from 'react';
import { InvitationsSubTab } from './InvitationsSubTab';
import { DepartmentsSubTab } from './DepartmentsSubTab';
import { DirectorySubTab } from './DirectorySubTab';
import { LeavesSubTab } from './LeavesSubTab';
import { AttendanceSubTab } from './AttendanceSubTab';
import { WorkspaceInvite, Team, User } from '../../types';

interface PeopleTabContentProps {
  activeSubTab: 'directory' | 'departments' | 'invitations' | 'leaves' | 'attendance';
  setActiveSubTab: (tab: 'directory' | 'departments' | 'invitations' | 'leaves' | 'attendance') => void;
  currentRole: string;
  currentUser: User | null;
  permissions: any;
  invites: WorkspaceInvite[];
  inviteStatusFilter: 'all' | 'pending' | 'accepted' | 'expired';
  setInviteStatusFilter: (status: 'all' | 'pending' | 'accepted' | 'expired') => void;
  teams: Team[];
  onOpenInviteModal: () => void;
  handleCopyLink: (token: string) => void;
  handleRevokeInvite: (id: string) => void;
  revokingInviteId: string | null;
  departments: any[];
  profiles: any[];
  projects: any[];
  tasks: any[];
  deptSearchQuery: string;
  setDeptSearchQuery: (q: string) => void;
  onOpenCreateTeam: () => void;
  setEditingDepartment: (dept: any) => void;
  setEditDeptName: (name: string) => void;
  setEditDeptDescription: (desc: string) => void;
  setEditDeptColor: (col: string) => void;
  setEditDeptHeadId: (id: string) => void;
  setIsEditDepartmentModalOpen: (open: boolean) => void;
  setTargetReassignUser: (u: any) => void;
  setSelectedNewDeptId: (id: string) => void;
  setIsTransferModalOpen: (open: boolean) => void;
  setSelectedDepartmentDetails: (dept: any) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedDepartmentFilter: string;
  setSelectedDepartmentFilter: (deptId: string) => void;
  selectedEmploymentTypeFilter: string;
  setSelectedEmploymentTypeFilter: (type: string) => void;
  filteredProfiles: any[];
  activeActionMenuUserId: string | null;
  setActiveActionMenuUserId: (id: string | null) => void;
  setMemberToRemove: (prof: any) => void;
  setRemoveConfirmName: (name: string) => void;
  setSelectedProfile: (prof: any) => void;
  leaves: any[];
  setIsRequestLeaveModalOpen: (open: boolean) => void;
  handleReviewLeave: (id: string, decision: 'approved' | 'rejected') => void;
  isCheckedIn: boolean;
  todayAttendance: any | null;
  attendanceHistory: any[];
  handleCheckIn: () => void;
  handleCheckOut: () => void;
}

export const PeopleTabContent: React.FC<PeopleTabContentProps> = ({
  activeSubTab,
  setActiveSubTab,
  currentRole,
  currentUser,
  permissions,
  invites,
  inviteStatusFilter,
  setInviteStatusFilter,
  teams,
  onOpenInviteModal,
  handleCopyLink,
  handleRevokeInvite,
  revokingInviteId,
  departments,
  profiles,
  projects,
  tasks,
  deptSearchQuery,
  setDeptSearchQuery,
  onOpenCreateTeam,
  setEditingDepartment,
  setEditDeptName,
  setEditDeptDescription,
  setEditDeptColor,
  setEditDeptHeadId,
  setIsEditDepartmentModalOpen,
  setTargetReassignUser,
  setSelectedNewDeptId,
  setIsTransferModalOpen,
  setSelectedDepartmentDetails,
  searchQuery,
  setSearchQuery,
  selectedDepartmentFilter,
  setSelectedDepartmentFilter,
  selectedEmploymentTypeFilter,
  setSelectedEmploymentTypeFilter,
  filteredProfiles,
  activeActionMenuUserId,
  setActiveActionMenuUserId,
  setMemberToRemove,
  setRemoveConfirmName,
  setSelectedProfile,
  leaves,
  setIsRequestLeaveModalOpen,
  handleReviewLeave,
  isCheckedIn,
  todayAttendance,
  attendanceHistory,
  handleCheckIn,
  handleCheckOut,
}) => {
  if (activeSubTab === 'invitations') {
    return (
      <InvitationsSubTab
        invites={invites}
        inviteStatusFilter={inviteStatusFilter}
        setInviteStatusFilter={setInviteStatusFilter}
        teams={teams}
        permissions={permissions}
        onOpenInviteModal={onOpenInviteModal}
        handleCopyLink={handleCopyLink}
        handleRevokeInvite={handleRevokeInvite}
        revokingInviteId={revokingInviteId}
      />
    );
  }

  if (activeSubTab === 'departments') {
    return (
      <DepartmentsSubTab
        departments={departments}
        profiles={profiles}
        projects={projects}
        tasks={tasks}
        deptSearchQuery={deptSearchQuery}
        setDeptSearchQuery={setDeptSearchQuery}
        permissions={permissions}
        onOpenCreateTeam={onOpenCreateTeam}
        onEditDepartment={(dept) => {
          setEditingDepartment(dept);
          setEditDeptName(dept.name || '');
          setEditDeptDescription(dept.description || '');
          setEditDeptColor(dept.color || '#7C3AED');
          setEditDeptHeadId(dept.headId || dept.head?.id || '');
          setIsEditDepartmentModalOpen(true);
        }}
        onAssignMember={(dept) => {
          setTargetReassignUser(profiles.find((p) => p.departmentId !== dept.id) || profiles[0]);
          setSelectedNewDeptId(dept.id);
          setIsTransferModalOpen(true);
        }}
        onManageMembers={(dept) => setSelectedDepartmentDetails(dept)}
        onViewDirectory={() => setActiveSubTab('directory')}
      />
    );
  }

  if (activeSubTab === 'directory') {
    return (
      <DirectorySubTab
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDepartmentFilter={selectedDepartmentFilter}
        setSelectedDepartmentFilter={setSelectedDepartmentFilter}
        selectedEmploymentTypeFilter={selectedEmploymentTypeFilter}
        setSelectedEmploymentTypeFilter={setSelectedEmploymentTypeFilter}
        departments={departments}
        filteredProfiles={filteredProfiles}
        currentRole={currentRole}
        currentUser={currentUser}
        activeActionMenuUserId={activeActionMenuUserId}
        setActiveActionMenuUserId={setActiveActionMenuUserId}
        onOpenRemoveMember={(prof) => {
          setMemberToRemove(prof);
          setRemoveConfirmName('');
          setActiveActionMenuUserId(null);
        }}
        onViewProfile={(prof) => setSelectedProfile(prof)}
        permissions={permissions}
        onOpenInviteModal={onOpenInviteModal}
      />
    );
  }

  if (activeSubTab === 'leaves') {
    return (
      <LeavesSubTab
        leaves={leaves}
        currentRole={currentRole}
        currentUser={currentUser}
        onOpenRequestModal={() => setIsRequestLeaveModalOpen(true)}
        onReviewLeave={handleReviewLeave}
      />
    );
  }

  if (activeSubTab === 'attendance') {
    return (
      <AttendanceSubTab
        isCheckedIn={isCheckedIn}
        todayAttendance={todayAttendance}
        attendanceHistory={attendanceHistory}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
      />
    );
  }

  return null;
};
