import React, { useState } from 'react';
import { 
  Building2, Plus, ArrowRight, Shield, Users, CheckCircle2, 
  Sparkles, LogOut, ChevronRight, Layers, Crown, Briefcase, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { UserRole, Workspace } from '../../types';

export const WorkspacesSelectionPage: React.FC = () => {
  const { 
    currentUser, 
    userWorkspaces, 
    currentWorkspace, 
    switchWorkspace, 
    createNewWorkspace, 
    setActiveTab, 
    logout,
    isWorkspaceLoading 
  } = useWorkspace();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newPlan, setNewPlan] = useState<'free' | 'pro' | 'enterprise'>('pro');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSelect = async (ws: Workspace) => {
    setSwitchingId(ws.id);
    const ok = await switchWorkspace(ws.id);
    setSwitchingId(null);
    if (ok) {
      setActiveTab('dashboard');
      const targetRole = ws.role || currentUser?.role || 'employee';
      window.history.pushState(null, '', `/${targetRole}/dashboard`);
    }
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
      setActiveTab('dashboard');
      window.history.pushState(null, '', '/admin/dashboard');
    }
  };

  const getRoleBadge = (role?: UserRole | string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3 text-purple-400" />
            ADMIN
          </span>
        );
      case 'intern':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <GraduationCap className="w-3 h-3 text-emerald-400" />
            INTERN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full">
            <Briefcase className="w-3 h-3 text-blue-400" />
            EMPLOYEE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/[0.06] relative z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-purple-600/30 flex items-center justify-center">
            <span className="font-bold text-base text-white">W</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">WORKSPACE OS</h1>
            <p className="text-[11px] text-slate-400 font-mono">Tenant Gateway</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="w-6 h-6 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center font-bold text-purple-300 text-[10px]">
              {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-semibold text-slate-200 block leading-tight">{currentUser?.name}</span>
              <span className="text-[10px] text-slate-400 font-mono leading-tight">{currentUser?.email}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 text-xs text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="max-w-3xl w-full space-y-6">
          {/* Headline */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono font-medium">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Multi-Tenant Cluster Access
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Select Your Workspace
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              You are a member of {userWorkspaces.length} workspaces. Choose an organization instance to open your dashboard.
            </p>
          </div>

          {/* Workspaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userWorkspaces.map((ws) => {
              const isActive = ws.id === currentWorkspace?.id;
              const isSwitching = switchingId === ws.id;

              return (
                <motion.div
                  key={ws.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => !isSwitching && handleSelect(ws)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isActive
                      ? 'bg-[#0F172A] border-purple-500/50 shadow-xl shadow-purple-950/40 ring-1 ring-purple-500/30'
                      : 'bg-[#0F172A]/70 hover:bg-[#1E293B]/80 border-slate-800 hover:border-purple-500/40 shadow-lg'
                  }`}
                >
                  {/* Active indicator badge */}
                  {isActive && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-mono text-purple-300 bg-purple-950/80 border border-purple-500/40 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      Active
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-purple-600/30 shrink-0 group-hover:scale-105 transition-transform">
                      {ws.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                          {ws.name}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-400 font-mono truncate">
                        {ws.slug}.workspace.dev
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        {getRoleBadge(ws.role)}
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800/90 text-slate-400 border border-slate-700/50">
                          {ws.plan} TIER
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer metadata & action */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {ws.member_count || 1} team member{(ws.member_count || 1) > 1 ? 's' : ''}
                    </span>

                    <span className="flex items-center gap-1 text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
                      {isSwitching ? 'Loading...' : 'Launch'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* Create New Workspace Card */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              onClick={() => setShowCreateModal(true)}
              className="p-5 rounded-2xl border border-dashed border-slate-700/80 hover:border-purple-500/60 bg-slate-900/30 hover:bg-purple-950/15 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 min-h-[140px] group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-purple-600/20 border border-slate-700 group-hover:border-purple-500/40 flex items-center justify-center text-slate-400 group-hover:text-purple-300 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                  Create New Workspace
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Launch a dedicated tenant cluster for a new organization.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Bottom link for onboarding or invites */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('onboarding');
                window.history.pushState(null, '', '/onboarding');
              }}
              className="text-xs text-slate-400 hover:text-purple-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Have an invite token or want to set up an additional organization?</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 border-t border-white/[0.06] text-center text-xs text-slate-500 relative z-10">
        Workspace OS • ISO 27001 & SOC-2 Compliant Multi-Tenant Infrastructure
      </footer>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0F172A] border border-slate-700/70 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
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
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
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
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          newPlan === tier
                            ? 'bg-purple-900/40 border-purple-500 text-white shadow-lg shadow-purple-950/30'
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
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
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
