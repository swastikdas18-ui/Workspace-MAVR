import React from 'react';
import { motion } from 'motion/react';
import { Key, ShieldCheck, EyeOff, Webhook, Terminal, Ban, RefreshCw } from 'lucide-react';

export interface SecretItem {
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

export const DEFAULT_SECRETS: SecretItem[] = [
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
];

interface ApiKeysTabProps {
  secrets: SecretItem[];
  rotatingSecretId: string | null;
  setRotatingSecretId: (id: string | null) => void;
  isRotating: boolean;
  onRotateSecret: (secretId: string) => void;
}

export const ApiKeysTab: React.FC<ApiKeysTabProps> = ({
  secrets,
  rotatingSecretId,
  setRotatingSecretId,
  isRotating,
  onRotateSecret,
}) => {
  return (
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
                        onClick={() => onRotateSecret(secret.id)}
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
  );
};
