import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Shield, Lock, Mail, User as UserIcon, ArrowRight, X, Loader2, Building2, Ticket, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

export type AuthModalMode = 'login' | 'start-org' | 'join-org';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthModalMode;
  initialEmail?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login', initialEmail = '' }) => {
  const { setAuthUser, addToast } = useWorkspace();
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  
  // Sign In / Start Org fields
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteSuccessBanner, setInviteSuccessBanner] = useState<string | null>(null);
  
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
    if (initialEmail) {
      setEmail(initialEmail);
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('inviteAccepted') === 'true') {
      const emailParam = params.get('email');
      if (emailParam) setEmail(emailParam);
      setInviteSuccessBanner('Invitation accepted successfully! Please sign in to access your workspace.');
    }
  }, [initialMode, initialEmail, isOpen]);

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
            message: `Authenticated as ${res.user.name} (${res.user.role.toUpperCase()}).`
          });
        }
      } else if (mode === 'start-org') {
        const res = await api.register({
          workspaceName: workspaceName.trim(),
          name: name.trim(),
          email: email.trim(),
          password,
        });
        if (res?.user) {
          setAuthUser(res.user, res.workspace);
          onClose();
          addToast({
            type: 'success',
            title: 'Workspace Initialized',
            message: `Successfully created "${res.workspace?.name || workspaceName}". Welcome, Admin!`
          });
        }
      } else if (mode === 'join-org') {
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
        if (res?.success || res?.accepted) {
          setMode('login');
          if (res.email) setEmail(res.email);
          setInviteSuccessBanner(`Invitation accepted for ${res.email || 'your account'}! Please sign in to access your workspace.`);
          addToast({
            type: 'success',
            title: 'Invitation Accepted',
            message: `Account created for ${res.email || 'your account'}! Please log in with your credentials.`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E3DA] text-stone-900 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Top decorative amber line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-700 to-stone-900" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 mb-3 shadow-xs">
            {mode === 'start-org' ? <Building2 className="w-6 h-6 text-amber-700" /> : mode === 'join-org' ? <Ticket className="w-6 h-6 text-emerald-700" /> : <Shield className="w-6 h-6 text-amber-800" />}
          </div>
          <h3 className="text-xl font-bold tracking-tight text-stone-900 font-heading">
            {mode === 'login' ? 'Sign In to Workspace OS' : mode === 'start-org' ? 'Start Your Organization' : 'Join an Organization'}
          </h3>
          <p className="text-xs text-stone-500 mt-1.5 max-w-xs mx-auto">
            {mode === 'login' && 'Enter your company credentials to access your operating dashboard.'}
            {mode === 'start-org' && 'Initialize a new company workspace with Executive Admin privileges.'}
            {mode === 'join-org' && 'Join an existing workspace using your official invitation token.'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-[#F5F2EB] p-1 rounded-xl border border-[#E8E3DA] mb-5 text-xs">
          <button
            type="button"
            onClick={() => { setMode('start-org'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              mode === 'start-org' ? 'bg-white text-stone-900 shadow-xs border border-[#E8E3DA]' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Start Org
          </button>
          <button
            type="button"
            onClick={() => { setMode('join-org'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              mode === 'join-org' ? 'bg-white text-stone-900 shadow-xs border border-[#E8E3DA]' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Join Org
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              mode === 'login' ? 'bg-white text-stone-900 shadow-xs border border-[#E8E3DA]' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Invite Success Banner */}
        {inviteSuccessBanner && mode === 'login' && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>{inviteSuccessBanner}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Start Organization Fields */}
          {mode === 'start-org' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Swastik Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="ui-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Organization / Company Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp, Apex Labs"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="ui-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="admin@polotech.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ui-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ui-input pl-9 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* Join Organization Fields */}
          {mode === 'join-org' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Invitation Token</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. invite-polo-emp-sample"
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value)}
                      className="ui-input pl-9 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyInviteToken}
                    disabled={isPreviewLoading}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 rounded-xl border border-[#E8E3DA] shrink-0 cursor-pointer transition-colors"
                  >
                    {isPreviewLoading ? 'Checking...' : 'Verify'}
                  </button>
                </div>
              </div>

              {invitePreview && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Invitation</span>
                  </div>
                  <p className="text-stone-700">
                    Organization: <strong className="text-stone-900">{invitePreview.workspace.name}</strong>
                  </p>
                  <p className="text-stone-700">
                    Assigned Role: <span className="font-semibold uppercase text-amber-800">{invitePreview.invite.role}</span>
                  </p>
                  <p className="text-stone-500 text-[11px]">
                    Invited Email: {invitePreview.invite.email}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Your Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="ui-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Create Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ui-input pl-9 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* Sign In Fields */}
          {mode === 'login' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ui-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ui-input pl-9 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#1C1917] hover:bg-[#292524] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-stone-900/10 hover:shadow-stone-900/20 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
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
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
