import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../common/ToastContainer';
import { CommandPalette } from '../common/CommandPalette';
import { useWorkspace } from '../../context/WorkspaceContext';
import { motion, AnimatePresence } from 'motion/react';

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenCreateProject?: () => void;
  onOpenCreateTask?: () => void;
  onOpenCreateLead?: () => void;
  onOpenUploadDoc?: () => void;
  onOpenInviteMember?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children,
  onOpenCreateProject,
  onOpenCreateTask,
  onOpenCreateLead,
  onOpenUploadDoc,
  onOpenInviteMember,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { activeTab } = useWorkspace();

  // Listen for Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col font-sans text-slate-100 selection:bg-purple-600 selection:text-white">
      <div className="flex flex-1 overflow-hidden">
        {/* Responsive Enterprise Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-gradient-to-b from-[#0F172A]/50 to-[#020617]">
          <Header
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenQuickCreate={onOpenCreateTask || onOpenCreateProject}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="w-full pb-16"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Global Raycast-Style Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenCreateProject={onOpenCreateProject}
        onOpenCreateTask={onOpenCreateTask}
        onOpenCreateLead={onOpenCreateLead}
        onOpenUploadDoc={onOpenUploadDoc}
        onOpenInviteMember={onOpenInviteMember}
      />

      {/* Enterprise Toast System */}
      <ToastContainer />
    </div>
  );
};
