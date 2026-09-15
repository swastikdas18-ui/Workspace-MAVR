import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Search, Bell, Menu, Plus, Sparkles, CheckCircle2, 
  AlertCircle, Info, ExternalLink, ShieldCheck, X, ChevronRight,
  Users, UserPlus, FolderKanban, CheckSquare, ChevronDown, BookOpen, FileText
} from 'lucide-react';
import { RoleBadge } from '../common/RoleBadge';
import { NotificationBell } from '../common/NotificationBell';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
  onOpenQuickCreate?: () => void;
  onOpenCreateTeam?: () => void;
  onOpenInviteMember?: () => void;
  onOpenCreateProject?: () => void;
  onOpenCreateTask?: () => void;
  onOpenCreateWiki?: () => void;
  onOpenUploadDoc?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onOpenCommandPalette,
  onOpenQuickCreate,
  onOpenCreateTeam,
  onOpenInviteMember,
  onOpenCreateProject,
  onOpenCreateTask,
  onOpenCreateWiki,
  onOpenUploadDoc,
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
      case 'dashboard': return currentRole === 'admin' ? 'Command Center' : currentRole === 'employee' ? 'Productivity Hub' : 'Learning Sandbox';
      case 'teams': return 'People OS';
      case 'time': return 'Time & Utilization';
      case 'crm': return 'CRM Pipeline';
      case 'knowledge': return 'Knowledge Center';
      case 'settings': return 'Settings & Labs';
      case 'portal': return 'Client Portal';
      default: return tab.charAt(0).toUpperCase() + tab.slice(1);
    }
  };

  const actionMenuItems = [
    {
      id: 'create-wiki',
      label: 'Create Wiki',
      desc: 'Author SOPs & workspace documentation',
      icon: BookOpen,
      action: () => {
        setShowNewActionMenu(false);
        if (onOpenCreateWiki) onOpenCreateWiki();
      },
      permitted: currentRole !== 'intern',
    },
    {
      id: 'upload-doc',
      label: 'Upload Document',
      desc: 'Upload PDFs, DOCX & vault files',
      icon: FileText,
      action: () => {
        setShowNewActionMenu(false);
        if (onOpenUploadDoc) onOpenUploadDoc();
      },
      permitted: currentRole !== 'intern',
    },
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
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-[14px] bg-[#020617]/90 border border-white/[0.1] hover:border-purple-500/50 hover:bg-[#070B16] text-slate-400 hover:text-slate-100 text-xs transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_1px_4px_rgba(0,0,0,0.3)] group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors shrink-0" />
            <span className="truncate font-normal text-slate-300 group-hover:text-white">
              Search or jump to...
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-[6px] border border-white/[0.1] shadow-sm">
              <span className="text-[11px]">⌘</span>K
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

        {/* Real-time Notification Center Bell & Drawer */}
        <NotificationBell />
      </div>
    </header>
  );
};
