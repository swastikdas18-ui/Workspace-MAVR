import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Shield, Lock, Mail, User as UserIcon, ArrowRight, X, Loader2, Building2, Ticket, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

export type AuthModalMode = 'login' | 'start-org' | 'join-org';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthModalMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { setAuthUser, addToast } = useWorkspace();
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  
  // Sign In / Start Org fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  
  // Join Org fields
  const [inviteToken, setInviteToken] = useState('');
  const [invitePreview, setInvitePreview] = useState<{ invite: any; workspace: any } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
    setInvitePreview(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleVerifyInviteToken = async () => {
    if (!inviteToken.trim()) {
      setErrorMessage('Please enter an invitation token.');
      return;
    }
    try {
      setIsPreviewLoading(true);
      setErrorMessage(null);
      const res = await api.previewInvite(inviteToken.trim());
      setInvitePreview(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired invitation token.');
      setInvitePreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.login({ email: demoEmail, password: 'PoloPassword2026!' });
      if (res?.user) {
        setAuthUser(res.user, res.workspace);
        onClose();
        addToast({
          type: 'success',
          title: 'Authenticated Successfully',
          message: `Logged in as ${res.user.name} (${res.user.role.toUpperCase()}).`
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        if (res?.user) {
          setAuthUser(res.user, res.workspace);
          onClose();
          addToast({
            type: 'success',
            title: 'Welcome Back',
            message: `Authenticated as ${res.user.name} (${res.user.role.toUpperCase()}). Session initialized.`
          });
        }
      } else if (mode === 'start-org') {
        // Admin registration flow
        const res = await api.register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          workspaceName: workspaceName.trim() || `${name.trim()}'s Organization`,
        });
        if (res?.user) {
          setAuthUser(res.user, res.workspace);
          onClose();
          addToast({
            type: 'success',
            title: 'Organization Created',
            message: `Registered "${res.workspace.name}" with role: ADMIN. Redirecting to workspace...`
          });
        }
      } else if (mode === 'join-org') {
        // Join organization via invite
        if (!inviteToken.trim()) {
          setErrorMessage('Invitation token is required.');
          setIsLoading(false);
          return;
        }
        const res = await api.acceptInvite({
          token: inviteToken.trim(),
          name: name.trim(),
          password,
        });
        if (res?.user) {
          setAuthUser(res.user, res.workspace);
          onClose();
          addToast({
            type: 'success',
            title: 'Welcome to the Workspace',
            message: `Joined ${res.workspace.name} as ${res.user.role.toUpperCase()}.`
          });
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication request failed.');
      addToast({
        type: 'error',
        title: 'Authentication Error',
        message: err.message || 'Failed to authenticate with server.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Top decorative gradient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2">
            {mode === 'start-org' ? <Building2 className="w-6 h-6 text-indigo-400" /> : mode === 'join-org' ? <Ticket className="w-6 h-6 text-emerald-400" /> : <Shield className="w-6 h-6 text-blue-400" />}
          </div>
          <h3 className="text-xl font-bold tracking-tight text-slate-100">
            {mode === 'login' ? 'Sign In to Workspace OS' : mode === 'start-org' ? 'Start Your Organization' : 'Join an Organization'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Enter your company credentials to access your operating dashboard.'}
            {mode === 'start-org' && 'Initialize a new company workspace with Executive Admin privileges.'}
            {mode === 'join-org' && 'Join an existing workspace using your official invitation token.'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4 text-xs">
          <button
            type="button"
            onClick={() => { setMode('start-org'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'start-org' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Start Org
          </button>
          <button
            type="button"
            onClick={() => { setMode('join-org'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'join-org' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Join Org
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'login' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Start Organization Fields */}
          {mode === 'start-org' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Swastik Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Organization / Company Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp, Apex Labs"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="admin@polotech.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Join Organization Fields */}
          {mode === 'join-org' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Invitation Token</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. invite-polo-emp-sample"
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyInviteToken}
                    disabled={isPreviewLoading}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700 shrink-0"
                  >
                    {isPreviewLoading ? 'Checking...' : 'Verify'}
                  </button>
                </div>
              </div>

              {invitePreview && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-emerald-500/30 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Invitation</span>
                  </div>
                  <p className="text-slate-300">
                    Organization: <strong className="text-white">{invitePreview.workspace.name}</strong>
                  </p>
                  <p className="text-slate-300">
                    Assigned Role: <span className="font-semibold uppercase text-blue-400">{invitePreview.invite.role}</span>
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Invited Email: {invitePreview.invite.email}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Your Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Create Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Sign In Fields */}
          {mode === 'login' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mt-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Server...</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'start-org'
                    ? 'Create Organization (ADMIN)'
                    : mode === 'join-org'
                    ? 'Accept Invite & Join'
                    : 'Authenticate Session'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
