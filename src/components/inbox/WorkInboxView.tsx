import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';
import { WorkInboxPayload, WorkInboxItem } from '../../types';
import {
  Inbox, AlertCircle, Clock, Calendar, CheckCircle2, ChevronRight,
  Check, X, MessageSquare, FolderKanban, CheckSquare, Users,
  DollarSign, Bell, ArrowUpRight, Sparkles, RefreshCw, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const WorkInboxView: React.FC = () => {
  const { currentUser, currentWorkspace, setActiveTab, addToast } = useWorkspace();

  const [inboxData, setInboxData] = useState<WorkInboxPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'today' | 'upcoming' | 'completed'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchInbox = async (isManualRefresh: boolean = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await api.getWorkInbox();
      if (res) {
        setInboxData(res);
      }
    } catch (err: any) {
      console.warn('[WorkInboxView] Failed to fetch inbox:', err);
      addToast({ type: 'error', title: 'Inbox Error', message: 'Could not load inbox items.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(() => fetchInbox(true), 15000);
    return () => clearInterval(interval);
  }, [currentWorkspace?.id]);

  // Handle in-line quick actions
  const handleQuickAction = async (item: WorkInboxItem, action: string, payload: Record<string, any>) => {
    try {
      setActionInProgress(item.id);
      const res = await api.executeInboxQuickAction(action, payload);
      if (res?.success) {
        addToast({ type: 'success', title: 'Action Complete', message: res.message });
        // Refresh inbox state
        await fetchInbox(true);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err.message || 'Could not complete action.' });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle primary action navigation
  const handlePrimaryAction = (item: WorkInboxItem) => {
    if (item.actionRoute.startsWith('/tasks/')) {
      const taskId = item.actionRoute.replace('/tasks/', '');
      window.history.pushState(null, '', item.actionRoute);
      setActiveTab('tasks');
    } else if (item.actionRoute.startsWith('/projects/')) {
      const projectId = item.actionRoute.replace('/projects/', '');
      window.history.pushState(null, '', item.actionRoute);
      setActiveTab('projects');
    } else if (item.actionRoute.startsWith('/crm/')) {
      window.history.pushState(null, '', item.actionRoute);
      setActiveTab('crm');
    } else if (item.actionRoute.startsWith('/chat')) {
      window.history.pushState(null, '', item.actionRoute);
      setActiveTab('chat');
    } else if (item.actionRoute === '/teams') {
      setActiveTab('teams');
    } else if (item.actionRoute === '/notifications') {
      setActiveTab('notifications');
    } else {
      setActiveTab('dashboard');
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="w-4 h-4 text-purple-400" />;
      case 'leave':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'initiative':
        return <FolderKanban className="w-4 h-4 text-blue-400" />;
      case 'mention':
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-rose-400" />;
      case 'lead':
      case 'deal':
        return <DollarSign className="w-4 h-4 text-amber-400" />;
      case 'notification':
      default:
        return <Bell className="w-4 h-4 text-purple-400" />;
    }
  };

  const getEntityBadge = (item: WorkInboxItem) => {
    switch (item.entityType) {
      case 'task':
        return item.priority === 'urgent' ? 'Overdue Task' : item.priority === 'today' ? 'Due Today' : 'Task';
      case 'leave':
        return 'Leave Request';
      case 'initiative':
        return 'Initiative';
      case 'mention':
        return 'Chat Mention';
      case 'chat':
        return 'Discussion';
      case 'lead':
      case 'deal':
        return 'CRM Pipeline';
      case 'notification':
      default:
        return 'System Alert';
    }
  };

  const renderCard = (item: WorkInboxItem) => {
    const isBusy = actionInProgress === item.id;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="group relative bg-[#0F172A] border border-white/[0.08] hover:border-purple-500/40 rounded-2xl p-4 transition-all shadow-md hover:shadow-purple-500/5 space-y-3"
      >
        {/* Card Top Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              {getEntityIcon(item.entityType)}
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.04]">
              {getEntityBadge(item)}
            </span>
          </div>

          {/* Due date or timestamp */}
          {item.dueDate && (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
              item.priority === 'urgent'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}>
              <Clock className="w-3 h-3" />
              {new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Card Body */}
        <div>
          <h4 className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
            {item.title}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
            {item.subtitle}
          </p>
        </div>

        {/* Card Action Row */}
        <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between gap-3">
          {/* Direct In-line Quick Actions */}
          <div className="flex items-center gap-2">
            {item.entityType === 'task' && item.priority !== 'completed' && (
              <button
                disabled={isBusy}
                onClick={() => handleQuickAction(item, 'mark_task_complete', { taskId: item.entityId })}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Mark Complete"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Done</span>
              </button>
            )}

            {item.entityType === 'leave' && item.priority === 'urgent' && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={isBusy}
                  onClick={() => handleQuickAction(item, 'approve_leave', { leaveId: item.metadata?.leaveId || item.entityId })}
                  className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                  <span>Approve</span>
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => handleQuickAction(item, 'reject_leave', { leaveId: item.metadata?.leaveId || item.entityId })}
                  className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                  <span>Reject</span>
                </button>
              </div>
            )}

            {item.entityType === 'notification' && (
              <button
                disabled={isBusy}
                onClick={() => handleQuickAction(item, 'mark_notification_read', { notificationId: item.entityId })}
                className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Mark Read
              </button>
            )}
          </div>

          {/* Primary Route Action */}
          <button
            onClick={() => handlePrimaryAction(item)}
            className="px-3 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer ml-auto"
          >
            <span>{item.actionLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    );
  };

  const totalUnresolved = inboxData?.summary.totalUnresolved || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ========================================================================= */}
      {/* 1. TOP GREETING & SUMMARY HEADER */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#1E1B4B]/70 to-[#0F172A] border border-white/[0.08] p-6 lg:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-mono text-xs tracking-wider uppercase">
              <Inbox className="w-4 h-4" />
              <span>Workspace OS • Work Inbox & Action Center</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {getGreeting()}, {currentUser?.name || 'Teammate'}
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              {totalUnresolved > 0
                ? `${totalUnresolved} actionable ${totalUnresolved === 1 ? 'item needs' : 'items need'} your attention today.`
                : "You're all caught up! Nothing urgently requires your action right now."}
            </p>
          </div>

          {/* Summary Pills & Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-[#020617] border border-white/[0.08] px-3 py-2 rounded-2xl">
              <span className="flex items-center gap-1.5 text-xs font-mono text-rose-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {inboxData?.summary.totalUrgent || 0} Urgent
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-xs font-mono text-amber-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {inboxData?.summary.totalToday || 0} Today
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-xs font-mono text-blue-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {inboxData?.summary.totalUpcoming || 0} Upcoming
              </span>
            </div>

            <button
              onClick={() => fetchInbox(true)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Inbox"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['all', 'urgent', 'today', 'upcoming', 'completed'] as const).map((tab) => {
            const isActive = activeFilter === tab;
            const count =
              tab === 'all'
                ? totalUnresolved
                : tab === 'urgent'
                ? inboxData?.summary.totalUrgent
                : tab === 'today'
                ? inboxData?.summary.totalToday
                : tab === 'upcoming'
                ? inboxData?.summary.totalUpcoming
                : inboxData?.summary.totalCompletedRecently;

            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.04]'
                }`}
              >
                <span>{tab === 'all' ? 'All Items' : tab === 'completed' ? 'Completed' : tab}</span>
                {typeof count === 'number' && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-black/30 text-white' : 'bg-white/[0.08] text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN WORK INBOX SECTIONS */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
          <p className="text-xs font-mono">Aggregating daily action items...</p>
        </div>
      ) : totalUnresolved === 0 && (!inboxData?.completedRecently || inboxData.completedRecently.length === 0) ? (
        /* Empty State */
        <div className="rounded-3xl bg-[#0F172A]/50 border border-white/[0.08] p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Nothing needs your attention right now.</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              All overdue tasks, leave reviews, chat mentions, and today’s goals are resolved. Great job!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION: 🔴 URGENT */}
          {(activeFilter === 'all' || activeFilter === 'urgent') && (inboxData?.urgent?.length || 0) > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  Urgent & Overdue
                  <span className="text-xs font-normal text-rose-400">({inboxData?.urgent.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inboxData?.urgent.map(renderCard)}
              </div>
            </div>
          )}

          {/* SECTION: 🟡 TODAY */}
          {(activeFilter === 'all' || activeFilter === 'today') && (inboxData?.today?.length || 0) > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  Due Today & Active Work
                  <span className="text-xs font-normal text-amber-400">({inboxData?.today.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inboxData?.today.map(renderCard)}
              </div>
            </div>
          )}

          {/* SECTION: 🔵 UPCOMING */}
          {(activeFilter === 'all' || activeFilter === 'upcoming') && (inboxData?.upcoming?.length || 0) > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  Upcoming Responsibilities
                  <span className="text-xs font-normal text-blue-400">({inboxData?.upcoming.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inboxData?.upcoming.map(renderCard)}
              </div>
            </div>
          )}

          {/* SECTION: ⚪ RECENTLY COMPLETED */}
          {(activeFilter === 'all' || activeFilter === 'completed') && (inboxData?.completedRecently?.length || 0) > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  Recently Completed
                  <span className="text-xs font-normal text-emerald-400">({inboxData?.completedRecently.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inboxData?.completedRecently.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
