import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, X, Check, CheckCheck, Zap, FileText, 
  Users, AlertCircle, MessageSquare, Shield, Archive, Search,
  FolderPlus, Folder, Play, UserCheck, TrendingUp, CheckCircle, XCircle, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  entityType?: string;
  entityId?: string;
  link?: string;
  isRead: boolean;
  archived?: boolean;
  createdAt: string | Date;
  metadata?: Record<string, any> | null;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  // People OS
  employee_invited: <Users className="w-3.5 h-3.5 text-cyan-400" />,
  employee_joined: <Users className="w-3.5 h-3.5 text-emerald-400" />,
  leave_submitted: <Users className="w-3.5 h-3.5 text-amber-400" />,
  leave_approved: <Check className="w-3.5 h-3.5 text-emerald-400" />,
  leave_rejected: <X className="w-3.5 h-3.5 text-rose-400" />,
  // Projects
  initiative_created: <FolderPlus className="w-3.5 h-3.5 text-purple-400" />,
  initiative_assigned: <Folder className="w-3.5 h-3.5 text-blue-400" />,
  initiative_started: <Play className="w-3.5 h-3.5 text-cyan-400" />,
  initiative_review_requested: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
  initiative_approved: <Check className="w-3.5 h-3.5 text-emerald-400" />,
  initiative_rejected: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
  // Tasks
  task_assigned: <Zap className="w-3.5 h-3.5 text-blue-400" />,
  task_completed: <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />,
  task_overdue: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
  task_status_changed: <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />,
  // CRM
  lead_assigned: <UserCheck className="w-3.5 h-3.5 text-indigo-400" />,
  deal_stage_changed: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
  // Collaboration / Mentions
  mention_received: <MessageSquare className="w-3.5 h-3.5 text-amber-400" />,
  comment_mentioned: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
  wiki_created: <FileText className="w-3.5 h-3.5 text-purple-400" />,
  document_uploaded: <FileText className="w-3.5 h-3.5 text-indigo-400" />,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  employee_invited: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  employee_joined: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  leave_submitted: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  leave_approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  leave_rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  initiative_created: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  initiative_assigned: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  initiative_started: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  initiative_review_requested: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  initiative_approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  initiative_rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  task_assigned: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  task_completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  task_overdue: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  task_status_changed: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  lead_assigned: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  deal_stage_changed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  mention_received: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  comment_mentioned: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  wiki_created: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  document_uploaded: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
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
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
          <span>🔴</span> URGENT
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
          <span>🟠</span> HIGH
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
          <span>🔵</span> LOW
        </span>
      );
    case 'medium':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
          <span>🟢</span> MEDIUM
        </span>
      );
  }
}

export const NotificationBell: React.FC = () => {
  const { setActiveTab: setAppActiveTab } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'unread' | 'read' | 'archived'>('unread');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'people' | 'projects' | 'tasks' | 'crm' | 'mentions'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications({ tab: activeTab });
      if (res && res.notifications) {
        setNotifications(
          res.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type || 'system',
            priority: n.priority || 'medium',
            entityType: n.entityType || n.entity_type,
            entityId: n.entityId || n.entity_id,
            link: n.link,
            isRead: n.isRead || n.read || false,
            archived: n.archived || false,
            createdAt: n.createdAt || n.created_at || new Date(),
            metadata: n.metadata,
          }))
        );
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchNotifications();
    const pollInterval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(pollInterval);
  }, [activeTab]);

  const unreadCount = notifications.filter((n) => !n.isRead && !n.archived).length;

  const handleNavigateEntity = (notif: Notification) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      if (notif.link.startsWith('/tasks')) setAppActiveTab('tasks');
      else if (notif.link.startsWith('/projects')) setAppActiveTab('projects');
      else if (notif.link.startsWith('/crm')) setAppActiveTab('crm');
      else if (notif.link.startsWith('/people')) setAppActiveTab('dashboard');
      else if (notif.link.startsWith('/wiki')) setAppActiveTab('wiki');
      else if (notif.link.startsWith('/documents')) setAppActiveTab('documents');
      else setAppActiveTab('notifications');
    } else if (notif.type.startsWith('task')) {
      setAppActiveTab('tasks');
    } else if (notif.type.startsWith('initiative')) {
      setAppActiveTab('projects');
    } else if (notif.type.startsWith('lead') || notif.type.startsWith('deal')) {
      setAppActiveTab('crm');
    } else if (notif.type.startsWith('leave') || notif.type.startsWith('employee')) {
      setAppActiveTab('dashboard');
    } else {
      setAppActiveTab('notifications');
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    await api.markNotificationRead(id).catch(() => null);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await api.markAllNotificationsRead().catch(() => null);
  };

  const archiveNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await api.archiveNotification(id).catch(() => null);
  };

  // Direct action executor for leave requests
  const handleLeaveAction = async (notif: Notification, action: 'approve' | 'reject') => {
    if (!notif.entityId) return;
    setActionInProgress(notif.id);
    try {
      const reviewNotes = `${action === 'approve' ? 'Approved' : 'Rejected'} directly via Notifications.`;
      if (action === 'approve') {
        await api.approveLeaveRequest(notif.entityId, reviewNotes);
      } else {
        await api.rejectLeaveRequest(notif.entityId, reviewNotes);
      }
      await markAsRead(notif.id);
      fetchNotifications();
    } catch (err) {
      console.error(`Failed to ${action} leave request:`, err);
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') {
      if (n.isRead || n.archived) return false;
    } else if (activeTab === 'read') {
      if (!n.isRead || n.archived) return false;
    } else if (activeTab === 'archived') {
      if (!n.archived) return false;
    }

    if (categoryFilter === 'people' && !n.type.startsWith('leave') && !n.type.startsWith('employee')) return false;
    if (categoryFilter === 'projects' && !n.type.startsWith('initiative')) return false;
    if (categoryFilter === 'tasks' && !n.type.startsWith('task')) return false;
    if (categoryFilter === 'crm' && !n.type.startsWith('lead') && !n.type.startsWith('deal')) return false;
    if (categoryFilter === 'mentions' && n.type !== 'mention_received' && n.type !== 'comment_mentioned') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchMsg = n.message.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg) return false;
    }

    return true;
  });

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-xl bg-slate-800/60 border border-white/[0.08] hover:bg-slate-700/60 transition-all text-slate-400 hover:text-white cursor-pointer"
        aria-label="Open notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-purple-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-lg shadow-purple-500/40"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            id="notification-panel"
            className="absolute right-0 top-12 w-88 sm:w-[440px] bg-[#0F172A]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Notification Center</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-mono">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-slate-400 hover:text-purple-400 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-500/10 transition-all cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>All read</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-3 pt-2.5 pb-1.5 border-b border-white/[0.04] bg-[#1E293B]/30">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5" />
                <input
                  type="text"
                  placeholder="Search by title or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-500 hover:text-white text-[10px]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs (Unread / Read / Archived) & Categories */}
            <div className="flex flex-col gap-1 px-3 py-2 border-b border-white/[0.04] bg-[#1E293B]/40 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('unread')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer text-[11px] ${
                      activeTab === 'unread'
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Unread ({notifications.filter(n => !n.isRead && !n.archived).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('read')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer text-[11px] ${
                      activeTab === 'read'
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Read
                  </button>
                  <button
                    onClick={() => setActiveTab('archived')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer text-[11px] ${
                      activeTab === 'archived'
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Archived
                  </button>
                </div>

                {/* Category Filter Dropdown */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="bg-[#0F172A] border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All</option>
                  <option value="people">People</option>
                  <option value="projects">Projects</option>
                  <option value="tasks">Tasks</option>
                  <option value="crm">CRM</option>
                  <option value="mentions">Mentions</option>
                </select>
              </div>
            </div>

            {/* Notification Items List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.04]">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">
                    {activeTab === 'unread' ? "You're all caught up." : activeTab === 'archived' ? 'No archived notifications.' : 'No notifications found.'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Nothing in {activeTab} view</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`group relative px-4 py-3 hover:bg-white/[0.03] transition-all flex flex-col gap-2 ${
                      !notif.isRead ? 'bg-purple-500/[0.04]' : ''
                    }`}
                  >
                    <div 
                      className="flex items-start justify-between gap-3 cursor-pointer"
                      onClick={() => handleNavigateEntity(notif)}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center mt-0.5 ${NOTIFICATION_COLORS[notif.type] || 'border-slate-700/50 bg-slate-800 text-slate-400'}`}>
                          {NOTIFICATION_ICONS[notif.type] || <Bell className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-xs font-semibold leading-tight ${!notif.isRead ? 'text-white' : 'text-slate-300'}`}>
                                {notif.title}
                              </p>
                              {renderPriorityBadge(notif.priority)}
                            </div>
                            {!notif.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                          <p className="text-[10px] text-slate-600 mt-1">{getRelativeTime(notif.createdAt)}</p>
                        </div>
                      </div>

                      {/* Quick Archive action */}
                      {!notif.archived && (
                        <button
                          onClick={(e) => { e.stopPropagation(); archiveNotification(notif.id); }}
                          className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-lg hover:bg-white/[0.08] text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Action Buttons (Phase 2 Actionable Notifications) */}
                    <div className="flex items-center gap-2 pl-9 pt-1">
                      {/* Leave Submitted Action Buttons (Approve / Reject directly without navigation) */}
                      {notif.type === 'leave_submitted' && notif.entityId && (
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={actionInProgress === notif.id}
                            onClick={(e) => { e.stopPropagation(); handleLeaveAction(notif, 'approve'); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>Approve</span>
                          </button>
                          <button
                            disabled={actionInProgress === notif.id}
                            onClick={(e) => { e.stopPropagation(); handleLeaveAction(notif, 'reject'); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {/* Initiative Review Requested: Review Initiative */}
                      {notif.type === 'initiative_review_requested' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleNavigateEntity(notif); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition cursor-pointer"
                        >
                          <span>Review Initiative</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {/* Task Assigned: Open Task */}
                      {notif.type === 'task_assigned' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleNavigateEntity(notif); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition cursor-pointer"
                        >
                          <span>Open Task</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {/* Lead Assigned: Open Lead */}
                      {notif.type === 'lead_assigned' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleNavigateEntity(notif); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
                        >
                          <span>Open Lead</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {/* Deal Stage Changed: View Deal */}
                      {notif.type === 'deal_stage_changed' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleNavigateEntity(notif); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                        >
                          <span>View Deal</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {/* Leave Approved / Rejected: View Request */}
                      {(notif.type === 'leave_approved' || notif.type === 'leave_rejected') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleNavigateEntity(notif); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600 transition cursor-pointer"
                        >
                          <span>View Request</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/[0.06] bg-slate-900/80 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-500 font-mono">Workspace OS Notifications</span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setAppActiveTab('notifications');
                }}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition cursor-pointer"
              >
                Full Center &rarr;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
