import React from 'react';
import { motion } from 'motion/react';
import { Target, Users, Building2, ShieldCheck, Webhook } from 'lucide-react';

interface LabsTabProps {
  onNavigate: (tab: string) => void;
}

export const LabsTab: React.FC<LabsTabProps> = ({ onNavigate }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-2">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          <span>Labs & Enterprise Extensions Launcher</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Access secondary enterprise tools including workflow automation rules, time utilization telemetry, velocity analytics, guest portal, and Google synchronization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('automations')}
          className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 hover:border-purple-500/40 transition-all cursor-pointer space-y-3 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
              Automations Engine
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Event-driven trigger & action rules for project creation, document generation, and webhooks.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('time')}
          className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 hover:border-blue-500/40 transition-all cursor-pointer space-y-3 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
              Time & Utilization
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Employee timesheets, billable hour tracking, utilization targets, and labor cost analysis.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('analytics')}
          className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 hover:border-emerald-500/40 transition-all cursor-pointer space-y-3 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
              Analytics & Velocity
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Sprint velocity forecasting, retention tracking, metric lineage graphs, and product analytics.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('portal')}
          className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 hover:border-amber-500/40 transition-all cursor-pointer space-y-3 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              Client Portal
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              External guest access sandbox for client project progress, shared deliverables, and invoice view.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('integrations')}
          className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 hover:border-rose-500/40 transition-all cursor-pointer space-y-3 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
            <Webhook className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
              Google Sync & OAuth
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Third-party OAuth synchronization, Google Calendar event sync, and Google Drive integrations.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
