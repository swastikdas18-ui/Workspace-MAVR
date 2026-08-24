import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Search, LayoutDashboard, FolderKanban, CheckSquare, FileText, 
  DollarSign, Users, BarChart3, CreditCard, Settings, ShieldAlert,
  Plus, UserPlus, FileUp, Sparkles, X, ArrowRight, CornerDownLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateProject?: () => void;
  onOpenCreateTask?: () => void;
  onOpenCreateLead?: () => void;
  onOpenUploadDoc?: () => void;
  onOpenInviteMember?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenCreateProject,
  onOpenCreateTask,
  onOpenCreateLead,
  onOpenUploadDoc,
  onOpenInviteMember,
}) => {
  const { 
    currentRole, setActiveTab, projects, tasks, documents, 
    crmRecords, users, permissions 
  } = useWorkspace();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Define quick navigation items based on role
  const getNavCommands = () => {
    const role = currentRole || 'employee';
    const items = [
      { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, category: 'Navigation', tab: 'dashboard', roles: ['admin', 'employee', 'intern'] },
      { id: 'projects', label: 'Go to Projects', icon: FolderKanban, category: 'Navigation', tab: 'projects', roles: ['admin', 'employee'] },
      { id: 'tasks', label: 'Go to Tasks Engine', icon: CheckSquare, category: 'Navigation', tab: 'tasks', roles: ['admin', 'employee', 'intern'] },
      { id: 'documents', label: 'Go to Documents', icon: FileText, category: 'Navigation', tab: 'documents', roles: ['admin', 'employee', 'intern'] },
      { id: 'crm', label: 'Go to CRM Pipeline', icon: DollarSign, category: 'Navigation', tab: 'crm', roles: ['admin', 'employee'] },
      { id: 'teams', label: 'Go to Team Directory', icon: Users, category: 'Navigation', tab: 'teams', roles: ['admin', 'employee'] },
      { id: 'analytics', label: 'Go to Analytics & Velocity', icon: BarChart3, category: 'Navigation', tab: 'analytics', roles: ['admin'] },
      { id: 'billing', label: 'Go to Billing & Subscriptions', icon: CreditCard, category: 'Navigation', tab: 'billing', roles: ['admin'] },
      { id: 'settings', label: 'Go to Workspace Settings', icon: Settings, category: 'Navigation', tab: 'settings', roles: ['admin'] },
      { id: 'admin_tools', label: 'Go to Admin RBAC Tools', icon: ShieldAlert, category: 'Navigation', tab: 'admin_tools', roles: ['admin'] },
    ];

    return items.filter(item => item.roles.includes(role));
  };

  // Define quick action commands based on role permissions
  const getActionCommands = () => {
    const actions = [];

    if (permissions?.tasks?.create && onOpenCreateTask) {
      actions.push({
        id: 'action-task',
        label: 'Create New Task',
        icon: Plus,
        category: 'Quick Actions',
        action: () => { onClose(); onOpenCreateTask(); }
      });
    }

    if (permissions?.projects?.create && onOpenCreateProject) {
      actions.push({
        id: 'action-project',
        label: 'Create New Project',
        icon: Plus,
        category: 'Quick Actions',
        action: () => { onClose(); onOpenCreateProject(); }
      });
    }

    if (permissions?.crm?.createRecord && onOpenCreateLead) {
      actions.push({
        id: 'action-lead',
        label: 'Add CRM Lead',
        icon: Plus,
        category: 'Quick Actions',
        action: () => { onClose(); onOpenCreateLead(); }
      });
    }

    if (permissions?.documents?.createOrgDoc && onOpenUploadDoc) {
      actions.push({
        id: 'action-doc',
        label: 'Upload Document',
        icon: FileUp,
        category: 'Quick Actions',
        action: () => { onClose(); onOpenUploadDoc(); }
      });
    }

    if (permissions?.teams?.inviteMembers && onOpenInviteMember) {
      actions.push({
        id: 'action-invite',
        label: 'Invite Team Member',
        icon: UserPlus,
        category: 'Quick Actions',
        action: () => { onClose(); onOpenInviteMember(); }
      });
    }

    return actions;
  };

  // Search through entities (projects, tasks, docs, leads)
  const getEntityMatches = () => {
    if (!query || typeof query !== 'string' || !query.trim()) return [];
    const q = query.trim().toLowerCase();

    const matches: Array<{
      id: string;
      label: string;
      icon: any;
      category: string;
      action: () => void;
    }> = [];

    // Projects
    const safeProjects = Array.isArray(projects) ? projects : [];
    if (permissions?.projects?.viewAssigned || permissions?.projects?.viewAll) {
      safeProjects
        .filter(p => {
          if (!p) return false;
          const name = p.title || (p as any).name || '';
          const desc = p.description || '';
          return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
        })
        .slice(0, 3)
        .forEach(p => {
          const name = p.title || (p as any).name || 'Untitled Project';
          matches.push({
            id: `proj-${p.id}`,
            label: `Project: ${name}`,
            icon: FolderKanban,
            category: 'Projects',
            action: () => { setActiveTab('projects'); onClose(); }
          });
        });
    }

    // Tasks
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    safeTasks
      .filter(t => {
        if (!t) return false;
        const title = t.title || '';
        const desc = t.description || '';
        return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      })
      .slice(0, 3)
      .forEach(t => {
        matches.push({
          id: `task-${t.id}`,
          label: `Task: ${t.title || 'Untitled Task'}`,
          icon: CheckSquare,
          category: 'Tasks',
          action: () => { setActiveTab('tasks'); onClose(); }
        });
      });

    // Documents
    const safeDocs = Array.isArray(documents) ? documents : [];
    safeDocs
      .filter(d => {
        if (!d) return false;
        const title = d.title || '';
        return title.toLowerCase().includes(q);
      })
      .slice(0, 3)
      .forEach(d => {
        matches.push({
          id: `doc-${d.id}`,
          label: `Doc: ${d.title || 'Untitled Doc'}`,
          icon: FileText,
          category: 'Documents',
          action: () => { setActiveTab('documents'); onClose(); }
        });
      });

    // CRM Leads
    const safeCrm = Array.isArray(crmRecords) ? crmRecords : [];
    if (permissions?.crm?.viewAssigned || permissions?.crm?.viewAll) {
      safeCrm
        .filter(c => {
          if (!c) return false;
          const cust = c.customer_name || (c as any).customerName || '';
          const comp = c.company || '';
          return cust.toLowerCase().includes(q) || comp.toLowerCase().includes(q);
        })
        .slice(0, 3)
        .forEach(c => {
          const cust = c.customer_name || (c as any).customerName || 'Contact';
          const comp = c.company || 'Company';
          matches.push({
            id: `crm-${c.id}`,
            label: `Lead: ${cust} (${comp})`,
            icon: DollarSign,
            category: 'CRM Pipeline',
            action: () => { setActiveTab('crm'); onClose(); }
          });
        });
    }

    return matches;
  };

  const navCommands = getNavCommands().map(cmd => ({
    ...cmd,
    action: () => { setActiveTab(cmd.tab); onClose(); }
  }));

  const allItems = [
    ...(getActionCommands() || []),
    ...(getEntityMatches() || []),
    ...(navCommands || []),
  ].filter(item => {
    if (!item || !item.label) return false;
    if (!query || !query.trim()) return true;
    const q = query.trim().toLowerCase();
    const labelMatch = item.label.toLowerCase().includes(q);
    const catMatch = item.category ? item.category.toLowerCase().includes(q) : false;
    return labelMatch || catMatch;
  });

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < allItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-xl bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[70vh]"
          >
            {/* Search Input Bar */}
            <div className="p-3.5 border-b border-white/[0.08] flex items-center gap-3 bg-[#111827]">
              <Search className="w-5 h-5 text-purple-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search workspace initiatives..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-white/[0.06]">
                ESC
              </span>
            </div>

            {/* Command List */}
            <div className="overflow-y-auto p-2 divide-y divide-white/[0.04]">
              {allItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No matching commands or resources found for &quot;{query}&quot;
                </div>
              ) : (
                allItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/30'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-purple-400 border border-white/[0.06]'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isSelected ? 'bg-purple-900/60 text-purple-200' : 'bg-slate-800/80 text-slate-400'
                        }`}>
                          {item.category}
                        </span>
                        {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-white/80" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Navigation Hints */}
            <div className="p-2.5 bg-[#020617] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 px-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="bg-slate-800 px-1 rounded text-[9px] text-slate-300">↑</kbd>
                  <kbd className="bg-slate-800 px-1 rounded text-[9px] text-slate-300">↓</kbd> to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-slate-800 px-1 rounded text-[9px] text-slate-300">↵</kbd> to select
                </span>
              </div>
              <span className="text-[10px] text-purple-400 font-medium">Workspace OS Command Engine</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
