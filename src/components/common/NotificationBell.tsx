import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Zap, FileText, CreditCard, Users, AlertCircle, MessageSquare, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string | Date;
  metadata?: Record<string, any> | null;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  TASK_ASSIGNED: <Zap className="w-3.5 h-3.5 text-blue-400" />,
  TASK_DUE: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
  TASK_OVERDUE: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  COMMENT_ADDED: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
  DOCUMENT_SHARED: <FileText className="w-3.5 h-3.5 text-purple-400" />,
  CLIENT_APPROVAL_RECEIVED: <Check className="w-3.5 h-3.5 text-emerald-400" />,
  PAYMENT_RECEIVED: <CreditCard className="w-3.5 h-3.5 text-emerald-400" />,
  INVITE_ACCEPTED: <Users className="w-3.5 h-3.5 text-blue-400" />,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  TASK_ASSIGNED: 'border-blue-500/30 bg-blue-500/5',
  TASK_DUE: 'border-amber-500/30 bg-amber-500/5',
  TASK_OVERDUE: 'border-red-500/30 bg-red-500/5',
  COMMENT_ADDED: 'border-emerald-500/30 bg-emerald-500/5',
  DOCUMENT_SHARED: 'border-purple-500/30 bg-purple-500/5',
  CLIENT_APPROVAL_RECEIVED: 'border-emerald-500/30 bg-emerald-500/5',
  PAYMENT_RECEIVED: 'border-emerald-500/30 bg-emerald-500/5',
  INVITE_ACCEPTED: 'border-blue-500/30 bg-blue-500/5',
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

// Demo notifications for standalone display (no API dependency for preview)
const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Task Assigned', message: 'You have been assigned: "Q3 Product Roadmap"', type: 'TASK_ASSIGNED', isRead: false, createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: '2', title: 'Payment Received', message: 'Razorpay confirmed ₹1,499 for Business Plan.', type: 'PAYMENT_RECEIVED', isRead: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: '3', title: 'Client Approval', message: 'Acme Corp signed off on "Website Redesign v2"', type: 'CLIENT_APPROVAL_RECEIVED', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', title: 'Task Overdue', message: '"API Integration" is overdue by 2 days', type: 'TASK_OVERDUE', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '5', title: 'New Comment', message: 'Priya Sharma commented on "Backend Architecture"', type: 'COMMENT_ADDED', isRead: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '6', title: 'Invite Accepted', message: 'Ravi Teja joined your workspace as Employee', type: 'INVITE_ACCEPTED', isRead: true, createdAt: new Date(Date.now() - 259200000).toISOString() },
];

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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
            className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-lg shadow-red-500/40"
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
            className="absolute right-0 top-12 w-80 sm:w-96 bg-[#0F172A]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-slate-400 hover:text-blue-400 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-all cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3" />
                    All read
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

            {/* Notification List */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.04]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-8 h-8 text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500 font-medium">All caught up!</p>
                  <p className="text-xs text-slate-600 mt-1">No new notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`group relative px-4 py-3 hover:bg-white/[0.03] transition-all cursor-pointer ${
                      !notif.isRead ? 'bg-blue-500/[0.04]' : ''
                    }`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type icon */}
                      <div className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center mt-0.5 ${NOTIFICATION_COLORS[notif.type] || 'border-slate-700/50 bg-slate-800'}`}>
                        {NOTIFICATION_ICONS[notif.type] || <Bell className="w-3.5 h-3.5 text-slate-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[12px] font-semibold leading-tight ${!notif.isRead ? 'text-white' : 'text-slate-300'}`}>
                            {notif.title}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {!notif.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-slate-600 mt-1">{timeAgo(notif.createdAt)}</p>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-lg hover:bg-white/[0.08] text-slate-600 hover:text-slate-300 transition-all cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/[0.06] bg-slate-900/40">
              <p className="text-[10px] text-slate-600 text-center">
                Notifications auto-refresh every 60s • Settings › Notifications
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
