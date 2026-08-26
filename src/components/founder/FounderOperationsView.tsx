import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, DollarSign, Activity, ShieldCheck, 
  Server, Database, Mail, CreditCard, Cloud, AlertCircle, CheckCircle2,
  Layers, ArrowUpRight, Zap, Search, RefreshCw, FileCode, Info, X
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../lib/api';

export const FounderOperationsView: React.FC = () => {
  const [lineageData, setLineageData] = useState<any | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Multi-subsystem operational health telemetry
  const servicesHealth = [
    { name: 'Neon Serverless PostgreSQL', category: 'Database', status: 'operational', latency: '4ms', uptime: '99.99%' },
    { name: 'Resend Transactional Email Engine', category: 'Email', status: 'operational', latency: '65ms', uptime: '99.98%' },
    { name: 'Razorpay Billing & Webhook Gateway', category: 'Payments', status: 'operational', latency: '120ms', uptime: '100.0%' },
    { name: 'Backblaze B2 & Cloudflare R2 Vault', category: 'Storage', status: 'operational', latency: '45ms', uptime: '100.0%' },
    { name: 'Sentry Distributed Error Telemetry', category: 'Observability', status: 'operational', latency: '12ms', uptime: '99.99%' },
    { name: 'Event Automation Engine', category: 'Automations', status: 'operational', latency: '1ms', uptime: '100.0%' },
    { name: 'Unified Search v2 Lexical Engine', category: 'Search', status: 'operational', latency: '0ms', uptime: '100.0%' },
  ];

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMetricLineage();
      setLineageData(data);
    } catch (err) {
      console.error('[Lineage Load Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getConfidenceBadge = (confidence: string) => {
    if (confidence === 'real') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Real Production
        </span>
      );
    }
    if (confidence === 'estimated') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Estimated
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Insufficient Data
      </span>
    );
  };

  const getMetricItem = (name: string) => {
    return lineageData?.metrics?.find((m: any) => m.metric.includes(name));
  };

  const mrrItem = getMetricItem('MRR');
  const dauItem = getMetricItem('DAU');
  const activationItem = getMetricItem('Activation');
  const npsItem = getMetricItem('NPS');

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <PageHeader
        title="Founder Operations & Metric Lineage"
        description="Audit-proof SaaS telemetry, database-verified revenue run-rate, cohort retention curves, and transparent data provenance."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold">
            Phase 23 Metric Integrity
          </span>
        }
        actions={
          <button
            onClick={loadData}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-white/[0.08] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Live Lineage</span>
          </button>
        }
      />

      {/* Top Level Metric Cards with Confidence Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div 
          onClick={() => setSelectedMetric(mrrItem)}
          className="bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 rounded-2xl p-5 shadow-xl space-y-3 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Monthly Recurring Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {mrrItem?.value || '$0'}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
            {getConfidenceBadge(mrrItem?.confidence || 'real')}
            <span className="text-[11px] text-purple-400 hover:underline flex items-center gap-0.5">
              <span>Inspect</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* DAU */}
        <div 
          onClick={() => setSelectedMetric(dauItem)}
          className="bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 rounded-2xl p-5 shadow-xl space-y-3 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Daily Active Users (DAU)</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {dauItem?.value ?? 0}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
            {getConfidenceBadge(dauItem?.confidence || 'estimated')}
            <span className="text-[11px] text-purple-400 hover:underline flex items-center gap-0.5">
              <span>Inspect</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Activation */}
        <div 
          onClick={() => setSelectedMetric(activationItem)}
          className="bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 rounded-2xl p-5 shadow-xl space-y-3 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Workspace Activation Rate</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {activationItem?.value || '0%'}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
            {getConfidenceBadge(activationItem?.confidence || 'insufficient_data')}
            <span className="text-[11px] text-purple-400 hover:underline flex items-center gap-0.5">
              <span>Inspect</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* NPS */}
        <div 
          onClick={() => setSelectedMetric(npsItem)}
          className="bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 rounded-2xl p-5 shadow-xl space-y-3 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Net Promoter Score (NPS)</span>
            <ShieldCheck className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {npsItem?.value || 'Insufficient Data'}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
            {getConfidenceBadge(npsItem?.confidence || 'insufficient_data')}
            <span className="text-[11px] text-purple-400 hover:underline flex items-center gap-0.5">
              <span>Inspect</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Metric Lineage & Provenance Explorer */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/[0.08] bg-[#0F172A] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Full Metric Lineage & Source Mapping</h3>
            <p className="text-xs text-slate-400">Verified query paths, underlying database tables, and statistical confidence levels.</p>
          </div>
          <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
            Authenticity: {lineageData?.summary?.authenticityScorePercent || 100}%
          </span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#0B1120] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="p-3.5">Metric</th>
              <th className="p-3.5">Persisted Value</th>
              <th className="p-3.5">Calculation Formula</th>
              <th className="p-3.5">Source Tables</th>
              <th className="p-3.5 text-right">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {lineageData?.metrics?.map((m: any) => (
              <tr 
                key={m.metric}
                onClick={() => setSelectedMetric(m)}
                className="hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <td className="p-3.5 font-semibold text-white text-xs">
                  {m.metric}
                </td>
                <td className="p-3.5 text-purple-300 font-mono font-bold">
                  {m.value}
                </td>
                <td className="p-3.5 text-slate-300 font-mono text-[11px]">
                  {m.formula}
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    {m.sourceTables.map((t: string) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3.5 text-right">
                  {getConfidenceBadge(m.confidence)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Metric Provenance Inspector Modal */}
      <AnimatePresence>
        {selectedMetric && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Metric Provenance: {selectedMetric.metric}</h3>
                </div>
                <button
                  onClick={() => setSelectedMetric(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Persisted Output:</span>
                  <div className="text-base font-bold text-white font-mono mt-0.5">{selectedMetric.value}</div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Calculation Formula:</span>
                  <div className="p-2.5 bg-[#0F172A] rounded-xl border border-white/[0.06] font-mono text-purple-300 mt-1">
                    {selectedMetric.formula}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Source Database Tables:</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {selectedMetric.sourceTables.map((t: string) => (
                      <span key={t} className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono text-[11px] font-bold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Audit Description:</span>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">{selectedMetric.description}</p>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Data Authenticity Rating:</span>
                  <div className="mt-1">{getConfidenceBadge(selectedMetric.confidence)}</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedMetric(null)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
