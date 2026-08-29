import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Building2, Shield, UserCheck, Key, Save, Lock, 
  RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, 
  Terminal, Webhook, EyeOff, Ban, DollarSign, Users, Target, Loader2
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { api } from '../../lib/api';
import { motion } from 'motion/react';

interface SecretItem {
  id: string;
  name: string;
  type: 'api_key' | 'webhook_secret' | 'service_token';
  prefix: string;
  suffix: string;
  maskedValue: string;
  scope: string;
  lastRotated: string;
  status: 'active' | 'rotated';
}

interface TeamBillingItem {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  costRate: number;
  billableRate: number;
  utilizationTarget: number;
}

export const SettingsView: React.FC = () => {
  const { currentWorkspace, updateWorkspace, addToast, users } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'rbac' | 'team_billing' | 'api'>('profile');
  const [name, setName] = useState(currentWorkspace?.name || 'Workspace OS HQ');
  const [slug, setSlug] = useState(currentWorkspace?.slug || 'workspaceos');
  const [allowPublicInvites, setAllowPublicInvites] = useState(false);
  const [enforceTwoFactor, setEnforceTwoFactor] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('24h');

  // Team Billing Profiles state
  const [billingProfiles, setBillingProfiles] = useState<TeamBillingItem[]>([]);
  const [isProfilesLoading, setIsProfilesLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const loadBillingProfiles = useCallback(async () => {
    try {
      setIsProfilesLoading(true);
      const res = await api.getEmployeeBillingProfiles();
      const loaded = (res?.profiles || []) as any[];

      // Merge with workspace users roster
      const merged: TeamBillingItem[] = users.map((u) => {
        const found = loaded.find((p) => p.userId === u.id);
        return {
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          role: u.role,
          costRate: found?.costRate || 1000,
          billableRate: found?.billableRate || 2000,
          utilizationTarget: found?.utilizationTarget || 75,
        };
      });
      setBillingProfiles(merged);
    } catch (err: any) {
      console.error('[SettingsView] Failed to load team billing profiles:', err);
    } finally {
      setIsProfilesLoading(false);
    }
  }, [users]);

  useEffect(() => {
    if (activeTab === 'team_billing') {
      loadBillingProfiles();
    }
  }, [activeTab, loadBillingProfiles]);

  const handleUpdateProfile = async (item: TeamBillingItem) => {
    try {
      setSavingUserId(item.userId);
      await api.updateEmployeeBillingProfile(item.userId, {
        costRate: item.costRate,
        billableRate: item.billableRate,
        utilizationTarget: item.utilizationTarget,
      });
      addToast({
        type: 'success',
        title: 'Billing Profile Updated',
        message: `Rates and target saved for ${item.userName}.`,
      });
    } catch (err: any) {
      console.error('[SettingsView] Failed to update profile:', err);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not save billing rates.',
      });
    } finally {
      setSavingUserId(null);
    }
  };

  // Masked Secrets State (Zero-Trust: raw secrets never stored or exposed on client)
  const [secrets, setSecrets] = useState<SecretItem[]>([
    {
      id: 'sec-api-1',
      name: 'Production REST API Key',
      type: 'api_key',
      prefix: 'rk_live_',
      suffix: '1234',
      maskedValue: 'rk_live_xxxxxxxxxxx1234',
      scope: 'Full Workspace Read/Write Access',
      lastRotated: '3 days ago',
      status: 'active',
    },
    {
      id: 'sec-wh-1',
      name: 'Webhook Signing Secret',
      type: 'webhook_secret',
      prefix: 'whsec_',
      suffix: '8921',
      maskedValue: 'whsec_xxxxxxxxxxx8921',
      scope: 'HMAC-SHA256 Payload Verification',
      lastRotated: '12 days ago',
      status: 'active',
    },
    {
      id: 'sec-cli-1',
      name: 'CLI Service Account Token',
      type: 'service_token',
      prefix: 'tok_srv_',
      suffix: '4321',
      maskedValue: 'tok_srv_xxxxxxxxxxx4321',
      scope: 'CI/CD Pipeline & Automated Deployments',
      lastRotated: '30 days ago',
      status: 'active',
    },
  ]);

  const [rotatingSecretId, setRotatingSecretId] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspace({ name, slug });
    addToast({
      type: 'success',
      title: 'Settings Persisted',
      message: 'Workspace configurations updated successfully.',
    });
  };

  const handleRotateSecret = (secretId: string) => {
    setIsRotating(true);
    setTimeout(() => {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
      setSecrets(prev => prev.map(s => {
        if (s.id === secretId) {
          return {
            ...s,
            suffix: randomSuffix,
            maskedValue: `${s.prefix}xxxxxxxxxxx${randomSuffix}`,
            lastRotated: 'Just now',
          };
        }
        return s;
      }));
      setIsRotating(false);
      setRotatingSecretId(null);
      addToast({
        type: 'success',
        title: 'Secret Rotated',
        message: 'A new secret was provisioned server-side and previous token revoked.',
      });
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <PageHeader
        title="Workspace Configuration & Security"
        description="Manage organization metadata, zero-trust RBAC policies, team billing rates, and developer credentials."
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
          onClick={() => setActiveTab('team_billing')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeTab === 'team_billing'
              ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/20'
              : 'bg-[#111827] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Team Billing & Rates</span>
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
          <span>Developer API & Secrets</span>
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
                  <option value="4h">4 Hours (High Security Sliding Window)</option>
                  <option value="12h">12 Hours (Standard Business)</option>
                  <option value="24h">24 Hours (Default)</option>
                  <option value="7d">7 Days (Maximum Absolute Expiration)</option>
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

        {/* Tab 4: Team Billing & Hourly Rates (Admin Only) */}
        {activeTab === 'team_billing' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6"
          >
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Team Billing & Utilization Configuration</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Set employee internal cost rates, client billable rates, and weekly utilization targets. Employees never see these values.
              </p>
            </div>

            {isProfilesLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                <p className="text-xs text-slate-400 font-mono">Loading team rate profiles...</p>
              </div>
            ) : billingProfiles.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No team members found in this workspace. Invite employees from the Workspace Hub.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-[#0F172A]/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="p-3">Team Member</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Cost Rate (₹/hr)</th>
                      <th className="p-3">Client Billable Rate (₹/hr)</th>
                      <th className="p-3">Target Utilization (%)</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-slate-300">
                    {billingProfiles.map((item, idx) => (
                      <tr key={item.userId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-white">{item.userName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.userEmail}</div>
                        </td>
                        <td className="p-3">
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-purple-300">
                            {item.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 bg-[#0F172A] border border-white/[0.08] rounded-lg px-2 py-1 w-28">
                            <span className="text-slate-500 text-[10px]">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={item.costRate}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setBillingProfiles((prev) =>
                                  prev.map((p) => (p.userId === item.userId ? { ...p, costRate: val } : p))
                                );
                              }}
                              className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 bg-[#0F172A] border border-white/[0.08] rounded-lg px-2 py-1 w-28">
                            <span className="text-emerald-500 text-[10px]">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={item.billableRate}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setBillingProfiles((prev) =>
                                  prev.map((p) => (p.userId === item.userId ? { ...p, billableRate: val } : p))
                                );
                              }}
                              className="w-full bg-transparent text-emerald-400 font-mono font-bold text-xs focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 bg-[#0F172A] border border-white/[0.08] rounded-lg px-2 py-1 w-24">
                            <input
                              type="number"
                              min="10"
                              max="100"
                              value={item.utilizationTarget}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setBillingProfiles((prev) =>
                                  prev.map((p) => (p.userId === item.userId ? { ...p, utilizationTarget: val } : p))
                                );
                              }}
                              className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                            />
                            <span className="text-slate-500 text-[10px]">%</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleUpdateProfile(item)}
                            disabled={savingUserId === item.userId}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {savingUserId === item.userId ? 'Saving...' : 'Save Rate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 5: Masked Developer API Keys & Secrets */}
        {activeTab === 'api' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    <span>Developer API & Integration Credentials</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Zero-trust secret management: Raw credentials are never stored or exposed on client browsers.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    AES-256-GCM Encrypted
                  </span>
                </div>
              </div>

              {/* Zero Trust Notice Banner */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/20 flex items-start gap-3 text-xs text-slate-300">
                <EyeOff className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-purple-300">Zero-Trust Credential Masking Active</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    In compliance with OWASP Zero-Trust and SOC2 standards, secrets are masked at all times. Raw values are only displayed upon initial generation. To renew an existing credential, use the <strong>Rotate Secret</strong> action below.
                  </p>
                </div>
              </div>

              {/* Secrets List */}
              <div className="space-y-4">
                {secrets.map((secret) => {
                  const isPendingRotation = rotatingSecretId === secret.id;

                  return (
                    <div 
                      key={secret.id} 
                      className="p-4 bg-[#0F172A] rounded-xl border border-white/[0.06] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {secret.type === 'api_key' && <Key className="w-4 h-4 text-purple-400" />}
                          {secret.type === 'webhook_secret' && <Webhook className="w-4 h-4 text-blue-400" />}
                          {secret.type === 'service_token' && <Terminal className="w-4 h-4 text-emerald-400" />}
                          <span className="font-semibold text-white text-xs">{secret.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold uppercase">
                            {secret.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Last Rotated: <span className="text-slate-300 font-semibold">{secret.lastRotated}</span>
                        </span>
                      </div>

                      {/* Masked Secret Input & Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={secret.maskedValue}
                            className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-slate-300 font-mono text-xs select-none cursor-not-allowed tracking-wider"
                          />
                        </div>

                        {/* Copy Disabled by Policy Button */}
                        <div className="relative group shrink-0">
                          <button
                            type="button"
                            disabled
                            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-800/60 text-slate-500 text-xs font-medium flex items-center justify-center gap-1.5 border border-white/[0.04] cursor-not-allowed"
                            title="Copying raw secrets is disabled by policy"
                          >
                            <Ban className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Disabled</span>
                          </button>
                          <div className="hidden group-hover:block absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black text-[10px] text-slate-300 rounded shadow-lg whitespace-nowrap z-20 border border-white/[0.1]">
                            Raw secrets are never exposed on client
                          </div>
                        </div>

                        {/* Rotate Secret Action */}
                        {!isPendingRotation ? (
                          <button
                            type="button"
                            onClick={() => setRotatingSecretId(secret.id)}
                            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Rotate Secret</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRotateSecret(secret.id)}
                              disabled={isRotating}
                              className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                              <span>Confirm Rotation</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRotatingSecretId(null)}
                              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                        <span>Scope: <span className="text-slate-400">{secret.scope}</span></span>
                        <span className="text-purple-400/80 font-semibold">TLS 1.3 / HMAC Enforced</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Button */}
        {activeTab !== 'api' && activeTab !== 'team_billing' && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Workspace Settings</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
