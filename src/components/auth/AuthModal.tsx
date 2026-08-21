import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { UserRole } from '../../types';
import { Shield, Briefcase, GraduationCap, Lock, Mail, User as UserIcon, ArrowRight, X, Check, Loader2, Building2 } from 'lucide-react';
import { api } from '../../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultRole = 'admin' }) => {
  const { switchRole, setIsLandingPage, addToast } = useWorkspace();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDemoMode = Boolean(import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true');

  if (!isOpen) return null;

  const handleQuickLogin = async (role: UserRole) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await switchRole(role);
      setIsLandingPage(false);
      onClose();
      addToast({
        type: 'success',
        title: 'Authenticated Successfully',
        message: `Signed in as ${role.toUpperCase()} via Better Auth session.`
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed');
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
        if (res?.user?.role) {
          switchRole(res.user.role as UserRole);
        }
        setIsLandingPage(false);
        onClose();
        addToast({
          type: 'success',
          title: 'Welcome Back',
          message: `Authenticated as ${res.user.name} (${res.user.role.toUpperCase()}). Session initialized.`
        });
      } else {
        const res = await api.register({
          name,
          email,
          password,
          workspaceName: workspaceName || `${name}'s Workspace`,
        });
        if (res?.user?.role) {
          switchRole(res.user.role as UserRole);
        }
        setIsLandingPage(false);
        onClose();
        addToast({
          type: 'success',
          title: 'Account Created',
          message: `Registered organization "${res.workspace.name}" with role: ADMIN.`
        });
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
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
        {/* Top decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-slate-100">
            {mode === 'login' ? 'Sign in to Workspace OS' : 'Create Your Organization Account'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Role-Based Access Control powered by Drizzle ORM & Better Auth
          </p>
        </div>

        {/* 1-Click Fast Role Launchers (Development Demo Mode Only) */}
        {isDemoMode && (
          <div className="mb-6 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
              🚀 1-Click Demo Profiles (Direct Access)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-purple-950/30 border border-purple-800/40 hover:bg-purple-900/40 hover:border-purple-600 transition-all text-center group"
              >
                <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-purple-200">Admin</span>
                <span className="text-[10px] text-purple-400/80">Full Control</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('employee')}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-950/30 border border-blue-800/40 hover:bg-blue-900/40 hover:border-blue-600 transition-all text-center group"
              >
                <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-blue-200">Employee</span>
                <span className="text-[10px] text-blue-400/80">Assigned Only</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('intern')}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40 hover:bg-emerald-900/40 hover:border-emerald-600 transition-all text-center group"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-emerald-200">Intern</span>
                <span className="text-[10px] text-emerald-400/80">Learning Mode</span>
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        {isDemoMode && (
          <div className="flex items-center gap-3 mb-4 text-xs text-slate-500">
            <div className="flex-1 h-px bg-slate-800" />
            <span>or sign in with credentials</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Workspace Organization Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Acme Corporation"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Backend...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Authenticate Session' : 'Create Organization Account (ADMIN)'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
          >
            {mode === 'login'
              ? "Don't have an organization account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
