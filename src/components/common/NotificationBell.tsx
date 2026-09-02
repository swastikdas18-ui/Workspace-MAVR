import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, X, Check, CheckCheck, Zap, FileText, CreditCard, 
  Users, AlertCircle, MessageSquare, Shield, Archive, Filter 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  isArchived?: boolean;
  createdAt: string | Date;
  metadata?: Record<string, any> | null;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  task_assigned: <Zap className="w-3.5 h-3.5 text-blue-400" />,
  TASK_ASSIGNED: <Zap className="w-3.5 h-3.5 text-blue-400" />,
  task_status_changed: <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />,
  comment_mentioned: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
  leave_submitted: <Users className="w-3.5 h-3.5 text-amber-400" />,
  leave_approved: <Check className="w-3.5 h-3.5 text-emerald-400" />,
  leave_rejected: <X className="w-3.5 h-3.5 text-rose-400" />,
  wiki_created: <FileText className="w-3.5 h-3.5 text-purple-400" />,
  document_uploaded: <FileText className="w-3.5 h-3.5 text-indigo-400" />,
  review_requested: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
  task_approved: <Check className="w-3.5 h-3.5 text-emerald-400" />,
  task_overdue: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
  automation_alert: <Zap className="w-3.5 h-3.5 text-purple-400" />,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  task_assigned: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  TASK_ASSIGNED: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  task_status_changed: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  comment_mentioned: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  leave_submitted: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  leave_approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  leave_rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  wiki_created: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  document_uploaded: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
};

function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export const NotificationBell: React.FC = () => {
  const { setActiveTab: setAppActiveTab } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'unread' | 'read' | 'archived'>('unread');
  const [typeFilter, setTypeFilter] = useState<'all' | 'tasks' | 'reviews' | 'automations'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res && res.notifications) {
        setNotifications(
          res.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type || 'system',
            isRead: n.isRead || n.read || false,
            isArchived: false,
            createdAt: n.createdAt || new Date(),
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
    // Fallback 30 second polling interval
    const pollInterval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead && !n.isArchived).length;

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

  const archiveNotification = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isArchived: true } : n));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') {
      if (n.isRead || n.isArchived) return false;
    } else if (activeTab === 'read') {
      if (!n.isRead || n.isArchived) return false;
    } else if (activeTab === 'archived') {
      if (!n.isArchived) return false;
    }

    if (typeFilter === 'tasks' && !n.type.toLowerCase().includes('task')) return false;
    if (typeFilter === 'reviews' && !n.type.toLowerCase().includes('review')) return false;
    if (typeFilter === 'automations' && !n.type.toLowerCase().includes('automation')) return false;

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
            className="absolute right-0 top-12 w-80 sm:w-96 bg-[#0F172A]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications Center</span>
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

            {/* Navigation Tabs (Unread / Read / Archived) */}
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1 border-b border-white/[0.04] bg-[#1E293B]/40 text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer text-[11px] ${
                    activeTab === 'unread'
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Unread ({notifications.filter(n => !n.isRead && !n.isArchived).length})
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

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-[#0F172A] border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Types</option>
                <option value="tasks">Tasks</option>
                <option value="reviews">Reviews</option>
                <option value="automations">Automations</option>
              </select>
            </div>

            {/* Notification Items List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.04]">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">No notifications</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Nothing in {activeTab} view</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`group relative px-4 py-3 hover:bg-white/[0.03] transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      !notif.isRead ? 'bg-purple-500/[0.04]' : ''
                    }`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center mt-0.5 ${NOTIFICATION_COLORS[notif.type] || 'border-slate-700/50 bg-slate-800 text-slate-400'}`}>
                        {NOTIFICATION_ICONS[notif.type] || <Bell className="w-3.5 h-3.5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-semibold leading-tight ${!notif.isRead ? 'text-white' : 'text-slate-300'}`}>
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-slate-600 mt-1">{timeAgo(notif.createdAt)}</p>
                      </div>
                    </div>

                    {/* Quick Archive action */}
                    {!notif.isArchived && (
                      <button
                        onClick={(e) => { e.stopPropagation(); archiveNotification(notif.id); }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-lg hover:bg-white/[0.08] text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                        title="Archive"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/[0.06] bg-slate-900/80 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-500 font-mono">30s Sync Engine Active</span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setAppActiveTab('notifications');
                }}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition cursor-pointer"
              >
                View All Notifications &rarr;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
