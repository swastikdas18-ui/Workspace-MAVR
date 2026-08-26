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
  const [newPlan, setNewPlan] = useState<'free' | 'pro' | 'enterprise'>('pro');
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
        className={`flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#0F172A]/70 hover:bg-[#1E293B]/80 hover:border-purple-500/30 transition-all text-left group cursor-pointer ${
          compact ? 'px-2.5 py-1.5' : 'px-3 py-2 w-full'
        }`}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-purple-600/20 shrink-0">
          {currentWorkspace?.name ? currentWorkspace.name.substring(0, 2).toUpperCase() : 'WS'}
        </div>

        {!compact && (
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-100 truncate block">
                {currentWorkspace?.name || 'Workspace OS'}
              </span>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                {currentWorkspace?.plan || 'PRO'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block truncate">
              {currentWorkspace?.slug || 'workspace'} • {currentRole.toUpperCase()}
            </span>
          </div>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-72 bg-[#0F172A] border border-slate-700/60 rounded-xl shadow-2xl shadow-black/80 z-50 overflow-hidden backdrop-blur-xl"
          >
            <div className="p-2 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase px-2">
                Your Workspaces ({displayWorkspaces.length})
              </span>
              <span className="text-[10px] text-purple-400 font-mono">
                Active: {currentWorkspace?.name}
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
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-900/30 border border-purple-500/30 text-white'
                        : 'hover:bg-white/[0.05] text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isActive ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {ws.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate block max-w-[130px]">
                            {ws.name}
                          </span>
                          <span className="text-[9px] uppercase font-mono px-1 py-0.1 rounded bg-slate-800 text-slate-400">
                            {ws.plan}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {ws.role ? ws.role.toUpperCase() : 'MEMBER'} • {ws.member_count || 1} member{(ws.member_count || 1) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <Check className="w-4 h-4 text-purple-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Create New Workspace & Manage buttons */}
            <div className="p-2 border-t border-white/[0.06] bg-slate-900/50 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('workspaces');
                  setIsOpen(false);
                  window.history.pushState(null, '', '/workspaces');
                }}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg hover:bg-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                All Workspaces Gateway
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-purple-600/20 hover:border-purple-500/30 border border-white/[0.06] text-xs font-semibold text-purple-300 hover:text-white transition-all cursor-pointer"
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0F172A] border border-slate-700/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Create New Workspace</h3>
                  <p className="text-xs text-slate-400">Launch a dedicated instance for another team or company.</p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Innovations, Mavr Design Lab"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Initial Plan
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['free', 'pro', 'enterprise'] as const).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setNewPlan(tier)}
                        className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                          newPlan === tier
                            ? 'bg-purple-900/30 border-purple-500 text-white'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-bold uppercase block">{tier}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {tier === 'free' ? '$0/mo' : tier === 'pro' ? '$49/mo' : '$199/mo'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newWorkspaceName.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-semibold shadow-lg shadow-purple-600/30 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
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
