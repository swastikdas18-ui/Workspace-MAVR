import React, { useState } from 'react';
import { 
  Building2, Plus, ArrowRight, Users, 
  LogOut, ChevronRight, Layers, Crown, Briefcase, GraduationCap
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
    logout 
  } = useWorkspace();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newPlan, setNewPlan] = useState<'free' | 'pro' | 'enterprise'>('free');
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
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-100/80 border border-amber-300/60 px-2.5 py-0.5 rounded-full">
            <Crown className="w-3 h-3 text-amber-700" />
            ADMIN
          </span>
        );
      case 'intern':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-900 bg-emerald-100/80 border border-emerald-300/60 px-2.5 py-0.5 rounded-full">
            <GraduationCap className="w-3 h-3 text-emerald-700" />
            INTERN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-900 bg-sky-100/80 border border-sky-300/60 px-2.5 py-0.5 rounded-full">
            <Briefcase className="w-3 h-3 text-sky-700" />
            EMPLOYEE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-stone-200/40 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-[#E8E3DA] bg-[#FBF9F5]/90 relative z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1C1917] p-0.5 shadow-md flex items-center justify-center">
            <span className="font-bold text-base text-amber-300 font-heading">W</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-stone-900 font-heading">WORKSPACE OS</h1>
            <p className="text-[11px] text-stone-500 font-mono">Tenant Gateway</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white border border-[#E8E3DA] text-xs shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-300/60 flex items-center justify-center font-bold text-amber-900 text-[10px]">
              {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-semibold text-stone-900 block leading-tight">{currentUser?.name}</span>
              <span className="text-[10px] text-stone-500 font-mono leading-tight">{currentUser?.email}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-[#E8E3DA] hover:border-rose-200 text-xs text-stone-600 hover:text-rose-700 transition-all cursor-pointer shadow-2xs"
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-mono font-medium">
              <Layers className="w-3.5 h-3.5 text-amber-700" />
              Multi-Tenant Cluster Access
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-heading">
              Select Your Workspace
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto font-normal">
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
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group bg-white ${
                    isActive
                      ? 'border-amber-600 shadow-xl shadow-amber-900/5 ring-2 ring-amber-500/20'
                      : 'border-[#E8E3DA] hover:border-amber-400/80 shadow-xs hover:shadow-md'
                  }`}
                >
                  {/* Active indicator badge */}
                  {isActive && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300/80 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-700 animate-pulse" />
                      Active
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#1C1917] flex items-center justify-center font-black text-lg text-amber-300 shadow-md shadow-stone-900/10 shrink-0 group-hover:scale-105 transition-transform font-heading">
                      {ws.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-stone-900 truncate group-hover:text-amber-800 transition-colors font-heading">
                          {ws.name}
                        </h3>
                      </div>

                      <p className="text-xs text-stone-500 font-mono truncate">
                        {ws.slug}.workspace.dev
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        {getRoleBadge(ws.role)}
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 font-semibold">
                          {ws.plan} TIER
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer metadata & action */}
                  <div className="mt-4 pt-3 border-t border-[#E8E3DA] flex items-center justify-between text-xs text-stone-500">
                    <span className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      {ws.member_count || 1} team member{(ws.member_count || 1) > 1 ? 's' : ''}
                    </span>

                    <span className="flex items-center gap-1 text-xs font-bold text-amber-800 group-hover:translate-x-1 transition-transform">
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
              className="p-5 rounded-2xl border border-dashed border-[#D5CFC3] hover:border-amber-500/70 bg-white/70 hover:bg-amber-50/30 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 min-h-[140px] group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-amber-100 border border-[#E8E3DA] group-hover:border-amber-300 flex items-center justify-center text-stone-600 group-hover:text-amber-800 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-stone-900 group-hover:text-amber-800 transition-colors font-heading">
                  Create New Workspace
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
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
              className="text-xs text-stone-600 hover:text-stone-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <span>Have an invite token or want to set up an additional organization?</span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 border-t border-[#E8E3DA] text-center text-xs text-stone-500 relative z-10 bg-[#F5F2EB]/50">
        Workspace OS • ISO 27001 & SOC-2 Compliant Multi-Tenant Infrastructure
      </footer>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#E8E3DA] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-stone-900 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-700 to-stone-900" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-800">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 font-heading">Create New Workspace</h3>
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
                    className="ui-input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
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
                            ? 'bg-amber-50 border-amber-600 text-amber-900 shadow-sm font-semibold'
                            : 'bg-[#FAF8F5] border-[#E8E3DA] text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        <span className="text-xs font-bold uppercase block">{tier}</span>
                        <span className="text-[10px] text-stone-500 block mt-0.5">
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
                    className="px-4 py-2 text-xs text-stone-600 hover:text-stone-900 transition-colors cursor-pointer font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newWorkspaceName.trim()}
                    className="px-5 py-2.5 bg-[#1C1917] hover:bg-[#292524] text-white rounded-xl text-xs font-semibold shadow-md shadow-stone-900/10 transition-all disabled:opacity-50 cursor-pointer"
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
