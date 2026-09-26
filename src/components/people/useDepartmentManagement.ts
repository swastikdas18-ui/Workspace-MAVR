import { useState } from 'react';
import { api } from '../../lib/api';

interface UseDepartmentManagementProps {
  loadData: () => Promise<void>;
  addToast: (toast: any) => void;
}

export function useDepartmentManagement({ loadData, addToast }: UseDepartmentManagementProps) {
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [targetReassignUser, setTargetReassignUser] = useState<any | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedNewDeptId, setSelectedNewDeptId] = useState('');
  const [isEditDepartmentModalOpen, setIsEditDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any | null>(null);
  const [selectedDepartmentDetails, setSelectedDepartmentDetails] = useState<any | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDescription, setEditDeptDescription] = useState('');
  const [editDeptColor, setEditDeptColor] = useState('#7C3AED');
  const [editDeptHeadId, setEditDeptHeadId] = useState('');

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
      addToast({ type: 'success', title: 'Department Updated', message: `Department "${editDeptName}" updated successfully.` });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Update Department', message: err.message || 'An error occurred.' });
    }
  };

  const handleDeleteDepartment = async (deptId: string, deptName: string) => {
    if (!window.confirm(`Are you sure you want to delete department "${deptName}"? Members will be unassigned to General Operations.`)) return;
    try {
      await api.deleteDepartment(deptId);
      setIsEditDepartmentModalOpen(false);
      setEditingDepartment(null);
      addToast({ type: 'info', title: 'Department Removed', message: `Department "${deptName}" was removed.` });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Delete Department', message: err.message || 'An error occurred.' });
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

  return {
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
  };
}
