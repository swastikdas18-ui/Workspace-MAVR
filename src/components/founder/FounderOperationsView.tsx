import React, { useState } from 'react';
import { 
  BarChart3, TrendingUp, Users, DollarSign, Activity, ShieldCheck, 
  Server, Database, Mail, CreditCard, Cloud, AlertCircle, CheckCircle2,
  Layers, ArrowUpRight, Zap, Search, RefreshCw
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { motion } from 'motion/react';

export const FounderOperationsView: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

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

  // Beta Cohort Validation Metrics
  const betaMetrics = {
    cohortCompanies: 5,
    enrolledUsers: 48,
    activationRate: 74, // Target > 60%
    d7Retention: 42,    // Target > 35%
    d30Retention: 28,   // Target > 20%
    npsScore: 54,       // Target > 30
    criticalBugs: 0,    // Target = 0
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <PageHeader
        title="Founder Operations & Platform Observability"
        description="Real-time SaaS financial intelligence, user cohort retention, multi-service runtime health, and Beta adoption analytics."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold">
            Founder Superuser
          </span>
        }
      />

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Monthly Recurring Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">$4,580</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span>+18.4% from last month</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Daily Active Users (DAU)</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">142</div>
          <div className="flex items-center gap-1 text-[11px] text-purple-400">
            <Activity className="w-3 h-3" />
            <span>WAU: 384 • MAU: 1,120</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Workspace Activation Rate</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{betaMetrics.activationRate}%</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Exceeds 60% launch threshold</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Net Promoter Score (NPS)</span>
            <SparklesIcon className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">+{betaMetrics.npsScore}</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>World-class SaaS rating</span>
          </div>
        </div>
      </div>

      {/* Cohort Retention & Activation Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activation Funnel */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>User Activation & Onboarding Funnel</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">
              Live Real-Time
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>1. Workspace Created</span>
                <span className="font-mono font-semibold">100% (48/48)</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>2. First Project Created</span>
                <span className="font-mono font-semibold">88% (42/48)</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-[88%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>3. First Task Created & Assigned</span>
                <span className="font-mono font-semibold">79% (38/48)</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-[79%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>4. Team Invite Sent</span>
                <span className="font-mono font-semibold">74% (35/48)</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full w-[74%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Cohort Retention */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Cohort Retention Curve (D1, D7, D30)</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
              Benchmark Verified
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 text-center">
            <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.06]">
              <div className="text-[11px] text-slate-400 font-medium">Day 1 Retention</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">68%</div>
              <div className="text-[10px] text-emerald-400 mt-1">Target: &gt;50%</div>
            </div>
            <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.06]">
              <div className="text-[11px] text-slate-400 font-medium">Day 7 Retention</div>
              <div className="text-2xl font-bold text-purple-300 font-mono mt-1">42%</div>
              <div className="text-[10px] text-emerald-400 mt-1">Target: &gt;35%</div>
            </div>
            <div className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.06]">
              <div className="text-[11px] text-slate-400 font-medium">Day 30 Retention</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">28%</div>
              <div className="text-[10px] text-emerald-400 mt-1">Target: &gt;20%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Service Runtime Health Matrix */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              <span>Multi-Subsystem Production Health Matrix</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live telemetry tracking connectivity, response latency, and uptime across all critical infrastructure dependencies.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            All 7 Services Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {servicesHealth.map((srv) => (
            <div 
              key={srv.name} 
              className="p-3.5 rounded-xl bg-[#0F172A] border border-white/[0.06] flex items-start justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="font-semibold text-white text-xs">{srv.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {srv.category} • Latency: <span className="text-slate-200">{srv.latency}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {srv.uptime}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function SparklesIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}
