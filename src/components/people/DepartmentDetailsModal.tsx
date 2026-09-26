import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, Shield, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import { EmptyState } from '../common/EmptyState';
import { AddDepartmentMemberModal } from './AddDepartmentMemberModal';
import { MoveDepartmentMemberModal } from './MoveDepartmentMemberModal';
import { DepartmentMembersList } from './DepartmentMembersList';
import { DepartmentDetailsHeader } from './DepartmentDetailsHeader';

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
      if (res?.members) setMembers(res.members);
    } catch (err: any) {
      console.error('Failed to load department members:', err);
      addToast({ type: 'error', title: 'Error', message: 'Could not load department members.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && department?.id) loadMembers();
  }, [isOpen, department?.id]);

  if (!isOpen || !department) return null;

  const candidateProfiles = allProfiles.filter((p) => {
    const pUserId = p.userId || p.user?.id || p.id;
    return !members.some((m) => (m.userId || m.user?.id) === pUserId);
  });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddUserId) return;
    setIsAdding(true);
    try {
      await api.addDepartmentMember(department.id, selectedAddUserId);
      addToast({ type: 'success', title: 'Member Assigned', message: 'Member successfully added to this department.' });
      setIsAddMemberOpen(false);
      setSelectedAddUserId('');
      await loadMembers();
      onDepartmentUpdated();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Assignment Failed', message: err.message || 'Could not assign member.' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (member: any) => {
    const targetUserId = member.userId || member.user?.id;
    const targetName = member.user?.name || member.name || 'Member';
    if (!window.confirm(`Remove ${targetName} from ${department.name}? They will be reassigned to General Operations.`)) return;

    setBusyMemberId(targetUserId);
    try {
      await api.removeDepartmentMember(department.id, targetUserId);
      addToast({ type: 'info', title: 'Member Removed', message: `${targetName} removed from department.` });
      await loadMembers();
      onDepartmentUpdated();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Removal Failed', message: err.message || 'Could not remove member.' });
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

    if (!window.confirm(`${actionLabel} for ${targetName}?`)) return;

    setBusyMemberId(targetUserId);
    try {
      await api.setDepartmentLead(department.id, newLeadId);
      addToast({
        type: 'success',
        title: 'Department Lead Updated',
        message: isCurrentlyLead ? `${targetName} is no longer department lead.` : `${targetName} is now the lead of ${department.name}.`,
      });
      await loadMembers();
      onDepartmentUpdated();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Update Lead', message: err.message || 'Could not update department lead.' });
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
      addToast({ type: 'success', title: 'Member Moved', message: `${targetName} successfully moved to new department.` });
      setMovingMember(null);
      setTargetDepartmentId('');
      await loadMembers();
      onDepartmentUpdated();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Move Failed', message: err.message || 'Failed to move department member.' });
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
        <DepartmentDetailsHeader
          department={department}
          membersCount={members.length}
          onClose={onClose}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          positionFilter={positionFilter}
          setPositionFilter={setPositionFilter}
          isAdmin={isAdmin}
          onOpenAddMember={() => setIsAddMemberOpen(true)}
        />

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              <span>Loading department roster...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={members.length === 0 ? 'No Members Assigned' : 'No Members Found'}
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
            <DepartmentMembersList
              filteredMembers={filteredMembers}
              department={department}
              isAdmin={isAdmin}
              busyMemberId={busyMemberId}
              onPromoteLead={handlePromoteLead}
              onStartMove={(m) => {
                setMovingMember(m);
                setTargetDepartmentId(allDepartments.find((d) => d.id !== department.id)?.id || '');
              }}
              onRemoveMember={handleRemoveMember}
            />
          )}
        </div>

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

        <AddDepartmentMemberModal
          isOpen={isAddMemberOpen}
          onClose={() => setIsAddMemberOpen(false)}
          departmentName={department.name}
          candidateProfiles={candidateProfiles}
          selectedAddUserId={selectedAddUserId}
          setSelectedAddUserId={setSelectedAddUserId}
          onSubmit={handleAddMember}
          isAdding={isAdding}
        />

        <MoveDepartmentMemberModal
          movingMember={movingMember}
          onClose={() => setMovingMember(null)}
          onSubmit={handleMoveMemberSubmit}
          targetDepartmentId={targetDepartmentId}
          setTargetDepartmentId={setTargetDepartmentId}
          isMoving={isMoving}
          departmentId={department.id}
          allDepartments={allDepartments}
        />
      </motion.div>
    </div>
  );
};
