import React from 'react';
import { motion } from 'motion/react';
import { DollarSign, Loader2 } from 'lucide-react';

export interface TeamBillingItem {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  costRate: number;
  billableRate: number;
  utilizationTarget: number;
}

interface TeamBillingTabProps {
  isProfilesLoading: boolean;
  billingProfiles: TeamBillingItem[];
  setBillingProfiles: React.Dispatch<React.SetStateAction<TeamBillingItem[]>>;
  savingUserId: string | null;
  onUpdateProfile: (item: TeamBillingItem) => void;
}

export const TeamBillingTab: React.FC<TeamBillingTabProps> = ({
  isProfilesLoading,
  billingProfiles,
  setBillingProfiles,
  savingUserId,
  onUpdateProfile,
}) => {
  return (
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
              {billingProfiles.map((item) => (
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
                      onClick={() => onUpdateProfile(item)}
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
  );
};
