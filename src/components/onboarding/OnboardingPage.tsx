import React, { useState } from 'react';
import { 
  Building2, ArrowRight, Sparkles, Shield, CheckCircle2, 
  KeyRound, Users, ChevronRight, Layers, Lock 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface OnboardingPageProps {
  onComplete?: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const { 
    currentUser, 
    userWorkspaces, 
    currentWorkspace, 
    createNewWorkspace, 
    switchWorkspace, 
    setActiveTab, 
    currentRole 
  } = useWorkspace();

  const [mode, setMode] = useState<'create' | 'invite'>('create');
  const [workspaceName, setWorkspaceName] = useState('');
  const [plan, setPlan] = useState<'free' | 'pro' | 'enterprise'>('pro');
  const [inviteToken, setInviteToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const ws = await createNewWorkspace(workspaceName.trim(), plan);
    setIsSubmitting(false);

    if (ws) {
      if (onComplete) onComplete();
      setActiveTab('dashboard');
      window.history.pushState(null, '', `/${ws.role || 'admin'}/dashboard`);
    } else {
      setErrorMsg('Failed to create workspace. Please check your connection.');
    }
  };

  const handleEnterExisting = async (wsId: string) => {
    setIsSubmitting(true);
    const success = await switchWorkspace(wsId);
    setIsSubmitting(false);
    if (success) {
      if (onComplete) onComplete();
      setActiveTab('dashboard');
      window.history.pushState(null, '', `/${currentRole}/dashboard`);
    }
  };

  const slugPreview = workspaceName
    ? workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : 'your-company';

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/[0.06] relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-purple-600/30 flex items-center justify-center">
            <span className="font-bold text-base text-white">W</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">WORKSPACE OS</h1>
            <p className="text-[11px] text-slate-400 font-mono">Multi-Tenant Setup Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Signed in as:</span>
          <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700/60 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-200">{currentUser?.email}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="max-w-2xl w-full">
          {/* If user already has workspaces */}
          {userWorkspaces.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    You already have access to {userWorkspaces.length} workspace{userWorkspaces.length > 1 ? 's' : ''}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Active: <span className="text-purple-300 font-medium">{currentWorkspace?.name}</span> ({currentWorkspace?.plan?.toUpperCase()} Tier)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {userWorkspaces.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('workspaces');
                      window.history.pushState(null, '', '/workspaces');
                    }}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    All Workspaces
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    window.history.pushState(null, '', `/${currentRole}/dashboard`);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  Go to Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Onboarding Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0F172A]/90 border border-slate-700/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6"
          >
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {mode === 'create' ? 'Create Your Organization Workspace' : 'Join Existing Workspace'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {mode === 'create' 
                    ? 'Initialize a dedicated tenant database, permission hierarchy, and teams.' 
                    : 'Enter an invitation token sent by your organization administrator.'}
                </p>
              </div>

              <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    mode === 'create'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Create New
                </button>
                <button
                  type="button"
                  onClick={() => setMode('invite')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    mode === 'invite'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Invite Token
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Mode: Create Workspace Form */}
            {mode === 'create' && (
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Organization / Workspace Name
                  </label>
                  <input
                    type="text"
                    required
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Innovations, Mavr Tech"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-medium"
                  />
                  <p className="text-[11px] text-slate-500 font-mono">
                    Workspace Identifier URL: <span className="text-purple-400">{slugPreview}.workspace.dev</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Select Plan Tier
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'free', name: 'Free', price: '$0/mo', desc: 'Up to 5 members' },
                      { id: 'pro', name: 'Pro', price: '$49/mo', desc: 'Unlimited teams & tasks' },
                      { id: 'enterprise', name: 'Enterprise', price: '$199/mo', desc: 'Dedicated DB & SLA' },
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setPlan(tier.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          plan === tier.id
                            ? 'bg-purple-950/30 border-purple-500 shadow-lg shadow-purple-950/30'
                            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold uppercase ${plan === tier.id ? 'text-purple-400' : 'text-slate-300'}`}>
                            {tier.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{tier.price}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{tier.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.05] space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Automatic Role Assignment: <span className="text-purple-400 font-bold">ADMIN</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    You will have complete administrative authority across all teams, project pipelines, billing, member invites, and CRM systems.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !workspaceName.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right transition-all duration-300 text-white rounded-xl text-sm font-semibold shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Provisioning Workspace Cluster...
                    </span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Launch Workspace
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Mode: Join Via Invite Form */}
            {mode === 'invite' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inviteToken.trim()) {
                    window.location.href = `/invite/${inviteToken.trim()}`;
                  }
                }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Invitation Token or URL
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="e.g. inv_a89f72b1 or https://workspace-mavr.vercel.app/invite/..."
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500">
                    Paste the invite token from your team administrator email or message.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!inviteToken.trim()}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  Proceed with Invitation
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 border-t border-white/[0.06] text-center text-xs text-slate-500 relative z-10">
        Workspace OS • ISO 27001 & SOC-2 Compliant Multi-Tenant Infrastructure
      </footer>
    </div>
  );
};
