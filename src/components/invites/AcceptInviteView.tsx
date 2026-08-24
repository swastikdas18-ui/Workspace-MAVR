import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Building2, ShieldCheck, UserCheck, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AcceptInviteViewProps {
  token: string;
  onSuccess: () => void;
}

export const AcceptInviteView: React.FC<AcceptInviteViewProps> = ({ token, onSuccess }) => {
  const { setAuthUser, addToast } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{ invite: any; workspace: any } | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      try {
        setLoading(true);
        const data = await api.previewInvite(token);
        setInviteData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Invalid or expired workspace invitation.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadInvite();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await api.acceptInvite({
        token,
        name: name.trim(),
        password,
      });

      addToast({
        type: 'success',
        title: 'Invitation Accepted',
        message: `Welcome to ${res.workspace.name}! Your account has been initialized as ${res.user.role.toUpperCase()}.`,
      });

      setAuthUser(res.user, res.workspace);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Verifying invitation token...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Invitation Error</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  const { invite, workspace } = inviteData!;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Join {workspace.name}</h2>
          <p className="text-xs text-slate-400 mt-1">
            You've been invited to join as <span className="text-blue-400 font-semibold uppercase">{invite.role}</span>.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Invited Email</label>
            <input
              type="text"
              disabled
              value={invite.email}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Full Name</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Set Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Joining Workspace...</span>
            ) : (
              <>
                <span>Accept Invite & Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
