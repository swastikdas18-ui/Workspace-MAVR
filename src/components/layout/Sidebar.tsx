import React, { useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  LayoutDashboard, Building2, FolderKanban, CheckSquare, FileText, 
  DollarSign, Users, BarChart3, CreditCard, Settings, ShieldAlert,
  ChevronLeft, ChevronRight, LogOut, Bell, BookOpen, Sparkles, Clock, Zap
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
  
  // Core Navigation Pillars mapped to role specifications (memoized)
  const coreNavItems = useMemo(() => {
    if (currentRole === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'projects', label: 'Projects', icon: FolderKanban, badge: null },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: null },
        { id: 'crm', label: 'Sales & CRM', icon: DollarSign, badge: null },
        { id: 'teams', label: 'Team Members', icon: Users, badge: null },
        { id: 'knowledge', label: 'Docs & Wiki', icon: BookOpen, badge: null },
        { id: 'settings', label: 'Settings', icon: Settings, badge: null },
      ];
    }

    if (currentRole === 'employee') {
      return [
        { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'tasks', label: 'My Tasks', icon: CheckSquare, badge: null },
        { id: 'projects', label: 'Projects', icon: FolderKanban, badge: null },
        { id: 'teams', label: 'Team Directory', icon: Users, badge: null },
        { id: 'knowledge', label: 'Docs & Wiki', icon: BookOpen, badge: null },
        { id: 'settings', label: 'Settings', icon: Settings, badge: null },
      ];
    }

    if (currentRole === 'guest') {
      return [
        { id: 'portal', label: 'Client Portal', icon: Sparkles, badge: null },
      ];
    }

    // Intern Role: strictly Dashboard, Learning Tasks, Docs, Time
    return [
      { id: 'dashboard', label: 'Intern Dashboard', icon: LayoutDashboard, badge: null },
      { id: 'tasks', label: 'Assigned Tasks', icon: CheckSquare, badge: null },
      { id: 'knowledge', label: 'Learning Guides', icon: BookOpen, badge: null },
      { id: 'time', label: 'Time Logs', icon: Clock, badge: null },
    ];
  }, [currentRole]);

  // Secondary Labs & Enterprise Extensions
  const SHOW_LABS_EXTENSIONS = false;

  const labsNavItems = useMemo(() => {
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
  }, [currentRole]);

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
        className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-[14px] text-xs font-medium transition-all duration-150 cursor-pointer ${
          isActive
            ? 'text-white font-semibold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        } ${isCollapsed ? 'justify-center px-2' : ''}`}
        title={isCollapsed ? item.label : undefined}
      >
        {/* Animated selection background badge (Graphite Surface Elevation) */}
        {isActive && (
          <motion.div
            layoutId="sidebarActiveBackground"
            className="absolute inset-0 bg-[#B8FF3B]/10 border border-[#B8FF3B]/25 rounded-[12px] shadow-[0_1px_6px_rgba(184,255,59,0.12)]"
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
          />
        )}

        {/* Left accent bar for active item (Signature Lime) */}
        {isActive && (
          <motion.div
            layoutId="sidebarActivePill"
            className="absolute left-1 top-2 bottom-2 w-1 bg-[#B8FF3B] rounded-full shadow-[0_0_10px_rgba(184,255,59,0.7)]"
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
          />
        )}

        <div className="relative z-10 flex items-center justify-center shrink-0 w-4 h-4">
          <Icon
            className={`w-4 h-4 transition-colors duration-150 ${
              isActive ? 'text-[#B8FF3B]' : 'text-slate-400 group-hover:text-slate-200'
            }`}
          />
        </div>

        {!isCollapsed && (
          <div className="relative z-10 flex items-center justify-between flex-1 min-w-0">
            <span className={`truncate text-left tracking-tight ${isActive ? 'font-semibold text-white' : 'font-medium'}`}>
              {item.label}
            </span>
            {item.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-[6px] font-mono shrink-0 ml-1.5 ${
                  isActive
                    ? 'bg-[#B8FF3B]/20 text-[#B8FF3B] border border-[#B8FF3B]/30'
                    : 'bg-[#242936] text-slate-400 border border-[#2A303D]'
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#171A21] border-r border-[#2A303D] text-slate-300 select-none">
      {/* TOP SECTION: Workspace Brand & Switcher */}
      <div className="p-3 border-b border-[#2A303D] bg-[#12141A]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <WorkspaceSelector compact={isCollapsed} />
          </div>

          {/* Collapse toggle on desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-[8px] text-slate-400 hover:text-slate-100 hover:bg-[#242936] transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* QUICK COMMAND TRIGGER */}
      {!isCollapsed && onOpenCommandPalette && (
        <div className="px-3 pt-3">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3 py-2 rounded-[12px] bg-[#1D212B] border border-[#2A303D] hover:border-[#B8FF3B]/40 text-slate-400 hover:text-slate-200 text-xs transition-all shadow-[0_1px_3px_rgba(0,0,0,0.3)] group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#B8FF3B] group-hover:scale-110 transition-transform" />
              <span className="font-medium text-slate-300 group-hover:text-white">Quick Find</span>
            </div>
            <kbd className="text-[10px] font-mono text-slate-400 bg-[#242936] px-1.5 py-0.5 rounded-[4px] border border-[#2A303D]">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* MIDDLE SECTION: Navigation Items */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 py-1.5 ui-caption font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </div>
        )}

        {coreNavItems.map(renderNavItem)}

        {labsNavItems.length > 0 && (
          <>
            <div className="pt-3 pb-1">
              {!isCollapsed ? (
                <div className="px-3 py-1 ui-caption font-semibold uppercase tracking-wider text-[#B8FF3B]/80 border-t border-[#2A303D] pt-3">
                  Extensions
                </div>
              ) : (
                <div className="border-t border-[#2A303D] my-2" />
              )}
            </div>
            {labsNavItems.map(renderNavItem)}
          </>
        )}
      </div>

      {/* BOTTOM SECTION: User Profile, Activity, Logout */}
      <div className="p-3 border-t border-[#2A303D] bg-[#12141A]">
        <div className={`flex items-center gap-2.5 p-1.5 rounded-[12px] hover:bg-[#242936] transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div 
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="relative shrink-0">
              <UserAvatar name={currentUser?.name || 'User'} avatar={currentUser?.avatar} size="md" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#B8FF3B] rounded-full border-2 border-[#12141A]" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-100 truncate group-hover:text-[#B8FF3B] transition-colors">
                  {currentUser?.name || 'User'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="ui-caption text-slate-400 truncate max-w-[100px]">
                    {currentUser?.title || currentUser?.email || ''}
                  </span>
                  <span className="ui-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#B8FF3B]/15 text-[#B8FF3B] border border-[#B8FF3B]/25">
                    {currentRole}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-[8px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
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
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] z-20 ${
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
              transition={{ duration: 0.15 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
