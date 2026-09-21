import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api, getFrontendUrl } from '../../lib/api';
import { UserRole, WorkspaceInvite } from '../../types';
import { 
  Users, Building2, GitBranch, Calendar, Clock, Target, Award,
  Search, Plus, CheckCircle2, XCircle, AlertCircle, MapPin, 
  Mail, Phone, Shield, ArrowRight, UserCheck, UserX, Star,
  TrendingUp, RefreshCw, ChevronDown, Check, X, Sparkles, Filter,
  UserPlus, Copy, Send, Trash2, MoreVertical, UserMinus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MetricCard } from '../common/MetricCard';
import { UserAvatar } from '../common/UserAvatar';
import { PageHeader } from '../common/PageHeader';
import { DepartmentDetailsModal } from './DepartmentDetailsModal';

export const PeopleView: React.FC = () => {
  const { 
    currentUser, currentRole, currentWorkspace, addToast,
    permissions, users, teams, createTeam, inviteMember, invites, loadInvites,
    removeWorkspaceMember, projects, tasks
  } = useWorkspace();

  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'departments' | 'invitations' | 'orgchart' | 'leaves' | 'attendance' | 'goals' | 'performance'>('directory');
  const [loading, setLoading] = useState(true);

  // Team & Invite Modal State
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#7C3AED');
  const [teamLeadId, setTeamLeadId] = useState<string>(currentUser?.id || '');

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('employee');
  const [inviteTeamId, setInviteTeamId] = useState<string>(teams[0]?.id || '');
  const [generatedInvite, setGeneratedInvite] = useState<WorkspaceInvite | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatusFilter, setInviteStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'expired'>('all');
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  // Directory State
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('');
  const [selectedEmploymentTypeFilter, setSelectedEmploymentTypeFilter] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
  const [removeConfirmName, setRemoveConfirmName] = useState('');
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [activeActionMenuUserId, setActiveActionMenuUserId] = useState<string | null>(null);

  // Departments & Org Chart State
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [orgChart, setOrgChart] = useState<any | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [targetReassignUser, setTargetReassignUser] = useState<any | null>(null);
  const [selectedNewManagerId, setSelectedNewManagerId] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedNewDeptId, setSelectedNewDeptId] = useState('');
  const [isEditDepartmentModalOpen, setIsEditDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any | null>(null);
  const [selectedDepartmentDetails, setSelectedDepartmentDetails] = useState<any | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDescription, setEditDeptDescription] = useState('');
  const [editDeptColor, setEditDeptColor] = useState('#7C3AED');
  const [editDeptHeadId, setEditDeptHeadId] = useState('');

  // Leave State
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any | null>(null);
  const [isRequestLeaveModalOpen, setIsRequestLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'annual',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    reason: '',
  });

  // Attendance State
  const [todayAttendance, setTodayAttendance] = useState<any | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [attendanceMetrics, setAttendanceMetrics] = useState<any | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

  // Goals State
  const [goals, setGoals] = useState<any[]>([]);
  const [isCreateGoalModalOpen, setIsCreateGoalModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    category: 'individual',
    targetValue: 100,
    unit: '%',
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  });
  const [selectedGoalForCheckin, setSelectedGoalForCheckin] = useState<any | null>(null);
  const [checkinValue, setCheckinValue] = useState(50);
  const [checkinNotes, setCheckinNotes] = useState('');

  // Performance Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedReviewForSelf, setSelectedReviewForSelf] = useState<any | null>(null);
  const [selfRatings, setSelfRatings] = useState({ communication: 4, ownership: 4, execution: 4, leadership: 3, comments: '' });
  const [selectedReviewForManager, setSelectedReviewForManager] = useState<any | null>(null);
  const [managerRatings, setManagerRatings] = useState({ communication: 4, ownership: 4, execution: 4, leadership: 4, comments: '', strengths: '', growthAreas: '' });

  // Executive Analytics
  const [analytics, setAnalytics] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        dirRes,
        deptRes,
        orgRes,
        leaveRes,
        balRes,
        attTodayRes,
        attMetRes,
        attHistRes,
        goalsRes,
        reviewsRes,
        analyticsRes,
      ] = await Promise.all([
        api.getEmployeeDirectory(),
        api.getDepartments(),
        api.getOrgChart(),
        api.getLeaveRequests(),
        api.getLeaveBalances(),
        api.getTodayAttendance(),
        api.getAttendanceMetrics(),
        api.getAttendanceHistory(),
        api.getGoals(),
        api.getPerformanceReviews(),
        currentRole === 'admin' ? api.getPeopleAnalytics() : Promise.resolve(null),
      ]);

      if (dirRes?.profiles) setProfiles(dirRes.profiles);
      if (deptRes?.departments) setDepartments(deptRes.departments);
      if (orgRes) setOrgChart(orgRes);
      if (leaveRes?.leaves) setLeaves(leaveRes.leaves);
      if (balRes?.balances) setLeaveBalances(balRes.balances);
      if (attTodayRes) {
        setTodayAttendance(attTodayRes.record);
        setIsCheckedIn(attTodayRes.isCheckedIn);
      }
      if (attMetRes) setAttendanceMetrics(attMetRes);
      if (attHistRes?.history) setAttendanceHistory(attHistRes.history);
      if (goalsRes?.goals) setGoals(goalsRes.goals);
      if (reviewsRes?.reviews) setReviews(reviewsRes.reviews);
      if (analyticsRes) setAnalytics(analyticsRes);
    } catch (err: any) {
      console.error('Failed to load People OS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (currentRole === 'admin') {
      loadInvites();
    }
  }, [currentWorkspace?.id, currentRole]);

  // Team & Invite Handlers
  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Create Department in People System
      await api.createDepartment({
        name: teamName,
        description: teamDescription,
        headId: teamLeadId || currentUser?.id || undefined,
        color: teamColor,
      });

      // 2. Also register in workspace teams
      await createTeam({
        name: teamName,
        description: teamDescription,
        lead_id: teamLeadId || currentUser?.id || '',
        color: teamColor
      });

      setIsCreateTeamModalOpen(false);
      setTeamName('');
      setTeamDescription('');
      addToast({
        type: 'success',
        title: 'Department Created',
        message: `Department "${teamName}" created successfully.`
      });
      loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Create Department',
        message: err.message || 'An error occurred while creating the department.'
      });
    }
  };

  const handleUpdateDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDepartment) return;
    try {
      await api.updateDepartment(editingDepartment.id, {
        name: editDeptName,
        description: editDeptDescription,
        headId: editDeptHeadId || null,
        color: editDeptColor,
      });

      setIsEditDepartmentModalOpen(false);
      setEditingDepartment(null);
      addToast({
        type: 'success',
        title: 'Department Updated',
        message: `Department "${editDeptName}" updated successfully.`
      });
      loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Update Department',
        message: err.message || 'An error occurred while updating the department.'
      });
    }
  };

  const handleDeleteDepartment = async (deptId: string, deptName: string) => {
    if (!window.confirm(`Are you sure you want to delete department "${deptName}"? Members will be unassigned to General Operations.`)) {
      return;
    }
    try {
      await api.deleteDepartment(deptId);
      setIsEditDepartmentModalOpen(false);
      setEditingDepartment(null);
      addToast({
        type: 'info',
        title: 'Department Removed',
        message: `Department "${deptName}" was removed.`
      });
      loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Delete Department',
        message: err.message || 'An error occurred while deleting the department.'
      });
    }
  };
  const handleRemoveMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToRemove) return;

    const targetUserId = memberToRemove.userId || memberToRemove.user?.id || memberToRemove.id;
    const targetName = memberToRemove.user?.name || memberToRemove.name || (memberToRemove.user?.email ? memberToRemove.user.email.split('@')[0] : 'Member');

    if (removeConfirmName.trim().toLowerCase() !== targetName.trim().toLowerCase()) {
      addToast({
        type: 'error',
        title: 'Confirmation Name Mismatch',
        message: 'Please type the exact member name to confirm removal.',
      });
      return;
    }

    setIsRemovingMember(true);
    try {
      const ok = await removeWorkspaceMember(targetUserId);
      if (ok) {
        setMemberToRemove(null);
        setRemoveConfirmName('');
        setActiveActionMenuUserId(null);
        await loadData();
      }
    } finally {
      setIsRemovingMember(false);
    }
  };

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

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingInviteId(inviteId);
    try {
      await api.cancelInvite(inviteId);
      addToast({
        type: 'success',
        title: 'Invitation Revoked',
        message: 'The invitation token was invalidated and deleted.'
      });
      await loadInvites();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Revocation Failed',
        message: err.message || 'Failed to revoke invitation.'
      });
    } finally {
      setRevokingInviteId(null);
    }
  };

  // Attendance Handlers
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

  // Leave Handlers
  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.requestLeave(leaveForm);
      addToast({ type: 'success', title: 'Leave Requested', message: 'Your leave request has been submitted to your manager.' });
      setIsRequestLeaveModalOpen(false);
      setLeaveForm({
        leaveType: 'annual',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        reason: '',
      });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Submission Failed', message: err.message });
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

  // Goal Handlers
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createGoal(goalForm);
      addToast({ type: 'success', title: 'Goal Created', message: 'New strategic OKR has been registered.' });
      setIsCreateGoalModalOpen(false);
      setGoalForm({
        title: '',
        description: '',
        category: 'individual',
        targetValue: 100,
        unit: '%',
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create goal', message: err.message });
    }
  };

  const handleGoalCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForCheckin) return;
    try {
      await api.updateGoalProgress(selectedGoalForCheckin.id, checkinValue, checkinValue, checkinNotes);
      addToast({ type: 'success', title: 'Progress Updated', message: 'Goal progress updated successfully.' });
      setSelectedGoalForCheckin(null);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to update progress', message: err.message });
    }
  };

  // Profile & Department Handlers
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

  const handleTransferDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReassignUser || !selectedNewDeptId) return;
    const targetUserId = targetReassignUser.userId || targetReassignUser.user?.id || targetReassignUser.id;
    try {
      await api.transferDepartment(targetUserId, selectedNewDeptId);
      addToast({ type: 'success', title: 'Department Transferred', message: 'Employee transferred successfully.' });
      setIsTransferModalOpen(false);
      setTargetReassignUser(null);
      setSelectedNewDeptId('');
      await loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Transfer Failed', message: err.message || 'Failed to transfer department.' });
    }
  };

  const handleReassignManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReassignUser) return;
    try {
      await api.reassignManager(targetReassignUser.id || targetReassignUser.userId, selectedNewManagerId || null);
      addToast({ type: 'success', title: 'Reporting Line Updated', message: 'Direct manager reassigned successfully.' });
      setIsReassignModalOpen(false);
      setTargetReassignUser(null);
      setSelectedNewManagerId('');
      await loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reassign Failed', message: err.message || 'Failed to reassign manager.' });
    }
  };

  // Filtered Profiles
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.skills?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const selectedDept = departments.find((d) => d.id === selectedDepartmentFilter);
    const matchesDept =
      !selectedDepartmentFilter ||
      p.departmentId === selectedDepartmentFilter ||
      p.department?.id === selectedDepartmentFilter ||
      (selectedDept && (
        (p.department?.name && p.department.name.toLowerCase() === selectedDept.name?.toLowerCase()) ||
        selectedDept.headId === p.userId ||
        selectedDept.head?.id === p.userId ||
        selectedDept.head?.id === p.user?.id ||
        selectedDept.headId === p.user?.id
      ));

    const matchesType = !selectedEmploymentTypeFilter || p.employmentType === selectedEmploymentTypeFilter;

    return matchesSearch && matchesDept && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        title="People OS"
        description="Manage employee directory, departments, member invitations, leave requests, and live attendance."
      >
        <div className="flex items-center gap-3">
          {permissions?.teams?.manageTeams && (
            <button
              onClick={() => setIsCreateTeamModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-[#1E293B] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
            >
              <span>Create Department</span>
            </button>
          )}

          {permissions?.teams?.inviteMembers && (
            <button
              onClick={() => {
                setGeneratedInvite(null);
                setIsInviteModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#B8FF3B] hover:bg-[#CCFF66] text-[#0F1115] text-xs font-bold shadow-md shadow-[#B8FF3B]/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Invite Member</span>
            </button>
          )}

          {isCheckedIn ? (
            <button
              onClick={handleCheckOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              Check Out
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#B8FF3B]/10 hover:bg-[#B8FF3B]/20 text-[#B8FF3B] border border-[#B8FF3B]/30 text-xs font-semibold transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Check In
            </button>
          )}

          <button
            onClick={() => setIsRequestLeaveModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#242936] hover:bg-[#2E3545] text-slate-200 border border-[#2A303D] text-xs font-semibold transition cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Request Leave
          </button>
        </div>
      </PageHeader>

      {/* Clean MVP Sub-Tabs Bar */}
      <div className="flex border-b border-[#2A303D] gap-2 overflow-x-auto pb-1">
        {(currentRole === 'admin'
          ? [
              { id: 'directory', label: 'Employee Directory', icon: Users },
              { id: 'departments', label: 'Departments', icon: Building2 },
              { id: 'invitations', label: 'Invitations', icon: Send },
              { id: 'leaves', label: 'Leave Management', icon: Calendar },
              { id: 'attendance', label: 'Attendance & Clock', icon: Clock },
            ]
          : [
              { id: 'directory', label: 'Team Directory', icon: Users },
              { id: 'leaves', label: 'Leave Requests', icon: Calendar },
              { id: 'attendance', label: 'Attendance & Clock', icon: Clock },
            ]
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                if (tab.id === 'invitations') {
                  loadInvites();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition whitespace-nowrap border-b-2 cursor-pointer ${
                isActive
                  ? 'border-[#B8FF3B] text-[#B8FF3B] bg-[#B8FF3B]/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'invitations' && invites.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#B8FF3B]/20 text-[#B8FF3B] font-mono">
                  {invites.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB: INVITATIONS */}
      {activeSubTab === 'invitations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-[#171A21] border border-[#2A303D] rounded-xl text-xs">
              {(['all', 'pending', 'accepted', 'expired'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setInviteStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                    inviteStatusFilter === st
                      ? 'bg-[#B8FF3B]/15 text-[#B8FF3B] border border-[#B8FF3B]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st} {st !== 'all' && `(${invites.filter((inv) => {
                    const now = new Date();
                    const isExp = inv.expires_at ? new Date(inv.expires_at) < now : false;
                    const computedStatus = inv.accepted_at ? 'accepted' : isExp ? 'expired' : (inv.status || 'pending');
                    return computedStatus === st;
                  }).length})`}
                </button>
              ))}
            </div>

            {permissions?.teams?.inviteMembers && (
              <button
                onClick={() => {
                  setGeneratedInvite(null);
                  setIsInviteModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Invite Member</span>
              </button>
            )}
          </div>

          {/* Invitations List / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invites
              .filter((inv) => {
                if (inviteStatusFilter === 'all') return true;
                const now = new Date();
                const isExp = inv.expires_at ? new Date(inv.expires_at) < now : false;
                const computedStatus = inv.accepted_at ? 'accepted' : isExp ? 'expired' : (inv.status || 'pending');
                return computedStatus === inviteStatusFilter;
              })
              .map((inv) => {
                const now = new Date();
                const isExp = inv.expires_at ? new Date(inv.expires_at) < now : false;
                const computedStatus = inv.accepted_at ? 'accepted' : isExp ? 'expired' : (inv.status || 'pending');
                const matchedTeam = teams.find((t) => t.id === inv.team_id);

                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-emerald-500/40 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <h4 className="font-semibold text-slate-100 text-sm truncate">{inv.email}</h4>
                          <p className="text-xs text-emerald-400 capitalize mt-0.5 font-medium">
                            Role: {inv.role}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            computedStatus === 'accepted'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : computedStatus === 'expired'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          }`}
                        >
                          {computedStatus}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                        {matchedTeam && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Department: <strong className="text-slate-200">{matchedTeam.name}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {computedStatus === 'accepted'
                              ? `Accepted: ${inv.accepted_at ? new Date(inv.accepted_at).toLocaleDateString() : 'Yes'}`
                              : `Expires: ${new Date(inv.expires_at).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleCopyLink(inv.token)}
                        className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-medium flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-purple-400" />
                        <span>Copy Invite Link</span>
                      </button>

                      {computedStatus !== 'accepted' && permissions?.teams?.manageTeams && (
                        <button
                          disabled={revokingInviteId === inv.id}
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 font-medium flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{revokingInviteId === inv.id ? 'Revoking...' : 'Revoke'}</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>

          {invites.length === 0 && (
            <div className="p-8 text-center bg-slate-900/20 border border-white/5 rounded-2xl text-slate-400 text-xs">
              No active or historical invitations found. Click &quot;Invite Member&quot; to provision a new invitation token.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: DEPARTMENTS */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search departments, missions..."
                value={deptSearchQuery}
                onChange={(e) => setDeptSearchQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            {permissions?.teams?.manageTeams && (
              <button
                onClick={() => setIsCreateTeamModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Department</span>
              </button>
            )}
          </div>

          {/* Department Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments
              .filter((d) => 
                !deptSearchQuery || 
                d.name?.toLowerCase().includes(deptSearchQuery.toLowerCase()) || 
                d.description?.toLowerCase().includes(deptSearchQuery.toLowerCase())
              )
              .map((dept) => {
                const assignedCount = profiles.filter((p) =>
                  p.departmentId === dept.id ||
                  p.department?.id === dept.id ||
                  (p.department?.name && p.department.name.toLowerCase() === dept.name?.toLowerCase()) ||
                  dept.headId === p.userId ||
                  dept.head?.id === p.userId ||
                  dept.head?.id === p.user?.id ||
                  dept.headId === p.user?.id
                ).length;
                const memberCount = Math.max(assignedCount, dept.memberCount || 0);

                return (
                  <motion.div
                    key={dept.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-xl bg-slate-900/40 border border-white/10 hover:border-purple-500/40 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                            style={{ backgroundColor: dept.color || '#7C3AED' }}
                          >
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-100 text-sm">{dept.name}</h4>
                            <p className="text-xs text-slate-400">
                              {dept.head?.name ? `Lead: ${dept.head.name}` : 'No Lead Assigned'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>

                      {dept.description && (
                        <p className="mt-3 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {dept.description}
                        </p>
                      )}

                      {/* Department Workload Engine Metrics */}
                      {(() => {
                        const deptProjects = projects.filter((p) => p.department_id === dept.id || p.departmentId === dept.id);
                        const deptTasks = tasks.filter((t) => deptProjects.some((p) => p.id === t.projectId));
                        const overdueDeptTasks = deptTasks.filter(
                          (t) => t.status !== 'done' && t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()
                        );
                        return (
                          <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-white/[0.04]">
                              <span className="text-slate-500 block uppercase">Projects</span>
                              <span className="font-bold text-purple-400 text-xs">{deptProjects.length}</span>
                            </div>
                            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-white/[0.04]">
                              <span className="text-slate-500 block uppercase">Tasks</span>
                              <span className="font-bold text-blue-400 text-xs">{deptTasks.length}</span>
                            </div>
                            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-white/[0.04]">
                              <span className="text-slate-500 block uppercase">Overdue</span>
                              <span className={`font-bold text-xs ${overdueDeptTasks.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                                {overdueDeptTasks.length}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                        <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>{memberCount} Workforce Assigned</span>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        {permissions?.teams?.manageTeams && (
                          <>
                            <button
                              onClick={() => {
                                setEditingDepartment(dept);
                                setEditDeptName(dept.name || '');
                                setEditDeptDescription(dept.description || '');
                                setEditDeptColor(dept.color || '#7C3AED');
                                setEditDeptHeadId(dept.headId || dept.head?.id || '');
                                setIsEditDepartmentModalOpen(true);
                              }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition cursor-pointer flex items-center gap-1"
                              title="Edit Department"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setTargetReassignUser(profiles.find(p => p.departmentId !== dept.id) || profiles[0]);
                                setSelectedNewDeptId(dept.id);
                                setIsTransferModalOpen(true);
                              }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 border border-purple-500/30 font-medium transition cursor-pointer flex items-center gap-1"
                              title="Add / Assign Member to this Department"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Member</span>
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDepartmentDetails(dept);
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-[#B8FF3B]/10 hover:bg-[#B8FF3B]/20 text-[#B8FF3B] border border-[#B8FF3B]/20 hover:border-[#B8FF3B]/40 font-medium flex items-center gap-1 transition cursor-pointer"
                          title="View Department Details & Members"
                        >
                          <span>Manage Members</span> <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>

          {departments.length === 0 && (
            <div className="p-8 text-center bg-slate-900/20 border border-white/5 rounded-2xl text-slate-400 text-xs">
              No departments registered. Click &quot;Create Department&quot; to form an organizational unit.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1: EMPLOYEE DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, designation, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedDepartmentFilter}
                onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                className="bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedEmploymentTypeFilter}
                onChange={(e) => setSelectedEmploymentTypeFilter(e.target.value)}
                className="bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="">All Types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contractor">Contractor</option>
                <option value="intern">Intern</option>
              </select>
            </div>
          </div>

          {/* Active Department Filter Banner */}
          {selectedDepartmentFilter && (
            <div className="flex items-center justify-between p-3 px-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Showing members in department:{' '}
                  <strong className="text-white">
                    {departments.find((d) => d.id === selectedDepartmentFilter)?.name || 'Selected Department'}
                  </strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedDepartmentFilter('')}
                className="text-emerald-400 hover:text-white font-medium flex items-center gap-1 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear Filter (View All)
              </button>
            </div>
          )}

          {/* Employee Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProfiles.map((prof) => (
              <motion.div
                key={prof.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-emerald-500/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={prof.user?.name || prof.name || (prof.user?.email ? prof.user.email.split('@')[0] : 'Staff')} avatar={prof.user?.avatar} size="lg" />
                      <div>
                        <h4 className="font-semibold text-slate-100 text-sm">{prof.user?.name || prof.name || (prof.user?.email ? prof.user.email.split('@')[0] : 'Staff')}</h4>
                        <p className="text-xs text-emerald-400 font-medium">{prof.designation}</p>
                        <p className="text-xs text-slate-400">{prof.user?.email || prof.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          prof.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {prof.status}
                      </span>

                      {/* Actions Menu */}
                      {currentRole === 'admin' && (prof.userId !== currentUser?.id && prof.user?.id !== currentUser?.id) && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetId = prof.userId || prof.user?.id || prof.id;
                              setActiveActionMenuUserId(activeActionMenuUserId === targetId ? null : targetId);
                            }}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                            title="Member Actions"
                            aria-label="Member Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeActionMenuUserId === (prof.userId || prof.user?.id || prof.id) && (
                            <div 
                              className="absolute right-0 mt-1 w-48 bg-[#171A21] border border-[#2A303D] rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setMemberToRemove(prof);
                                  setRemoveConfirmName('');
                                  setActiveActionMenuUserId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition cursor-pointer text-left font-medium"
                              >
                                <UserMinus className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                                <span>Remove From Workspace</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{prof.department?.name || 'General Operations'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{prof.location || 'Remote'}</span>
                    </div>
                    {prof.manager && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reports to: <strong className="text-slate-200">{prof.manager.name}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Skills tags */}
                  {prof.skills && prof.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {prof.skills.slice(0, 4).map((s: string, idx: number) => (
                        <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/5">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Joined {new Date(prof.joiningDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setSelectedProfile(prof)}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition cursor-pointer"
                  >
                    View Profile <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredProfiles.length === 0 && (
            <div className="p-8 text-center bg-slate-900/20 border border-white/5 rounded-2xl text-slate-400 text-xs space-y-3">
              <p>No employees found matching the current department or search filter.</p>
              <div className="flex items-center justify-center gap-3">
                {selectedDepartmentFilter && (
                  <button
                    onClick={() => setSelectedDepartmentFilter('')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
                  >
                    View All Employees
                  </button>
                )}
                {permissions?.teams?.manageTeams && profiles.length > 0 && (
                  <button
                    onClick={() => {
                      setTargetReassignUser(profiles[0]);
                      setSelectedNewDeptId(selectedDepartmentFilter || departments[0]?.id || '');
                      setIsTransferModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer"
                  >
                    Assign Employee to Department
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: LEAVE MANAGEMENT */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-6">
          {/* Leave Requests Table */}
          <div className="bg-slate-900/40 rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Leave Requests & Approvals</h3>
              <button
                onClick={() => setIsRequestLeaveModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition cursor-pointer"
              >
                + Request Leave
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-white/10 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Reason</th>
                    <th className="p-3.5">Status</th>
                    {(currentRole === 'admin' || (currentUser as any)?.role === 'lead') && <th className="p-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3.5 font-medium text-slate-100">
                        {l.user?.name || 'Team Member'}
                      </td>
                      <td className="p-3.5 capitalize">{l.leaveType}</td>
                      <td className="p-3.5">
                        {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                        <span className="ml-2 text-slate-500">({l.daysCount}d)</span>
                      </td>
                      <td className="p-3.5 text-slate-400 max-w-xs truncate">{l.reason}</td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            l.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : l.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      {(currentRole === 'admin' || (currentUser as any)?.role === 'lead') && (
                        <td className="p-3.5 text-right">
                          {l.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleReviewLeave(l.id, 'approved')}
                                className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition cursor-pointer"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReviewLeave(l.id, 'rejected')}
                                className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No leave requests submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: ATTENDANCE */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900/50 border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">My Clock Status</p>
              <h4 className="text-lg font-bold text-slate-100 mt-1">
                {isCheckedIn ? 'Checked In' : 'Checked Out'}
              </h4>
              {todayAttendance?.checkInAt && (
                <p className="text-xs text-purple-400 mt-0.5">
                  Since {new Date(todayAttendance.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <button
              onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg cursor-pointer ${
                isCheckedIn
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
              }`}
            >
              {isCheckedIn ? 'Check Out' : 'Check In'}
            </button>
          </div>

          {/* Attendance History */}
          <div className="bg-slate-900/40 rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-slate-200">Attendance Log History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-white/10 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Staff Member</th>
                    <th className="p-3.5">Check In</th>
                    <th className="p-3.5">Check Out</th>
                    <th className="p-3.5">Worked Duration</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {attendanceHistory.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3.5 font-medium text-slate-100">{a.date}</td>
                      <td className="p-3.5">{a.user?.name || 'Staff Member'}</td>
                      <td className="p-3.5 text-slate-300">
                        {a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {a.workedHours > 0 ? `${Math.floor(a.workedHours / 60)}h ${a.workedHours % 60}m` : 'In Progress'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            a.status === 'present'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : a.status === 'late'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST LEAVE */}
      <AnimatePresence>
        {isRequestLeaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-semibold text-slate-100">Submit Leave Request</h3>
                <button onClick={() => setIsRequestLeaveModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRequestLeave} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Leave Type</label>
                  <select
                    value={leaveForm.leaveType}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Reason for Leave</label>
                  <textarea
                    rows={3}
                    placeholder="Provide context for manager review..."
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsRequestLeaveModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition shadow-lg shadow-purple-500/20"
                  >
                    Submit Request
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
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
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
                      disabled={isInviting || !inviteEmail}
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
                <button onClick={() => setIsCreateTeamModalOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
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

      {/* ========================================================================= */}
      {/* EMPLOYEE PROFILE VIEW & EDIT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProfile(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-lg p-6 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <UserAvatar name={selectedProfile.user?.name || 'Staff'} avatar={selectedProfile.user?.avatar} size="md" />
                  <div>
                    <h3 className="text-base font-semibold text-white">{selectedProfile.user?.name}</h3>
                    <p className="text-xs text-slate-400">{selectedProfile.user?.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedProfile(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Designation / Title</label>
                    <input
                      type="text"
                      disabled={currentRole !== 'admin'}
                      value={selectedProfile.designation || ''}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, designation: e.target.value })}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Department</label>
                    <select
                      disabled={currentRole !== 'admin'}
                      value={selectedProfile.departmentId || ''}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, departmentId: e.target.value || null })}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">General Operations</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Reports To / Manager</label>
                    <select
                      disabled={currentRole !== 'admin'}
                      value={selectedProfile.managerId || ''}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, managerId: e.target.value || null })}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">No Direct Manager (Top Level)</option>
                      {profiles
                        .filter((p) => p.userId !== selectedProfile.userId)
                        .map((p) => (
                          <option key={p.userId} value={p.userId}>{p.user?.name} ({p.designation})</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Employment Type</label>
                    <select
                      disabled={currentRole !== 'admin'}
                      value={selectedProfile.employmentType || 'full_time'}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, employmentType: e.target.value })}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-purple-500"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contractor">Contractor</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Location</label>
                    <input
                      type="text"
                      value={selectedProfile.location || ''}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, location: e.target.value })}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g. San Francisco (Hybrid)"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Status</label>
                    <select
                      disabled={currentRole !== 'admin'}
                      value={selectedProfile.status || 'active'}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, status: e.target.value })}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-purple-500"
                    >
                      <option value="active">Active</option>
                      <option value="on_leave">On Leave</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bio / Profile Summary</label>
                  <textarea
                    rows={2}
                    value={selectedProfile.bio || ''}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, bio: e.target.value })}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                    placeholder="Short bio and responsibilities..."
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setSelectedProfile(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Close
                  </button>
                  {currentRole === 'admin' && (
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 cursor-pointer"
                    >
                      Save Changes
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* REASSIGN REPORTING LINE MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isReassignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsReassignModalOpen(false);
                setTargetReassignUser(null);
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
                <h3 className="text-base font-semibold text-white">Reassign Reporting Line</h3>
                <button
                  onClick={() => {
                    setIsReassignModalOpen(false);
                    setTargetReassignUser(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleReassignManagerSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Select Employee</label>
                  <select
                    required
                    value={targetReassignUser?.userId || targetReassignUser?.id || ''}
                    onChange={(e) => {
                      const found = profiles.find((p) => (p.userId || p.id) === e.target.value);
                      setTargetReassignUser(found || null);
                    }}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Choose Employee --</option>
                    {profiles.map((p) => (
                      <option key={p.userId || p.id} value={p.userId || p.id}>
                        {p.user?.name || p.name} ({p.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">New Manager / Direct Lead</label>
                  <select
                    value={selectedNewManagerId}
                    onChange={(e) => setSelectedNewManagerId(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">No Direct Manager (Top Executive)</option>
                    {profiles
                      .filter((p) => (p.userId || p.id) !== (targetReassignUser?.userId || targetReassignUser?.id))
                      .map((p) => (
                        <option key={p.userId || p.id} value={p.userId || p.id}>
                          {p.user?.name || p.name} ({p.designation})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReassignModalOpen(false);
                      setTargetReassignUser(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!targetReassignUser}
                    className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    Update Manager
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* TRANSFER DEPARTMENT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsTransferModalOpen(false);
                setTargetReassignUser(null);
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
                <h3 className="text-base font-semibold text-white">Assign / Transfer Department</h3>
                <button
                  onClick={() => {
                    setIsTransferModalOpen(false);
                    setTargetReassignUser(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleTransferDepartmentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Select Employee</label>
                  <select
                    required
                    value={targetReassignUser?.userId || targetReassignUser?.id || ''}
                    onChange={(e) => {
                      const found = profiles.find((p) => (p.userId || p.id) === e.target.value || p.user?.id === e.target.value);
                      setTargetReassignUser(found || null);
                    }}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Choose Employee --</option>
                    {profiles.map((p) => {
                      const val = p.userId || p.user?.id || p.id;
                      const displayName = p.user?.name || p.name || (p.user?.email ? p.user.email.split('@')[0] : 'Employee');
                      return (
                        <option key={val} value={val}>
                          {displayName} ({p.department?.name || 'General Operations'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Department</label>
                  <select
                    required
                    value={selectedNewDeptId}
                    onChange={(e) => setSelectedNewDeptId(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Choose Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransferModalOpen(false);
                      setTargetReassignUser(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!targetReassignUser || !selectedNewDeptId}
                    className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    Confirm Assignment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* EDIT DEPARTMENT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEditDepartmentModalOpen && editingDepartment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsEditDepartmentModalOpen(false);
                setEditingDepartment(null);
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
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-semibold text-white">Edit Department</h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditDepartmentModalOpen(false);
                    setEditingDepartment(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateDepartmentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department Name</label>
                  <input
                    type="text"
                    required
                    value={editDeptName}
                    onChange={(e) => setEditDeptName(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Frontend Engineering"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Mission / Description</label>
                  <textarea
                    rows={3}
                    value={editDeptDescription}
                    onChange={(e) => setEditDeptDescription(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 resize-none"
                    placeholder="Core objectives and department roadmap..."
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department Lead</label>
                  <select
                    value={editDeptHeadId}
                    onChange={(e) => setEditDeptHeadId(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">No Lead Assigned</option>
                    {profiles.map((p) => (
                      <option key={p.userId || p.id} value={p.userId || p.id}>
                        {p.user?.name || p.name} ({p.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Accent Color</label>
                  <div className="flex items-center gap-2">
                    {['#7C3AED', '#2563EB', '#059669', '#D97706', '#E11D48', '#0891B2', '#4F46E5'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditDeptColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform ${
                          editDeptColor === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => handleDeleteDepartment(editingDepartment.id, editingDepartment.name)}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditDepartmentModalOpen(false);
                        setEditingDepartment(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!editDeptName.trim()}
                      className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* REMOVE MEMBER CONFIRMATION MODAL */}
        {memberToRemove && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#171A21] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2 text-rose-400">
                  <UserMinus className="w-5 h-5 stroke-[2.5]" />
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
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRemoveMemberSubmit} className="mt-5 space-y-4 text-xs">
                {(() => {
                  const targetName = memberToRemove.user?.name || memberToRemove.name || (memberToRemove.user?.email ? memberToRemove.user.email.split('@')[0] : 'Member');
                  const isMatching = removeConfirmName.trim().toLowerCase() === targetName.trim().toLowerCase();

                  return (
                    <>
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
                          Type <span className="font-bold text-white select-all">&quot;{targetName}&quot;</span> to confirm:
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
                          disabled={!isMatching || isRemovingMember}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-600/20"
                        >
                          {isRemovingMember ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Removing...</span>
                            </>
                          ) : (
                            <>
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Remove Member</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </form>
            </motion.div>
          </div>
        )}

        {/* DEPARTMENT DETAILS & MEMBER MANAGEMENT MODAL */}
        {selectedDepartmentDetails && (
          <DepartmentDetailsModal
            department={selectedDepartmentDetails}
            isOpen={!!selectedDepartmentDetails}
            onClose={() => setSelectedDepartmentDetails(null)}
            onDepartmentUpdated={async () => {
              await loadData();
              const updated = departments.find((d) => d.id === selectedDepartmentDetails.id);
              if (updated) {
                setSelectedDepartmentDetails(updated);
              }
            }}
            allDepartments={departments}
            allProfiles={profiles}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
