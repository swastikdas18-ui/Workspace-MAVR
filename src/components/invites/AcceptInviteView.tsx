import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Building2, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

interface AcceptInviteViewProps {
  token: string;
  onSuccess: () => void;
}

export const AcceptInviteView: React.FC<AcceptInviteViewProps> = ({ token }) => {
  const { addToast } = useWorkspace();
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
        message: `Account created for ${res.email || inviteData?.invite.email}! Please sign in to access your workspace.`,
      });

      const targetEmail = encodeURIComponent(res.email || inviteData?.invite.email);
      window.location.href = `/login?inviteAccepted=true&email=${targetEmail}`;
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-500 text-sm font-medium">Verifying invitation token...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E8E3DA] rounded-2xl max-w-md w-full p-8 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 mb-2 font-heading">Invitation Error</h2>
          <p className="text-sm text-stone-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  const { invite, workspace } = inviteData!;

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-4">
      <div className="bg-white border border-[#E8E3DA] rounded-3xl max-w-md w-full p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-700 to-stone-900" />
        
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-800 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight font-heading">Join {workspace.name}</h2>
          <p className="text-xs text-stone-500 mt-1">
            You've been invited to join as <span className="text-amber-800 font-bold uppercase">{invite.role}</span>.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-stone-700 font-semibold mb-1">Invited Email</label>
            <input
              type="text"
              disabled
              value={invite.email}
              className="w-full bg-[#F5F2EB] border border-[#E8E3DA] rounded-xl p-3 text-stone-500 cursor-not-allowed font-medium"
            />
          </div>

          <div>
            <label className="block text-stone-700 font-semibold mb-1">Full Name</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="ui-input pr-9"
              />
              <User className="w-4 h-4 text-stone-400 absolute right-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-stone-700 font-semibold mb-1">Set Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ui-input pr-9"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-stone-700 font-semibold mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="ui-input pr-9"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-stone-900/10 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Joining Workspace...</span>
            ) : (
              <>
                <span>Accept Invite & Get Started</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
