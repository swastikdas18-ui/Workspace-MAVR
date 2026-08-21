import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Settings, Building2, Lock, Shield, Bell, Save, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { currentWorkspace, updateWorkspace } = useWorkspace();

  const [name, setName] = useState(currentWorkspace?.name || '');
  const [slug, setSlug] = useState(currentWorkspace?.slug || '');
  const [allowPublicInvites, setAllowPublicInvites] = useState(false);
  const [enforceTwoFactor, setEnforceTwoFactor] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspace({ name, slug });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Workspace Organization Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure organization profile, security policies, authentication restrictions, and domains.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Profile */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Organization Profile</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Company / Workspace Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Workspace Slug (URL Identifier)</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Security & Authentication */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Security & RBAC Enforcement</span>
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={enforceTwoFactor}
                onChange={(e) => setEnforceTwoFactor(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
              />
              <div>
                <p className="font-semibold text-slate-200">Enforce Multi-Factor Authentication (MFA)</p>
                <p className="text-[11px] text-slate-400">Require all Admin and Employee logins to verify via authenticator app.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPublicInvites}
                onChange={(e) => setAllowPublicInvites(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
              />
              <div>
                <p className="font-semibold text-slate-200">Allow Domain-Matching Auto-Join</p>
                <p className="text-[11px] text-slate-400">Users with verified @workspaceos.dev email can automatically join as Employees.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Workspace Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
