import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, Check, ChevronDown, Plus, Sparkles, Shield, Users, ArrowRight, Layers 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface WorkspaceSelectorProps {
  compact?: boolean;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ compact = false }) => {
  const { 
    currentWorkspace, 
    userWorkspaces, 
    switchWorkspace, 
    createNewWorkspace,
    isWorkspaceLoading,
    currentRole,
    setActiveTab 
  } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newPlan, setNewPlan] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (wsId: string) => {
    if (wsId === currentWorkspace?.id) {
      setIsOpen(false);
      return;
    }
    await switchWorkspace(wsId);
    setIsOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsSubmitting(true);
    const created = await createNewWorkspace(newWorkspaceName.trim(), newPlan);
    setIsSubmitting(false);

    if (created) {
      setNewWorkspaceName('');
      setShowCreateModal(false);
      setIsOpen(false);
    }
  };

  const displayWorkspaces = userWorkspaces.length > 0 ? userWorkspaces : [currentWorkspace];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isWorkspaceLoading}
        className={`flex items-center gap-2.5 rounded-[14px] border border-[#E8E3DA] bg-white hover:bg-[#FAF8F5] hover:border-amber-600/30 transition-all text-left group cursor-pointer shadow-[0_1px_2px_rgba(28,25,23,0.03)] ${
          compact ? 'px-2.5 py-1.5' : 'px-3 py-2 w-full'
        }`}
      >
        {/* Organization Avatar */}
        <div className="w-7 h-7 rounded-[10px] bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-800 flex items-center justify-center font-bold text-white text-xs shadow-[0_2px_8px_rgba(180,83,9,0.2)] shrink-0 border border-white/20">
          {currentWorkspace?.name ? currentWorkspace.name.substring(0, 2).toUpperCase() : 'WS'}
        </div>

        {!compact && (
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900 truncate block tracking-tight group-hover:text-amber-800 transition-colors">
                {currentWorkspace?.name || 'Workspace OS'}
              </span>
              <span className="ui-mono text-[9px] uppercase px-1.5 py-0.2 rounded-[6px] bg-amber-100 text-amber-800 font-bold border border-amber-200">
                PRO
              </span>
            </div>
            <span className="ui-caption text-stone-400 block truncate text-[10px]">
              {currentWorkspace?.slug || 'workspace'}
            </span>
          </div>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-2 w-72 bg-white border border-[#E8E3DA] rounded-[18px] shadow-[0_16px_36px_rgba(28,25,23,0.12)] z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-[#E8E3DA] flex items-center justify-between bg-[#FAF8F5]">
              <span className="ui-caption font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                Workspaces ({displayWorkspaces.length})
              </span>
              <span className="ui-mono text-[10px] text-amber-800 font-semibold">
                {currentWorkspace?.name}
              </span>
            </div>

            {/* Workspace list */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
              {displayWorkspaces.map((ws) => {
                const isActive = ws.id === currentWorkspace?.id;
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => handleSwitch(ws.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-[12px] text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#EAE5DC] border border-[#DDD7CC] text-stone-950 font-bold'
                        : 'hover:bg-[#F5F2EB] text-stone-700 hover:text-stone-950 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-[8px] flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                        isActive ? 'bg-amber-700 text-white border-amber-600' : 'bg-stone-100 text-stone-600 border-[#E8E3DA]'
                      }`}>
                        {ws.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate block max-w-[130px]">
                            {ws.name}
                          </span>
                          {isActive && (
                            <span className="ui-mono text-[9px] uppercase px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                              active
                            </span>
                          )}
                        </div>
                        <span className="ui-caption text-stone-400 block truncate text-[10px]">
                          {ws.role ? ws.role.toUpperCase() : 'MEMBER'} • {ws.member_count || 1} member{(ws.member_count || 1) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Create New Workspace & Manage buttons */}
            <div className="p-2 border-t border-[#E8E3DA] bg-[#FAF8F5] space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('workspaces');
                  setIsOpen(false);
                  window.history.pushState(null, '', '/workspaces');
                }}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-[10px] hover:bg-stone-200/50 ui-caption font-medium text-stone-600 hover:text-stone-900 transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                Workspaces Gateway
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[12px] bg-[#1C1917] hover:bg-[#292524] text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Workspace
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#E8E3DA] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Create New Workspace</h3>
                  <p className="text-xs text-stone-500">Launch a dedicated instance for another team or company.</p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Innovations, Mavr Design Lab"
                    className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#E8E3DA] rounded-lg text-sm text-stone-900 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Workspace OS MVP — Free & Unlimited</span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-1">
                    Every workspace includes unlimited projects, teams, members, tasks, document vault, and full operational features.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newWorkspaceName.trim()}
                    className="px-4 py-2 bg-[#1C1917] hover:bg-[#292524] text-white rounded-lg text-xs font-semibold shadow-md shadow-stone-900/10 hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Provisioning...' : 'Create & Enter Workspace'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
