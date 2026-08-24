import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Settings, Building2, Lock, Shield, Bell, Save, Check, Key, 
  Globe, UserCheck, Smartphone, Sliders, CheckCircle2, Copy
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { motion } from 'motion/react';

export const SettingsView: React.FC = () => {
  const { currentWorkspace, updateWorkspace, addToast } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'rbac' | 'api'>('profile');
  const [name, setName] = useState(currentWorkspace?.name || 'Workspace OS HQ');
  const [slug, setSlug] = useState(currentWorkspace?.slug || 'workspaceos');
  const [allowPublicInvites, setAllowPublicInvites] = useState(false);
  const [enforceTwoFactor, setEnforceTwoFactor] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('24h');
  const [copiedKey, setCopiedKey] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspace({ name, slug });
    addToast({
      type: 'success',
      title: 'Settings Persisted',
      message: 'Workspace configurations updated successfully.',
    });
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText('wos_live_9f83b1657ff1fc53b92dc18148a1d65d');
    setCopiedKey(true);
    addToast({
      type: 'success',
      title: 'API Key Copied',
      message: 'Production API key copied to clipboard.',
    });
    setTimeout(() => setCopiedKey(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <PageHeader
        title="Workspace Configuration & Security"
        description="Manage organization metadata, zero-trust RBAC policies, authentication security, and developer credentials."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold">
            SOC2 / HIPAA Compliant
          </span>
        }
      />

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/20'
              : 'bg-[#111827] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>General Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/20'
              : 'bg-[#111827] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security & 2FA</span>
        </button>

        <button
          onClick={() => setActiveTab('rbac')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeTab === 'rbac'
              ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/20'
              : 'bg-[#111827] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>RBAC Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeTab === 'api'
              ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/20'
              : 'bg-[#111827] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Developer API Keys</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: Organization Profile */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-5"
          >
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Organization Identity</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Public profile and canonical URL domain for this Workspace OS cluster.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Workspace Legal Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Domain Slug (URL Routing)</label>
                <div className="flex items-center bg-[#0F172A] border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-purple-500 transition-colors">
                  <span className="px-3 text-slate-500 font-mono text-xs">app.workspaceos.dev/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-transparent p-3 text-white focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0F172A] rounded-xl border border-white/[0.04] flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-white">Cluster ID</p>
                <p className="text-[11px] text-slate-400 font-mono">wos-cluster-us-east4-prod-01</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-[10px]">
                Healthy & Active
              </span>
            </div>
          </motion.div>
        )}

        {/* Tab 2: Security & Authentication */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-5"
          >
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Zero-Trust Security Controls</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Session lifetime policies, multi-factor requirements, and strict perimeter controls.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 p-4 rounded-xl bg-[#0F172A] border border-white/[0.06] cursor-pointer hover:border-purple-500/30 transition-colors">
                <input
                  type="checkbox"
                  checked={enforceTwoFactor}
                  onChange={(e) => setEnforceTwoFactor(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                />
                <div>
                  <p className="font-semibold text-white">Mandatory Multi-Factor Authentication (MFA / WebAuthn)</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Requires hardware security keys (FIDO2) or TOTP authenticators across Admin and Employee accounts.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl bg-[#0F172A] border border-white/[0.06] cursor-pointer hover:border-purple-500/30 transition-colors">
                <input
                  type="checkbox"
                  checked={allowPublicInvites}
                  onChange={(e) => setAllowPublicInvites(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                />
                <div>
                  <p className="font-semibold text-white">Auto-Provision Corporate Domain SSO</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Automatically onboard verified users signing in with official organization email addresses.
                  </p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Session Inactivity Timeout</label>
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="4h">4 Hours (High Security)</option>
                  <option value="12h">12 Hours (Standard Business)</option>
                  <option value="24h">24 Hours (Default)</option>
                  <option value="7d">7 Days (Extended Remember Me)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: RBAC Capabilities Matrix */}
        {activeTab === 'rbac' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl"
          >
            <div className="p-6 border-b border-white/[0.08] bg-[#0F172A]">
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Three-Tier RBAC Capability Matrix</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Definitive permissions enforced server-side for each authenticated identity role.
              </p>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0F172A]/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Capability Scope</th>
                  <th className="p-3.5 text-center text-purple-400">ADMIN</th>
                  <th className="p-3.5 text-center text-blue-400">EMPLOYEE</th>
                  <th className="p-3.5 text-center text-emerald-400">INTERN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                <tr>
                  <td className="p-3.5 font-medium text-white">Workspace & Billing Management</td>
                  <td className="p-3.5 text-center text-emerald-400">Full Access</td>
                  <td className="p-3.5 text-center text-rose-400 font-mono">No Access</td>
                  <td className="p-3.5 text-center text-rose-400 font-mono">No Access</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">Project Roadmaps (Create & Delete)</td>
                  <td className="p-3.5 text-center text-emerald-400">Full Access</td>
                  <td className="p-3.5 text-center text-slate-400">Assigned Only</td>
                  <td className="p-3.5 text-center text-rose-400 font-mono">No Access</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">Tasks & Engineering Backlog</td>
                  <td className="p-3.5 text-center text-emerald-400">All Tasks</td>
                  <td className="p-3.5 text-center text-slate-300">Team / Assigned</td>
                  <td className="p-3.5 text-center text-slate-300">Learning Tasks</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">CRM & Customer Deal Pipeline</td>
                  <td className="p-3.5 text-center text-emerald-400">Full Access</td>
                  <td className="p-3.5 text-center text-slate-300">Assigned Leads</td>
                  <td className="p-3.5 text-center text-rose-400 font-mono">No Access</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">Document Vault & Handbooks</td>
                  <td className="p-3.5 text-center text-emerald-400">Full Access</td>
                  <td className="p-3.5 text-center text-slate-300">Shared + Personal</td>
                  <td className="p-3.5 text-center text-slate-300">Learning / Public</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">Invite Provisioning & Token Generation</td>
                  <td className="p-3.5 text-center text-emerald-400">Full Access</td>
                  <td className="p-3.5 text-center text-rose-400 font-mono">No Access</td>
                  <td className="p-3.5 text-center text-rose-400 font-mono">No Access</td>
                </tr>
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Tab 4: Developer API Keys */}
        {activeTab === 'api' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-5"
          >
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                <span>Developer API & Integration Keys</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Authenticate server-to-server webhook pipelines and CLI deployments.
              </p>
            </div>

            <div className="p-4 bg-[#0F172A] rounded-xl border border-white/[0.06] space-y-2">
              <label className="block text-slate-300 text-xs font-medium">Production API Secret</label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  readOnly
                  value="wos_live_9f83b1657ff1fc53b92dc18148a1d65d"
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-slate-300 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Last rotated: 3 days ago • Grants full REST capability
              </p>
            </div>
          </motion.div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Workspace Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
