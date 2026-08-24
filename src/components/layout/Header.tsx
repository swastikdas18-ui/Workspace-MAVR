import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Search, Bell, Menu, Plus, Sparkles, CheckCircle2, 
  AlertCircle, Info, ExternalLink, ShieldCheck, X
} from 'lucide-react';
import { RoleBadge } from '../common/RoleBadge';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
  onOpenQuickCreate?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onOpenCommandPalette,
  onOpenQuickCreate,
}) => {
  const { 
    currentUser, currentRole, searchQuery, setSearchQuery, 
    activeTab, systemLogs, permissions 
  } = useWorkspace();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 border-b border-white/[0.08] bg-[#0F172A]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 text-slate-200">
      {/* Left Area: Mobile Menu & Global Search Bar */}
      <div className="flex items-center gap-3 max-w-lg w-full">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-white/[0.06] transition-colors cursor-pointer"
          title="Open Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

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
        {/* Quick Action (+ New) button if permitted */}
        {(permissions.tasks.create || permissions.projects.create) && (
          <button
            onClick={onOpenQuickCreate || onOpenCommandPalette}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Action</span>
          </button>
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
