import React from 'react';

export const getTaskAssignee = (t: any | null | undefined, users: any[], currentUser: any) => {
  if (!t) return null;
  if (t.assignee && typeof t.assignee === 'object' && t.assignee.name) {
    return t.assignee;
  }
  const targetId = t.assigned_to || t.assignedTo;
  if (targetId) {
    const found = users.find((u) => u.id === targetId);
    if (found) return found;
    if (currentUser && (currentUser.id === targetId || t.assigned_to === currentUser.id)) {
      return currentUser;
    }
  }
  if (t.assignee_name) {
    return { id: targetId || '', name: t.assignee_name, avatar: t.assignee_avatar || undefined };
  }
  return null;
};

export const getPriorityBadge = (p: string) => {
  switch (p) {
    case 'critical':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold shadow-sm shadow-rose-500/20';
    case 'urgent':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold';
    case 'high':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'medium':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700/50';
  }
};
