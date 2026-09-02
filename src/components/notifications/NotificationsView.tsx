import React, { useState, useEffect } from 'react';
import {
  Bell, Check, CheckCheck, Zap, FileText,
  Users, AlertCircle, MessageSquare, Shield, Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  link?: string;
  createdAt: string | Date;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  task_assigned: <Zap className="w-4 h-4 text-blue-400" />,
  task_status_changed: <AlertCircle className="w-4 h-4 text-cyan-400" />,
  comment_mentioned: <MessageSquare className="w-4 h-4 text-emerald-400" />,
  leave_submitted: <Users className="w-4 h-4 text-amber-400" />,
  leave_approved: <Check className="w-4 h-4 text-emerald-400" />,
  leave_rejected: <AlertCircle className="w-4 h-4 text-rose-400" />,
  wiki_created: <FileText className="w-4 h-4 text-purple-400" />,
  document_uploaded: <FileText className="w-4 h-4 text-indigo-400" />,
};

function formatTime(dateInput: string | Date): string {
  const d = new Date(dateInput);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const NotificationsView: React.FC = () => {
  const { setActiveTab } = useWorkspace();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      if (res && res.notifications) {
        setNotifications(
          res.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type || 'system',
            isRead: n.isRead || n.read || false,
            entityType: n.entityType,
            entityId: n.entityId,
            link: n.link,
            createdAt: n.createdAt || new Date(),
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
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await api.markNotificationRead(id).catch(() => null);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await api.markAllNotificationsRead().catch(() => null);
  };

  const handleNavigateEntity = (notif: NotificationItem) => {
    handleMarkRead(notif.id);
    if (notif.link) {
      if (notif.link.startsWith('/tasks')) setActiveTab('tasks');
      else if (notif.link.startsWith('/wiki')) setActiveTab('wiki');
      else if (notif.link.startsWith('/documents')) setActiveTab('documents');
      else if (notif.link.startsWith('/people')) setActiveTab('dashboard');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Bell className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">Notification Center</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time activity alerts, task updates, leave approvals, and workspace notifications.
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

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filter === 'unread'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
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
            <p className="font-semibold text-sm text-slate-300">No notifications found</p>
            <p className="text-xs text-slate-500">
              {filter === 'unread'
                ? 'You have caught up with all notifications.'
                : 'No notification records exist for your user in this workspace.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 hover:bg-white/[0.02] transition flex items-start justify-between gap-4 cursor-pointer ${
                !notif.isRead ? 'bg-purple-500/[0.03]' : ''
              }`}
              onClick={() => handleNavigateEntity(notif)}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="p-2 rounded-xl bg-slate-800/80 border border-white/10 shrink-0 mt-0.5">
                  {NOTIFICATION_ICONS[notif.type] || <Bell className="w-4 h-4 text-slate-400" />}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-xs font-semibold ${!notif.isRead ? 'text-slate-100' : 'text-slate-300'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                      {notif.type.replace('_', ' ')}
                    </span>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{notif.message}</p>
                  <p className="text-[11px] text-slate-500">{formatTime(notif.createdAt)}</p>
                </div>
              </div>

              {!notif.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkRead(notif.id);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-600/20 text-slate-400 hover:text-purple-300 transition shrink-0 cursor-pointer"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
