import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';
import { 
  LayoutDashboard, Building2, FolderKanban, CheckSquare, FileText, 
  DollarSign, Users, BarChart3, CreditCard, Settings, ShieldAlert,
  ChevronLeft, ChevronRight, LogOut, Bell, BookOpen, Sparkles, Clock, Zap, MessageSquare, Inbox
} from 'lucide-react';
import { RoleBadge } from '../common/RoleBadge';
import { UserAvatar } from '../common/UserAvatar';
import { WorkspaceSelector } from '../workspace/WorkspaceSelector';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  onOpenCommandPalette,
}) => {
  const { currentRole, activeTab, setActiveTab, currentWorkspace, currentUser, logout, systemLogs } = useWorkspace();
  const [chatUnreadCount, setChatUnreadCount] = useState<number>(0);
  const [inboxUnresolvedCount, setInboxUnresolvedCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchBadges = async () => {
      try {
        const [chatRes, inboxRes] = await Promise.allSettled([
          api.getChatUnreadCount(),
          api.getWorkInbox(),
        ]);

        if (isMounted && chatRes.status === 'fulfilled' && typeof chatRes.value?.unreadCount === 'number') {
          setChatUnreadCount(chatRes.value.unreadCount);
        }
        if (isMounted && inboxRes.status === 'fulfilled' && typeof inboxRes.value?.summary?.totalUnresolved === 'number') {
          setInboxUnresolvedCount(inboxRes.value.summary.totalUnresolved);
        }
      } catch {}
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentWorkspace?.id, activeTab]);

  const chatBadge = chatUnreadCount > 0 ? String(chatUnreadCount) : null;
  const chatLabel = chatUnreadCount > 0 ? `Communication Hub (${chatUnreadCount})` : 'Communication Hub';
  const chatBadgeClass = chatUnreadCount > 0 ? 'bg-red-500 text-white font-bold rounded-full px-2 py-0.2' : undefined;

  const inboxBadge = inboxUnresolvedCount > 0 ? String(inboxUnresolvedCount) : null;
  const inboxBadgeClass = inboxUnresolvedCount > 0 ? 'bg-rose-500 text-white font-bold rounded-full px-2 py-0.2' : undefined;

  // 7 Core Navigation Pillars mapped to role specifications
  const getCoreNavItems = () => {
    if (currentRole === 'admin') {
      return [
        { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, badge: null },
        { id: 'inbox', label: 'Work Inbox', icon: Inbox, badge: inboxBadge, badgeClass: inboxBadgeClass },
        { id: 'chat', label: chatLabel, icon: MessageSquare, badge: chatBadge, badgeClass: chatBadgeClass },
        { id: 'crm', label: 'CRM Pipeline', icon: DollarSign, badge: 'Attio' },
        { id: 'projects', label: 'Projects & Initiatives', icon: FolderKanban, badge: 'All' },
        { id: 'tasks', label: 'Tasks Engine', icon: CheckSquare, badge: 'Flow' },
        { id: 'teams', label: 'People OS', icon: Users, badge: null },
        { id: 'knowledge', label: 'Knowledge Center', icon: BookOpen, badge: 'Docs' },
        { id: 'settings', label: 'Settings & Config', icon: Settings, badge: null },
      ];
    }

    if (currentRole === 'employee') {
      return [
        { id: 'inbox', label: 'Work Inbox', icon: Inbox, badge: inboxBadge, badgeClass: inboxBadgeClass },
        { id: 'dashboard', label: 'Productivity Hub', icon: LayoutDashboard, badge: null },
        { id: 'chat', label: chatLabel, icon: MessageSquare, badge: chatBadge, badgeClass: chatBadgeClass },
        { id: 'tasks', label: 'Tasks & Board', icon: CheckSquare, badge: 'Flow' },
        { id: 'projects', label: 'Assigned Projects', icon: FolderKanban, badge: 'Active' },
        { id: 'teams', label: 'People OS', icon: Users, badge: null },
        { id: 'knowledge', label: 'Knowledge Center', icon: BookOpen, badge: 'Docs' },
        { id: 'settings', label: 'Settings', icon: Settings, badge: null },
      ];
    }

    if (currentRole === 'guest') {
      return [
        { id: 'portal', label: 'Client Portal', icon: Sparkles, badge: 'Deliverables' },
      ];
    }

    // Intern Role: strictly Work Inbox, Command Sandbox, Communication Hub, Learning Tasks, Knowledge Center, Time
    return [
      { id: 'inbox', label: 'Work Inbox', icon: Inbox, badge: inboxBadge, badgeClass: inboxBadgeClass },
      { id: 'dashboard', label: 'Learning Sandbox', icon: LayoutDashboard, badge: 'Overview' },
      { id: 'chat', label: chatLabel, icon: MessageSquare, badge: chatBadge, badgeClass: chatBadgeClass },
      { id: 'tasks', label: 'Assigned Tasks', icon: CheckSquare, badge: 'Curriculum' },
      { id: 'knowledge', label: 'Knowledge Center', icon: BookOpen, badge: 'SOPs' },
      { id: 'time', label: 'Time Logs', icon: Clock, badge: null },
    ];
  };

  // Secondary Labs & Enterprise Extensions
  const SHOW_LABS_EXTENSIONS = false;

  const getLabsNavItems = () => {
    if (!SHOW_LABS_EXTENSIONS) return [];
    if (currentRole === 'admin') {
      return [
        { id: 'automations', label: 'Automations', icon: Zap, badge: 'Labs' },
        { id: 'time', label: 'Time & Utilization', icon: Clock, badge: 'Labs' },
        { id: 'analytics', label: 'Analytics & Velocity', icon: BarChart3, badge: 'Labs' },
        { id: 'portal', label: 'Client Portal', icon: Sparkles, badge: 'Labs' },
        { id: 'integrations', label: 'Google Sync', icon: Bell, badge: 'Labs' },
        { id: 'workspace', label: 'Workspace Hub', icon: Building2, badge: null },
        { id: 'admin_tools', label: 'Admin RBAC Tools', icon: ShieldAlert, badge: 'Sec' },
      ];
    }
    return [];
  };

  const coreNavItems = getCoreNavItems();
  const labsNavItems = getLabsNavItems();

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const renderNavItem = (item: { id: string; label: string; icon: any; badge: string | null }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
          isActive
            ? 'bg-[#7C3AED]/20 text-white border border-purple-500/30 shadow-[0_0_15px_-3px_rgba(124,58,237,0.25)]'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
        } ${isCollapsed ? 'justify-center px-2' : ''}`}
        title={isCollapsed ? item.label : undefined}
      >
        {/* Linear-style active indicator bar */}
        {isActive && (
          <motion.div
            layoutId="activeNavIndicator"
            className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#7C3AED] rounded-r-full shadow-[0_0_8px_rgba(124,58,237,0.8)]"
            transition={{ duration: 0.2 }}
          />
        )}

        <Icon
          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
            isActive ? 'text-purple-300' : 'text-slate-400 group-hover:text-slate-200'
          }`}
        />

        {!isCollapsed && (
          <>
            <span className="truncate flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  (item as any).badgeClass || (isActive
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                    : 'bg-slate-800 text-slate-400')
                }`}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A] border-r border-white/[0.08] text-slate-300 select-none">
      {/* TOP SECTION: Workspace Brand & Switcher */}
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between gap-2 bg-[#111827]">
        <div className="flex-1 min-w-0">
          <WorkspaceSelector compact={isCollapsed} />
        </div>

        {/* Collapse toggle on desktop */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* QUICK COMMAND TRIGGER */}
      {!isCollapsed && onOpenCommandPalette && (
        <div className="px-3 pt-3">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#020617] border border-white/[0.08] hover:border-purple-500/40 text-slate-400 hover:text-white text-xs transition-all shadow-inner group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>Command Menu</span>
            </div>
            <kbd className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-white/[0.06]">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* MIDDLE SECTION: Navigation Items */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            7 Core Pillars
          </div>
        )}

        {coreNavItems.map(renderNavItem)}

        {labsNavItems.length > 0 && (
          <>
            <div className="pt-3 pb-1">
              {!isCollapsed ? (
                <div className="px-3 py-1 text-[10px] font-semibold text-purple-400/80 uppercase tracking-wider border-t border-white/[0.06] pt-3">
                  Labs & Extensions
                </div>
              ) : (
                <div className="border-t border-white/[0.06] my-2" />
              )}
            </div>
            {labsNavItems.map(renderNavItem)}
          </>
        )}
      </div>

      {/* BOTTOM SECTION: User Profile, Activity, Logout */}
      <div className="p-3 border-t border-white/[0.08] bg-[#020617]/70 space-y-2">
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar name={currentUser.name} avatar={currentUser.avatar} size="md" />
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.title || currentUser.email}</p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-200 z-20 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10"
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
