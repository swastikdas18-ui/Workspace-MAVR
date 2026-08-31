import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Search, Bell, Menu, Plus, Sparkles, CheckCircle2, 
  AlertCircle, Info, ExternalLink, ShieldCheck, X, ChevronRight
} from 'lucide-react';
import { RoleBadge } from '../common/RoleBadge';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
  onOpenQuickCreate?: () => void;
  onOpenCreateTeam?: () => void;
  onOpenInviteMember?: () => void;
  onOpenCreateProject?: () => void;
  onOpenCreateTask?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onOpenCommandPalette,
  onOpenQuickCreate,
  onOpenCreateTeam,
  onOpenInviteMember,
  onOpenCreateProject,
  onOpenCreateTask,
}) => {
  const { 
    currentUser, currentRole, searchQuery, setSearchQuery, 
    activeTab, currentWorkspace, systemLogs, permissions, setActiveTab
  } = useWorkspace();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNewActionMenu, setShowNewActionMenu] = useState(false);

  const getBreadcrumbLabel = (tab: string) => {
    switch (tab) {
      case 'admin_tools': return 'Admin RBAC Tools';
      case 'dashboard': return currentRole === 'admin' ? 'Executive Center' : currentRole === 'employee' ? 'Productivity Hub' : 'Learning Sandbox';
      case 'time': return 'Time & Utilization';
      case 'crm': return 'CRM Pipeline';
      case 'wiki': return 'Workspace Wiki';
      case 'portal': return 'Client Portal';
      default: return tab.charAt(0).toUpperCase() + tab.slice(1);
    }
  };

  const actionMenuItems = [
    {
      id: 'create-team',
      label: 'Create Team',
      desc: 'Form a new department or functional group',
      icon: Users,
      action: () => {
        setShowNewActionMenu(false);
        if (onOpenCreateTeam) onOpenCreateTeam();
      },
      permitted: permissions?.teams?.manageTeams,
    },
    {
      id: 'invite-member',
      label: 'Invite Member',
      desc: 'Generate cryptographic invitation URL',
      icon: UserPlus,
      action: () => {
        setShowNewActionMenu(false);
        if (onOpenInviteMember) onOpenInviteMember();
      },
      permitted: permissions?.teams?.inviteMembers,
    },
    {
      id: 'create-project',
      label: 'Create Project',
      desc: 'Define strategic initiatives & milestones',
      icon: FolderKanban,
      action: () => {
        setShowNewActionMenu(false);
        if (onOpenCreateProject) onOpenCreateProject();
      },
      permitted: permissions?.projects?.create,
    },
    {
      id: 'create-task',
      label: 'Create Task',
      desc: 'Assign actionable work items and criteria',
      icon: CheckSquare,
      action: () => {
        setShowNewActionMenu(false);
        if (onOpenCreateTask) onOpenCreateTask();
      },
      permitted: permissions?.tasks?.create,
    },
  ].filter(item => item.permitted !== false);

  return (
    <header className="h-16 border-b border-white/[0.08] bg-[#0F172A]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 text-slate-200">
      {/* Left Area: Mobile Menu, Breadcrumbs & Global Search Bar */}
      <div className="flex items-center gap-4 max-w-xl w-full">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-white/[0.06] transition-colors cursor-pointer shrink-0"
          title="Open Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Dynamic Route Breadcrumb */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 shrink-0 font-medium select-none">
          <span 
            onClick={() => setActiveTab('dashboard')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            {currentWorkspace?.name || 'Workspace OS'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-purple-400 font-semibold">{getBreadcrumbLabel(activeTab)}</span>
        </div>

        {/* Global Search / Command Bar */}
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#020617]/70 border border-white/[0.08] hover:border-purple-500/40 text-slate-400 hover:text-slate-200 text-xs transition-all shadow-inner group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            <span className="truncate">
              Search {activeTab.replace('_', ' ')} or run commands...
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-white/[0.06]">
              Ctrl + K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right Controls Area */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Global New Action dropdown menu */}
        {actionMenuItems.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowNewActionMenu(!showNewActionMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Action</span>
              <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${showNewActionMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showNewActionMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNewActionMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 mt-2 w-64 bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-2 z-50 text-xs"
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/[0.06] mb-1">
                      Quick Workspace Actions
                    </div>
                    <div className="space-y-1">
                      {actionMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={item.action}
                            className="w-full flex items-start gap-2.5 p-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
                          >
                            <div className="p-1.5 rounded-lg bg-purple-600/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-white leading-tight">{item.label}</div>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Role Badge */}
        <RoleBadge role={currentRole} size="md" />

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer"
            title="System Activity & Notifications"
          >
            <Bell className="w-4 h-4" />
            {systemLogs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" />
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-4 z-50 text-xs"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Live Activity Stream</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                        {systemLogs.length} events
                      </span>
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {systemLogs.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No recent workspace activities logged.
                      </div>
                    ) : (
                      systemLogs.slice(0, 6).map((log) => (
                        <div
                          key={log.id}
                          className="p-2.5 rounded-xl bg-[#111827] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span className="font-semibold text-slate-200">{log.user_name}</span>
                            <span className="font-mono text-slate-500">
                              {log.timestamp.includes(' ') ? log.timestamp.split(' ')[1] : log.timestamp}
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">{log.action}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
