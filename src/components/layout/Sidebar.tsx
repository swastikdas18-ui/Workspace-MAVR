import React from 'react';
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
  // Core Navigation Pillars mapped to role specifications
  const getCoreNavItems = () => {
    if (currentRole === 'admin') {
      return [
        { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, badge: null },
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
        { id: 'dashboard', label: 'Productivity Hub', icon: LayoutDashboard, badge: null },
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

    // Intern Role: strictly Command Sandbox, Learning Tasks, Knowledge Center, Time
    return [
      { id: 'dashboard', label: 'Learning Sandbox', icon: LayoutDashboard, badge: 'Overview' },
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
        className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-[14px] text-xs font-medium transition-all duration-150 cursor-pointer ${
          isActive
            ? 'text-white'
            : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
        } ${isCollapsed ? 'justify-center px-2' : ''}`}
        title={isCollapsed ? item.label : undefined}
      >
        {/* Animated selection background badge (Linear/Notion style) */}
        {isActive && (
          <motion.div
            layoutId="sidebarActiveBackground"
            className="absolute inset-0 bg-[#7C3AED]/15 border border-[#7C3AED]/35 rounded-[14px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_16px_rgba(124,58,237,0.15)]"
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
          />
        )}

        {/* Left accent bar for active item */}
        {isActive && (
          <motion.div
            layoutId="sidebarActivePill"
            className="absolute left-1 top-2 bottom-2 w-1 bg-[#7C3AED] rounded-full shadow-[0_0_8px_rgba(124,58,237,0.8)]"
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
          />
        )}

        <div className="relative z-10 flex items-center justify-center shrink-0 w-4 h-4">
          <Icon
            className={`w-4 h-4 transition-colors duration-150 ${
              isActive ? 'text-purple-300' : 'text-slate-400 group-hover:text-slate-200'
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
                className={`text-[10px] px-1.5 py-0.5 rounded-[8px] font-mono shrink-0 ml-1.5 ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                    : 'bg-slate-800/80 text-slate-400 border border-white/[0.04]'
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
    <div className="flex flex-col h-full bg-[#0B0F19] border-r border-white/[0.08] text-slate-300 select-none">
      {/* TOP SECTION: Workspace Brand & Switcher */}
      <div className="p-3 border-b border-white/[0.06] bg-[#0E1322]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <WorkspaceSelector compact={isCollapsed} />
          </div>

          {/* Collapse toggle on desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-[10px] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
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
            className="w-full flex items-center justify-between px-3 py-2 rounded-[14px] bg-[#060913] border border-white/[0.08] hover:border-purple-500/40 text-slate-400 hover:text-white text-xs transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-slate-300 group-hover:text-white">Quick Find</span>
            </div>
            <kbd className="text-[10px] font-mono text-slate-400 bg-slate-800/90 px-1.5 py-0.5 rounded-[6px] border border-white/[0.08]">
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
                <div className="px-3 py-1 ui-caption font-semibold uppercase tracking-wider text-purple-400/80 border-t border-white/[0.06] pt-3">
                  Extensions
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
      <div className="p-3 border-t border-white/[0.06] bg-[#080D1A]">
        <div className={`flex items-center gap-2.5 p-1.5 rounded-[16px] hover:bg-white/[0.04] transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div 
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="relative shrink-0">
              <UserAvatar name={currentUser.name} avatar={currentUser.avatar} size="md" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#080D1A]" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                  {currentUser.name}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="ui-caption text-slate-400 truncate max-w-[100px]">
                    {currentUser.title || currentUser.email}
                  </span>
                  <span className="ui-mono text-[9px] uppercase px-1 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25">
                    {currentRole}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-[10px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer shrink-0"
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
