import React from 'react';
import { motion } from 'motion/react';
import { Building2 } from 'lucide-react';

interface ProfileTabProps {
  name: string;
  setName: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ name, setName, slug, setSlug }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111827] border border-white/[0.08] rounded-[24px] p-6 glass-shadow space-y-5"
    >
      <div>
        <h3 className="ui-h3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-400" />
          <span>Organization Identity</span>
        </h3>
        <p className="ui-body text-slate-400 mt-1">
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
            className="w-full bg-[#0F172A] border border-white/[0.08] rounded-[16px] p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1.5">Domain Slug (URL Routing)</label>
          <div className="flex items-center bg-[#0F172A] border border-white/[0.08] rounded-[16px] overflow-hidden focus-within:border-purple-500 transition-colors">
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

      <div className="p-4 bg-[#0F172A] rounded-[16px] border border-white/[0.04] flex items-center justify-between text-xs">
        <div>
          <p className="font-semibold text-white">Cluster ID</p>
          <p className="text-[11px] text-slate-400 font-mono">wos-cluster-us-east4-prod-01</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-[10px]">
          Healthy & Active
        </span>
      </div>
    </motion.div>
  );
};

interface SecurityTabProps {
  enforceTwoFactor: boolean;
  setEnforceTwoFactor: (v: boolean) => void;
  allowPublicInvites: boolean;
  setAllowPublicInvites: (v: boolean) => void;
  sessionTimeout: string;
  setSessionTimeout: (v: string) => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  enforceTwoFactor,
  setEnforceTwoFactor,
  allowPublicInvites,
  setAllowPublicInvites,
  sessionTimeout,
  setSessionTimeout,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-5"
    >
      <div>
        <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
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
  );
};

export const RbacTab: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl"
    >
      <div className="p-6 border-b border-white/[0.08] bg-[#0F172A]">
        <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
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
  );
};
