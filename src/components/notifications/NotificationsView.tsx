import React, { useState, useEffect } from 'react';
import {
  Bell, Check, CheckCheck, Zap, FileText,
  Users, AlertCircle, MessageSquare, Shield, Filter, Search, Archive,
  FolderPlus, Folder, Play, UserCheck, TrendingUp, X, CheckCircle, XCircle, ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  archived?: boolean;
  entityType?: string;
  entityId?: string;
  link?: string;
  createdAt: string | Date;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  // People OS
  employee_invited: <Users className="w-4 h-4 text-cyan-400" />,
  employee_joined: <Users className="w-4 h-4 text-emerald-400" />,
  leave_submitted: <Users className="w-4 h-4 text-amber-400" />,
  leave_approved: <Check className="w-4 h-4 text-emerald-400" />,
  leave_rejected: <X className="w-4 h-4 text-rose-400" />,
  // Projects
  initiative_created: <FolderPlus className="w-4 h-4 text-purple-400" />,
  initiative_assigned: <Folder className="w-4 h-4 text-blue-400" />,
  initiative_started: <Play className="w-4 h-4 text-cyan-400" />,
  initiative_review_requested: <AlertCircle className="w-4 h-4 text-amber-400" />,
  initiative_approved: <Check className="w-4 h-4 text-emerald-400" />,
  initiative_rejected: <AlertCircle className="w-4 h-4 text-rose-400" />,
  // Tasks
  task_assigned: <Zap className="w-4 h-4 text-blue-400" />,
  task_completed: <CheckCheck className="w-4 h-4 text-emerald-400" />,
  task_overdue: <AlertCircle className="w-4 h-4 text-rose-400" />,
  task_status_changed: <AlertCircle className="w-4 h-4 text-cyan-400" />,
  // CRM
  lead_assigned: <UserCheck className="w-4 h-4 text-indigo-400" />,
  deal_stage_changed: <TrendingUp className="w-4 h-4 text-emerald-400" />,
  // Collaboration & Mentions
  mention_received: <MessageSquare className="w-4 h-4 text-amber-400" />,
  comment_mentioned: <MessageSquare className="w-4 h-4 text-emerald-400" />,
  wiki_created: <FileText className="w-4 h-4 text-purple-400" />,
  document_uploaded: <FileText className="w-4 h-4 text-indigo-400" />,
};

function getRelativeTime(dateInput: string | Date): string {
  const d = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} mins ago`;
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

function renderPriorityBadge(priority?: string) {
  const p = (priority || 'medium').toLowerCase();
  switch (p) {
    case 'urgent':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
          <span>🔴</span> URGENT
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
          <span>🟠</span> HIGH
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
          <span>🔵</span> LOW
        </span>
      );
    case 'medium':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
          <span>🟢</span> MEDIUM
        </span>
      );
  }
}

export const NotificationsView: React.FC = () => {
  const { setActiveTab } = useWorkspace();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tab, setTab] = useState<'unread' | 'read' | 'archived'>('unread');
  const [category, setCategory] = useState<'all' | 'people' | 'projects' | 'tasks' | 'crm' | 'mentions'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications({ tab });
      if (res && res.notifications) {
        setNotifications(
          res.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type || 'system',
            priority: n.priority || 'medium',
            isRead: n.isRead || n.read || false,
            archived: n.archived || false,
            entityType: n.entityType || n.entity_type,
            entityId: n.entityId || n.entity_id,
            link: n.link,
            createdAt: n.createdAt || n.created_at || new Date(),
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [tab]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await api.markNotificationRead(id).catch(() => null);
  };

  const handleArchive = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}/archive`, { method: 'PATCH' }).catch(() => null);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await api.markAllNotificationsRead().catch(() => null);
  };

  const handleLeaveAction = async (notif: NotificationItem, action: 'approve' | 'reject') => {
    if (!notif.entityId) return;
    setActionInProgress(notif.id);
    try {
      await fetch(`/api/people/leaves/${notif.entityId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNotes: `${action === 'approve' ? 'Approved' : 'Rejected'} via Notification Center.` }),
      });
      await handleMarkRead(notif.id);
      fetchNotifications();
    } catch (err) {
      console.error(`Failed to ${action} leave request:`, err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleNavigateEntity = (notif: NotificationItem) => {
    handleMarkRead(notif.id);
    if (notif.link) {
      if (notif.link.startsWith('/tasks')) setActiveTab('tasks');
      else if (notif.link.startsWith('/projects')) setActiveTab('projects');
      else if (notif.link.startsWith('/crm')) setActiveTab('crm');
      else if (notif.link.startsWith('/people')) setActiveTab('dashboard');
      else if (notif.link.startsWith('/wiki')) setActiveTab('wiki');
      else if (notif.link.startsWith('/documents')) setActiveTab('documents');
    } else if (notif.type.startsWith('task')) {
      setActiveTab('tasks');
    } else if (notif.type.startsWith('initiative')) {
      setActiveTab('projects');
    } else if (notif.type.startsWith('lead') || notif.type.startsWith('deal')) {
      setActiveTab('crm');
    } else if (notif.type.startsWith('leave') || notif.type.startsWith('employee')) {
      setActiveTab('dashboard');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (tab === 'unread') {
      if (n.isRead || n.archived) return false;
    } else if (tab === 'read') {
      if (!n.isRead || n.archived) return false;
    } else if (tab === 'archived') {
      if (!n.archived) return false;
    }

    if (category === 'people' && !n.type.startsWith('leave') && !n.type.startsWith('employee')) return false;
    if (category === 'projects' && !n.type.startsWith('initiative')) return false;
    if (category === 'tasks' && !n.type.startsWith('task')) return false;
    if (category === 'crm' && !n.type.startsWith('lead') && !n.type.startsWith('deal')) return false;
    if (category === 'mentions' && n.type !== 'mention_received' && n.type !== 'comment_mentioned') return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchMsg = n.message.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg) return false;
    }

    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead && !n.archived).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Bell className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">Actionable Notification Center</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Prioritized work inbox: execute approvals, open initiative reviews, and track notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-white/10 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-purple-400" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar: Search & Category & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setTab('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'unread'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setTab('read')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'read'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Read
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'archived'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Archived
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500/60 transition"
          >
            <option value="all">All Modules</option>
            <option value="people">People OS</option>
            <option value="projects">Projects</option>
            <option value="tasks">Tasks</option>
            <option value="crm">CRM</option>
            <option value="mentions">Mentions</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-slate-900/40 rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Bell className="w-10 h-10 text-slate-700 mb-1" />
            <p className="font-semibold text-sm text-slate-300">
              {tab === 'unread' ? "You're all caught up." : tab === 'archived' ? 'No archived notifications.' : 'No notifications found.'}
            </p>
            <p className="text-xs text-slate-500">
              {tab === 'unread'
                ? 'No pending unread notifications.'
                : tab === 'archived'
                ? 'No notifications have been archived yet.'
                : 'No notification records match your search or filter.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 hover:bg-white/[0.02] transition flex flex-col gap-2 cursor-pointer ${
                !notif.isRead ? 'bg-purple-500/[0.03]' : ''
              }`}
              onClick={() => handleNavigateEntity(notif)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-white/10 shrink-0 mt-0.5">
                    {NOTIFICATION_ICONS[notif.type] || <Bell className="w-4 h-4 text-slate-400" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-xs font-semibold ${!notif.isRead ? 'text-slate-100' : 'text-slate-300'}`}>
                        {notif.title}
                      </h3>
                      {renderPriorityBadge(notif.priority)}
                      <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                        {notif.type.replace('_', ' ')}
                      </span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{notif.message}</p>
                    <p className="text-[11px] text-slate-500">{getRelativeTime(notif.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-600/20 text-slate-400 hover:text-purple-300 transition cursor-pointer"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {!notif.archived && (
                    <button
                      onClick={() => handleArchive(notif.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons (Phase 2 Actionable Notifications) */}
              <div className="flex items-center gap-2 pl-11 pt-1" onClick={(e) => e.stopPropagation()}>
                {/* Leave Submitted Action Buttons (Approve / Reject directly without navigation) */}
                {notif.type === 'leave_submitted' && notif.entityId && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={actionInProgress === notif.id}
                      onClick={() => handleLeaveAction(notif, 'approve')}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Approve Leave</span>
                    </button>
                    <button
                      disabled={actionInProgress === notif.id}
                      onClick={() => handleLeaveAction(notif, 'reject')}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reject Leave</span>
                    </button>
                  </div>
                )}

                {/* Initiative Review Requested: Review Initiative */}
                {notif.type === 'initiative_review_requested' && (
                  <button
                    onClick={() => handleNavigateEntity(notif)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition cursor-pointer"
                  >
                    <span>Review Initiative</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {/* Task Assigned: Open Task */}
                {notif.type === 'task_assigned' && (
                  <button
                    onClick={() => handleNavigateEntity(notif)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition cursor-pointer"
                  >
                    <span>Open Task</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {/* Lead Assigned: Open Lead */}
                {notif.type === 'lead_assigned' && (
                  <button
                    onClick={() => handleNavigateEntity(notif)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
                  >
                    <span>Open Lead</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {/* Deal Stage Changed: View Deal */}
                {notif.type === 'deal_stage_changed' && (
                  <button
                    onClick={() => handleNavigateEntity(notif)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                  >
                    <span>View Deal</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {/* Leave Approved / Rejected: View Request */}
                {(notif.type === 'leave_approved' || notif.type === 'leave_rejected') && (
                  <button
                    onClick={() => handleNavigateEntity(notif)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  >
                    <span>View Request</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
