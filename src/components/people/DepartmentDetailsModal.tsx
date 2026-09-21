import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Users, Crown, UserPlus, UserMinus, ArrowRightLeft, 
  Search, X, Shield, RefreshCw, CheckCircle2, ChevronDown, Check
} from 'lucide-react';
import { api } from '../../lib/api';
import { UserAvatar } from '../common/UserAvatar';
import { useWorkspace } from '../../context/WorkspaceContext';
import { EmptyState } from '../common/EmptyState';

interface DepartmentDetailsModalProps {
  department: any;
  isOpen: boolean;
  onClose: () => void;
  onDepartmentUpdated: () => void;
  allDepartments: any[];
  allProfiles: any[];
}

export const DepartmentDetailsModal: React.FC<DepartmentDetailsModalProps> = ({
  department,
  isOpen,
  onClose,
  onDepartmentUpdated,
  allDepartments,
  allProfiles,
}) => {
  const { currentRole, addToast } = useWorkspace();
  const isAdmin = currentRole === 'admin';

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<'all' | 'lead' | 'member'>('all');

  // Action states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedAddUserId, setSelectedAddUserId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [movingMember, setMovingMember] = useState<any | null>(null);
  const [targetDepartmentId, setTargetDepartmentId] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const loadMembers = async () => {
    if (!department?.id) return;
    setLoading(true);
    try {
      const res = await api.getDepartmentMembers(department.id);
      if (res?.members) {
        setMembers(res.members);
      }
    } catch (err: any) {
      console.error('Failed to load department members:', err);
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to load department members.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && department?.id) {
      loadMembers();
    }
  }, [isOpen, department?.id]);

  if (!isOpen || !department) return null;

  // Candidate users to add: workspace users not currently in this department
  const currentMemberUserIds = new Set(members.map((m) => m.userId || m.user?.id));
  const candidateProfiles = allProfiles.filter(
    (p) => !currentMemberUserIds.has(p.userId || p.user?.id)
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddUserId) return;
    setIsAdding(true);
    try {
      await api.addDepartmentMember(department.id, selectedAddUserId);
      addToast({
        type: 'success',
        title: 'Member Added',
        message: 'Member successfully assigned to department.',
      });
      setSelectedAddUserId('');
      setIsAddMemberOpen(false);
      await loadMembers();
      onDepartmentUpdated();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Add Member',
        message: err.message || 'An error occurred while adding member.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (member: any) => {
    const targetUserId = member.userId || member.user?.id;
    const targetName = member.user?.name || member.name || 'Member';
    if (!window.confirm(`Remove ${targetName} from department "${department.name}"?`)) {
      return;
    }
    setBusyMemberId(targetUserId);
    try {
      await api.removeDepartmentMember(department.id, targetUserId);
      addToast({
        type: 'info',
        title: 'Member Removed',
        message: `${targetName} was removed from ${department.name}.`,
      });
      await loadMembers();
      onDepartmentUpdated();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Removal Failed',
        message: err.message || 'Failed to remove member.',
      });
    } finally {
      setBusyMemberId(null);
    }
  };

  const handlePromoteLead = async (member: any) => {
    const targetUserId = member.userId || member.user?.id;
    const targetName = member.user?.name || member.name || 'Member';
    const isCurrentlyLead = member.departmentPosition === 'lead' || department.headId === targetUserId;

    const newLeadId = isCurrentlyLead ? null : targetUserId;
    const actionLabel = isCurrentlyLead ? 'Demote from Lead' : 'Promote to Department Lead';

    if (!window.confirm(`${actionLabel} for ${targetName}?`)) {
      return;
    }

    setBusyMemberId(targetUserId);
    try {
      await api.setDepartmentLead(department.id, newLeadId);
      addToast({
        type: 'success',
        title: 'Department Lead Updated',
        message: isCurrentlyLead 
          ? `${targetName} is no longer department lead.` 
          : `${targetName} is now the lead of ${department.name}.`,
      });
      await loadMembers();
      onDepartmentUpdated();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Update Lead',
        message: err.message || 'Could not update department lead.',
      });
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleMoveMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingMember || !targetDepartmentId) return;
    const targetUserId = movingMember.userId || movingMember.user?.id;
    const targetName = movingMember.user?.name || movingMember.name || 'Member';
    setIsMoving(true);
    try {
      await api.moveDepartmentMember(department.id, targetDepartmentId, targetUserId);
      addToast({
        type: 'success',
        title: 'Member Moved',
        message: `${targetName} successfully moved to new department.`,
      });
      setMovingMember(null);
      setTargetDepartmentId('');
      await loadMembers();
      onDepartmentUpdated();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Move Failed',
        message: err.message || 'Failed to move department member.',
      });
    } finally {
      setIsMoving(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const name = (m.user?.name || m.name || '').toLowerCase();
    const email = (m.user?.email || m.email || '').toLowerCase();
    const designation = (m.designation || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = !searchQuery || name.includes(query) || email.includes(query) || designation.includes(query);
    const matchesPosition = 
      positionFilter === 'all' || 
      (positionFilter === 'lead' && (m.departmentPosition === 'lead' || department.headId === (m.userId || m.user?.id))) ||
      (positionFilter === 'member' && m.departmentPosition !== 'lead' && department.headId !== (m.userId || m.user?.id));

    return matchesSearch && matchesPosition;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-[#11141A] border border-[#2A303D] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#2A303D] bg-[#171A21]/60 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
              style={{ backgroundColor: department.color || '#7C3AED' }}
            >
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-tight">{department.name}</h2>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#B8FF3B]/10 text-[#B8FF3B] border border-[#B8FF3B]/20">
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {department.description || 'Organizational business unit.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="p-4 border-b border-[#2A303D] bg-[#14171F] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search department members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0F1115] border border-[#2A303D] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#B8FF3B]"
              />
            </div>

            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value as any)}
              className="bg-[#0F1115] border border-[#2A303D] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#B8FF3B]"
            >
              <option value="all">All Positions</option>
              <option value="lead">Leads Only</option>
              <option value="member">Members Only</option>
            </select>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAddMemberOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#B8FF3B] hover:bg-[#A8EF2B] text-slate-950 text-xs font-bold shadow-md shadow-[#B8FF3B]/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Member</span>
            </button>
          )}
        </div>

        {/* Content Body / Members List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#B8FF3B]" />
              <p className="text-xs">Loading department members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title={members.length === 0 ? 'No Members Assigned' : 'No Members Match Search'}
              description={
                members.length === 0
                  ? `${department.name} has no members yet. Assign employees to this department to track workload and ownership.`
                  : 'No department members match your search. Try a different name or clear the search.'
              }
              actionLabel={isAdmin && members.length === 0 ? 'Assign First Member' : undefined}
              onAction={() => setIsAddMemberOpen(true)}
              actionIcon={UserPlus}
              size="compact"
            />
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredMembers.map((member) => {
                const targetUserId = member.userId || member.user?.id;
                const name = member.user?.name || member.name || (member.user?.email ? member.user.email.split('@')[0] : 'Member');
                const email = member.user?.email || member.email || '';
                const role = (member.user?.role || member.role || 'employee').toLowerCase();
                const isLead = member.departmentPosition === 'lead' || department.headId === targetUserId;
                const isBusy = busyMemberId === targetUserId;

                return (
                  <motion.div
                    key={targetUserId || member.id}
                    layout
                    className="p-3.5 rounded-xl bg-[#171A21] border border-[#2A303D] hover:border-slate-700 transition flex items-center justify-between gap-4"
                  >
                    {/* Member Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <UserAvatar name={name} avatar={member.user?.avatar} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-white text-xs truncate">{name}</h4>
                          
                          {/* Department Position Badge */}
                          {isLead ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Crown className="w-3 h-3 text-amber-400" />
                              Department Lead
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-white/5">
                              Member
                            </span>
                          )}

                          {/* Workspace Role Badge */}
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-400 border border-white/5">
                            {role}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span className="text-slate-300 font-medium">{member.designation || 'Team Member'}</span>
                          <span>•</span>
                          <span className="truncate">{email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Member Action Controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Promote / Demote Lead */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handlePromoteLead(member)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                            isLead
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                          }`}
                          title={isLead ? 'Demote Lead' : 'Promote to Lead'}
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>{isLead ? 'Lead' : 'Promote'}</span>
                        </button>

                        {/* Move Member */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setMovingMember(member);
                            setTargetDepartmentId(
                              allDepartments.find((d) => d.id !== department.id)?.id || ''
                            );
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                          title="Move to another department"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Move</span>
                        </button>

                        {/* Remove Member */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemoveMember(member)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition cursor-pointer flex items-center gap-1"
                          title="Remove from department"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A303D] bg-[#14171F] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Shield className="w-3.5 h-3.5 text-[#B8FF3B]" />
            <span>Role-Based Department Authorization Enforced</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* ADD MEMBER SUB-MODAL */}
        <AnimatePresence>
          {isAddMemberOpen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#171A21] border border-[#2A303D] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#2A303D]">
                  <div className="flex items-center gap-2 text-[#B8FF3B]">
                    <UserPlus className="w-4 h-4" />
                    <h3 className="font-bold text-white text-sm">Add Member to {department.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddMember} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Select Workspace Member</label>
                    {candidateProfiles.length === 0 ? (
                      <p className="p-3 bg-[#0F1115] border border-[#2A303D] rounded-xl text-slate-400 text-xs">
                        All workspace members are already assigned to this department.
                      </p>
                    ) : (
                      <select
                        required
                        value={selectedAddUserId}
                        onChange={(e) => setSelectedAddUserId(e.target.value)}
                        className="w-full bg-[#0F1115] border border-[#2A303D] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#B8FF3B]"
                      >
                        <option value="">-- Choose Member --</option>
                        {candidateProfiles.map((p) => {
                          const id = p.userId || p.user?.id || p.id;
                          const name = p.user?.name || p.name || p.email;
                          const deptName = p.department?.name ? `(Current: ${p.department.name})` : '(Unassigned)';
                          return (
                            <option key={id} value={id}>
                              {name} {deptName}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A303D]">
                    <button
                      type="button"
                      onClick={() => setIsAddMemberOpen(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedAddUserId || isAdding}
                      className="px-4 py-1.5 rounded-xl bg-[#B8FF3B] hover:bg-[#A8EF2B] text-slate-950 font-bold disabled:opacity-40 transition cursor-pointer flex items-center gap-1.5"
                    >
                      {isAdding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span>Add Member</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MOVE MEMBER SUB-MODAL */}
        <AnimatePresence>
          {movingMember && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#171A21] border border-[#2A303D] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#2A303D]">
                  <div className="flex items-center gap-2 text-purple-400">
                    <ArrowRightLeft className="w-4 h-4" />
                    <h3 className="font-bold text-white text-sm">
                      Move {movingMember.user?.name || movingMember.name || 'Member'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMovingMember(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleMoveMemberSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Destination Department</label>
                    <select
                      required
                      value={targetDepartmentId}
                      onChange={(e) => setTargetDepartmentId(e.target.value)}
                      className="w-full bg-[#0F1115] border border-[#2A303D] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#B8FF3B]"
                    >
                      <option value="">-- Choose Target Department --</option>
                      {allDepartments
                        .filter((d) => d.id !== department.id)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A303D]">
                    <button
                      type="button"
                      onClick={() => setMovingMember(null)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!targetDepartmentId || isMoving}
                      className="px-4 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold disabled:opacity-40 transition cursor-pointer flex items-center gap-1.5"
                    >
                      {isMoving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                      <span>Move Member</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
