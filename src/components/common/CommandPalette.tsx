import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Search, LayoutDashboard, FolderKanban, CheckSquare, FileText, 
  DollarSign, Users, BarChart3, CreditCard, Settings, ShieldAlert,
  Plus, UserPlus, FileUp, Sparkles, X, CornerDownLeft, BookOpen, Clock, Globe, Zap, GraduationCap, ShieldCheck, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SentryClient } from '../../lib/sentry';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateProject?: () => void;
  onOpenCreateTask?: () => void;
  onOpenCreateLead?: () => void;
  onOpenUploadDoc?: () => void;
  onOpenInviteMember?: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  action: () => void;
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
    crmRecords, permissions 
  } = useWorkspace();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        try {
          inputRef.current?.focus();
        } catch {
          // Ignore focus errors
        }
      }, 50);
      setQuery('');
      setSelectedIndex(0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Define quick navigation items based on role
  const navCommands = useMemo<CommandItem[]>(() => {
    try {
      const role = currentRole || 'employee';
      const items = [
        { id: 'nav-dashboard', label: 'Go to Command Center', icon: LayoutDashboard, category: 'Navigation', tab: 'dashboard', roles: ['admin', 'employee', 'intern', 'founder', 'platform_admin'] },
        { id: 'nav-crm', label: 'Go to CRM Pipeline', icon: DollarSign, category: 'Navigation', tab: 'crm', roles: ['admin', 'employee', 'founder', 'platform_admin'] },
        { id: 'nav-projects', label: 'Go to Projects', icon: FolderKanban, category: 'Navigation', tab: 'projects', roles: ['admin', 'employee', 'founder', 'platform_admin'] },
        { id: 'nav-tasks', label: 'Go to Tasks Engine', icon: CheckSquare, category: 'Navigation', tab: 'tasks', roles: ['admin', 'employee', 'intern', 'founder', 'platform_admin'] },
        { id: 'nav-teams', label: 'Go to People OS', icon: Users, category: 'Navigation', tab: 'teams', roles: ['admin', 'employee', 'founder', 'platform_admin'] },
        { id: 'nav-knowledge', label: 'Go to Knowledge Center', icon: BookOpen, category: 'Navigation', tab: 'knowledge', roles: ['admin', 'employee', 'intern', 'founder', 'platform_admin'] },
        { id: 'nav-wiki', label: 'Wiki & SOPs Documentation', icon: BookOpen, category: 'Navigation', tab: 'wiki', roles: ['admin', 'employee', 'intern', 'founder', 'platform_admin'] },
        { id: 'nav-sop', label: 'SOPs & Operational Guidelines', icon: BookOpen, category: 'Navigation', tab: 'wiki', roles: ['admin', 'employee', 'intern', 'founder', 'platform_admin'] },
        { id: 'nav-documents', label: 'Documents Vault & File Uploads', icon: FileText, category: 'Navigation', tab: 'documents', roles: ['admin', 'employee', 'intern', 'founder', 'platform_admin'] },
        { id: 'nav-file', label: 'Shared Files & Attachments', icon: FileText, category: 'Navigation', tab: 'documents', roles: ['admin', 'employee', 'intern', 'founder', 'platform_admin'] },
        { id: 'nav-settings', label: 'Go to Settings & Labs', icon: Settings, category: 'Navigation', tab: 'settings', roles: ['admin', 'founder', 'platform_admin'] },
        { id: 'nav-automations', label: 'Go to Automations Engine (Labs)', icon: Zap, category: 'Navigation', tab: 'automations', roles: ['admin', 'founder', 'platform_admin'] },
        { id: 'nav-time', label: 'Go to Time & Utilization (Labs)', icon: Clock, category: 'Navigation', tab: 'time', roles: ['admin', 'employee', 'founder', 'platform_admin'] },
        { id: 'nav-portal', label: 'Go to Client Portal (Labs)', icon: Globe, category: 'Navigation', tab: 'portal', roles: ['admin', 'employee', 'founder', 'platform_admin'] },
        { id: 'nav-analytics', label: 'Go to Analytics & Velocity (Labs)', icon: BarChart3, category: 'Navigation', tab: 'analytics', roles: ['admin', 'founder', 'platform_admin'] },
        { id: 'nav-admin_tools', label: 'Go to Admin RBAC Tools', icon: ShieldAlert, category: 'Navigation', tab: 'admin_tools', roles: ['admin', 'founder', 'platform_admin'] },
      ];

      return items
        .filter(item => Array.isArray(item.roles) && item.roles.includes(role))
        .map(cmd => ({
          id: cmd.id,
          label: cmd.label,
          icon: cmd.icon || Sparkles,
          category: cmd.category,
          action: () => {
            try {
              setActiveTab(cmd.tab);
            } catch (err) {
              SentryClient.captureException(err, { extra: { action: 'navigate', tab: cmd.tab } });
            } finally {
              onClose();
            }
          },
        }));
    } catch (err) {
      SentryClient.captureException(err, { extra: { context: 'getNavCommands' } });
      return [];
    }
  }, [currentRole, setActiveTab, onClose]);

  // Define quick action commands based on role permissions
  const actionCommands = useMemo<CommandItem[]>(() => {
    const actions: CommandItem[] = [];

    try {
      if (permissions?.tasks?.create && typeof onOpenCreateTask === 'function') {
        actions.push({
          id: 'action-task',
          label: 'Create New Task',
          icon: Plus,
          category: 'Quick Actions',
          action: () => {
            onClose();
            try {
              onOpenCreateTask();
            } catch (err) {
              SentryClient.captureException(err, { extra: { action: 'onOpenCreateTask' } });
            }
          },
        });
      }

      if (permissions?.projects?.create && typeof onOpenCreateProject === 'function') {
        actions.push({
          id: 'action-project',
          label: 'Create New Project',
          icon: Plus,
          category: 'Quick Actions',
          action: () => {
            onClose();
            try {
              onOpenCreateProject();
            } catch (err) {
              SentryClient.captureException(err, { extra: { action: 'onOpenCreateProject' } });
            }
          },
        });
      }

      if (permissions?.crm?.createRecord && typeof onOpenCreateLead === 'function') {
        actions.push({
          id: 'action-lead',
          label: 'Add CRM Lead',
          icon: Plus,
          category: 'Quick Actions',
          action: () => {
            onClose();
            try {
              onOpenCreateLead();
            } catch (err) {
              SentryClient.captureException(err, { extra: { action: 'onOpenCreateLead' } });
            }
          },
        });
      }

      if (permissions?.documents?.createOrgDoc && typeof onOpenUploadDoc === 'function') {
        actions.push({
          id: 'action-doc',
          label: 'Upload Document',
          icon: FileUp,
          category: 'Quick Actions',
          action: () => {
            onClose();
            try {
              onOpenUploadDoc();
            } catch (err) {
              SentryClient.captureException(err, { extra: { action: 'onOpenUploadDoc' } });
            }
          },
        });
      }

      if (permissions?.teams?.inviteMembers && typeof onOpenInviteMember === 'function') {
        actions.push({
          id: 'action-invite',
          label: 'Invite Team Member',
          icon: UserPlus,
          category: 'Quick Actions',
          action: () => {
            onClose();
            try {
              onOpenInviteMember();
            } catch (err) {
              SentryClient.captureException(err, { extra: { action: 'onOpenInviteMember' } });
            }
          },
        });
      }
    } catch (err) {
      SentryClient.captureException(err, { extra: { context: 'getActionCommands' } });
    }

    return actions;
  }, [permissions, onOpenCreateTask, onOpenCreateProject, onOpenCreateLead, onOpenUploadDoc, onOpenInviteMember, onClose]);

  // Search through entities (projects, tasks, docs, leads) with null-safety
  const entityMatches = useMemo<CommandItem[]>(() => {
    if (!query || typeof query !== 'string' || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const matches: CommandItem[] = [];

    // 1. Projects
    try {
      if (permissions?.projects?.viewAssigned || permissions?.projects?.viewAll) {
        const safeProjects = Array.isArray(projects) ? projects : [];
        safeProjects
          .filter(p => {
            if (!p || typeof p !== 'object') return false;
            const name = String(p.title || (p as any).name || '');
            const desc = String(p.description || '');
            return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
          })
          .slice(0, 4)
          .forEach((p, idx) => {
            const name = String(p.title || (p as any).name || 'Untitled Project');
            const id = p.id ? String(p.id) : `proj-idx-${idx}`;
            matches.push({
              id: `proj-${id}`,
              label: `Project: ${name}`,
              icon: FolderKanban,
              category: 'Projects',
              action: () => {
                try {
                  setActiveTab('projects');
                } catch (err) {
                  SentryClient.captureException(err, { extra: { action: 'openProject', projectId: id } });
                } finally {
                  onClose();
                }
              },
            });
          });
      }
    } catch (err) {
      SentryClient.captureException(err, { extra: { context: 'searchProjects' } });
    }

    // 2. Tasks
    try {
      const safeTasks = Array.isArray(tasks) ? tasks : [];
      safeTasks
        .filter(t => {
          if (!t || typeof t !== 'object') return false;
          const title = String(t.title || '');
          const desc = String(t.description || '');
          return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
        })
        .slice(0, 4)
        .forEach((t, idx) => {
          const title = String(t.title || 'Untitled Task');
          const id = t.id ? String(t.id) : `task-idx-${idx}`;
          matches.push({
            id: `task-${id}`,
            label: `Task: ${title}`,
            icon: CheckSquare,
            category: 'Tasks',
            action: () => {
              try {
                setActiveTab('tasks');
              } catch (err) {
                SentryClient.captureException(err, { extra: { action: 'openTask', taskId: id } });
              } finally {
                onClose();
              }
            },
          });
        });
    } catch (err) {
      SentryClient.captureException(err, { extra: { context: 'searchTasks' } });
    }

    // 3. Documents
    try {
      const safeDocs = Array.isArray(documents) ? documents : [];
      safeDocs
        .filter(d => {
          if (!d || typeof d !== 'object') return false;
          const title = String(d.title || (d as any).name || '');
          return title.toLowerCase().includes(q);
        })
        .slice(0, 4)
        .forEach((d, idx) => {
          const title = String(d.title || (d as any).name || 'Untitled Document');
          const id = d.id ? String(d.id) : `doc-idx-${idx}`;
          matches.push({
            id: `doc-${id}`,
            label: `Document: ${title}`,
            icon: FileText,
            category: 'Documents',
            action: () => {
              try {
                setActiveTab('documents');
              } catch (err) {
                SentryClient.captureException(err, { extra: { action: 'openDoc', docId: id } });
              } finally {
                onClose();
              }
            },
          });
        });
    } catch (err) {
      SentryClient.captureException(err, { extra: { context: 'searchDocuments' } });
    }

    // 4. CRM Leads
    try {
      if (permissions?.crm?.viewAssigned || permissions?.crm?.viewAll) {
        const safeCrm = Array.isArray(crmRecords) ? crmRecords : [];
        safeCrm
          .filter(c => {
            if (!c || typeof c !== 'object') return false;
            const cust = String(c.customer_name || (c as any).customerName || '');
            const comp = String(c.company || '');
            return cust.toLowerCase().includes(q) || comp.toLowerCase().includes(q);
          })
          .slice(0, 4)
          .forEach((c, idx) => {
            const cust = String(c.customer_name || (c as any).customerName || 'Contact');
            const comp = String(c.company || 'Company');
            const id = c.id ? String(c.id) : `crm-idx-${idx}`;
            matches.push({
              id: `crm-${id}`,
              label: `Lead: ${cust} (${comp})`,
              icon: DollarSign,
              category: 'CRM Pipeline',
              action: () => {
                try {
                  setActiveTab('crm');
                } catch (err) {
                  SentryClient.captureException(err, { extra: { action: 'openCrm', leadId: id } });
                } finally {
                  onClose();
                }
              },
            });
          });
      }
    } catch (err) {
      SentryClient.captureException(err, { extra: { context: 'searchCrm' } });
    }

    return matches;
  }, [query, projects, tasks, documents, crmRecords, permissions, setActiveTab, onClose]);

  // Combine and rank all searchable items
  const allItems = useMemo<CommandItem[]>(() => {
    try {
      const combined = [
        ...(actionCommands || []),
        ...(entityMatches || []),
        ...(navCommands || []),
      ];

      const cleanQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';

      return combined.filter(item => {
        if (!item || !item.label) return false;
        if (!cleanQuery) return true;
        const labelMatch = String(item.label).toLowerCase().includes(cleanQuery);
        const catMatch = item.category ? String(item.category).toLowerCase().includes(cleanQuery) : false;
        return labelMatch || catMatch;
      });
    } catch (err) {
      SentryClient.captureException(err, { extra: { context: 'combineAllItems' } });
      return [];
    }
  }, [actionCommands, entityMatches, navCommands, query]);

  // Safely clamp selected index whenever list length changes
  const safeSelectedIndex = useMemo(() => {
    if (allItems.length === 0) return 0;
    if (selectedIndex < 0) return 0;
    if (selectedIndex >= allItems.length) return allItems.length - 1;
    return selectedIndex;
  }, [selectedIndex, allItems.length]);

  // Handle keyboard navigation with boundary verification
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (allItems.length === 0 ? 0 : (prev + 1) % allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (allItems.length === 0 ? 0 : prev <= 0 ? allItems.length - 1 : prev - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSelectedIndex(Math.max(0, allItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = allItems[safeSelectedIndex];
      if (target && typeof target.action === 'function') {
        try {
          target.action();
        } catch (err) {
          SentryClient.captureException(err, { extra: { action: 'executeCommand', targetId: target.id } });
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4"
          data-testid="command-palette-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Workspace Command Palette"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm"
            data-testid="command-palette-backdrop"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-xl bg-white border border-[#E8E3DA] rounded-2xl shadow-[0_24px_50px_rgba(28,25,23,0.18)] overflow-hidden z-10 flex flex-col max-h-[70vh]"
          >
            {/* Search Input Bar */}
            <div className="p-3.5 border-b border-[#E8E3DA] flex items-center gap-3 bg-[#FAF8F5]">
              <Search className="w-5 h-5 text-amber-700 shrink-0" aria-hidden="true" />
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
                aria-label="Command search input"
                className="w-full bg-transparent text-sm text-stone-900 placeholder-stone-400 focus:outline-none font-medium"
                data-testid="command-palette-input"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSelectedIndex(0);
                    inputRef.current?.focus();
                  }}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-200 transition-colors"
                  aria-label="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[10px] font-mono text-stone-500 bg-[#F5F2EB] px-1.5 py-0.5 rounded border border-[#E2DDD3] select-none">
                ESC
              </span>
            </div>

            {/* Command List */}
            <div 
              ref={listContainerRef}
              className="overflow-y-auto p-2 divide-y divide-stone-100 max-h-[50vh]"
              role="listbox"
              aria-label="Search results"
              data-testid="command-palette-list"
            >
              {allItems.length === 0 ? (
                <div className="p-8 text-center" data-testid="command-palette-empty">
                  <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#E8E3DA] text-stone-400 flex items-center justify-center mx-auto mb-2">
                    <Search className="w-4 h-4 opacity-60" />
                  </div>
                  <p className="text-xs font-semibold text-stone-700">
                    No matching commands or resources found
                  </p>
                  {query && (
                    <p className="text-[11px] text-stone-500 mt-1 font-mono truncate max-w-xs mx-auto">
                      &quot;{query}&quot;
                    </p>
                  )}
                  <p className="text-[11px] text-stone-400 mt-2">
                    Try searching for projects, tasks, documents, or navigation destinations.
                  </p>
                </div>
              ) : (
                allItems.map((item, idx) => {
                  const Icon = item.icon && typeof item.icon === 'function' ? item.icon : Sparkles;
                  const isSelected = idx === safeSelectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        if (typeof item.action === 'function') {
                          try {
                            item.action();
                          } catch (err) {
                            SentryClient.captureException(err, { extra: { action: 'clickCommand', itemId: item.id } });
                          }
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      data-testid={`command-item-${idx}`}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#1C1917] text-white shadow-md shadow-stone-900/10'
                          : 'text-stone-700 hover:bg-[#F5F2EB]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-[#FAF8F5] text-amber-700 border border-[#E8E3DA]'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isSelected ? 'bg-white/10 text-stone-200' : 'bg-[#FAF8F5] text-stone-500 border border-[#E8E3DA]'
                        }`}>
                          {item.category}
                        </span>
                        {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-white/80 shrink-0" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Navigation Hints */}
            <div className="p-2.5 bg-[#FAF8F5] border-t border-[#E8E3DA] flex items-center justify-between text-[11px] text-stone-500 px-4 select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="bg-white border border-[#E8E3DA] px-1.5 py-0.5 rounded text-[10px] text-stone-600 font-mono shadow-xs">↑</kbd>
                  <kbd className="bg-white border border-[#E8E3DA] px-1.5 py-0.5 rounded text-[10px] text-stone-600 font-mono shadow-xs">↓</kbd> to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-white border border-[#E8E3DA] px-1.5 py-0.5 rounded text-[10px] text-stone-600 font-mono shadow-xs">↵</kbd> to select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-white border border-[#E8E3DA] px-1.5 py-0.5 rounded text-[10px] text-stone-600 font-mono shadow-xs">ESC</kbd> to close
                </span>
              </div>
              <span className="text-[10px] text-amber-800 font-bold">Workspace OS Search</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
