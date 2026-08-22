import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  CreditCard, Check, Download, ShieldCheck, Zap, ArrowUpRight, 
  Sparkles, Calendar, DollarSign, Users, CheckCircle2
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { MetricCard } from '../common/MetricCard';
import { motion } from 'motion/react';

export const BillingView: React.FC = () => {
  const { currentWorkspace, invoices, users, addToast } = useWorkspace();

  const handleDownloadInvoice = (invNumber: string) => {
    addToast({
      type: 'success',
      title: 'Invoice Downloaded',
      message: `Tax receipt PDF for ${invNumber} generated.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Subscription & Billing Intelligence"
        description="Manage seat provisioning, subscription tiers, enterprise billing schedules, and receipt archives."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold uppercase">
            {currentWorkspace?.plan || 'Enterprise'} Plan
          </span>
        }
        actions={
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
            <Sparkles className="w-4 h-4" />
            <span>Change Tier</span>
          </button>
        }
      />

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Monthly Run-Rate"
          value="$749 / mo"
          icon={DollarSign}
          color="purple"
          trend={{ value: 'Annualized', direction: 'neutral', label: 'fixed contract' }}
          sparklineData={[700, 700, 749, 749, 749, 749, 749]}
        />
        <MetricCard
          label="Seat Utilization"
          value={`${users.length} / 25`}
          icon={Users}
          color="blue"
          trend={{ value: `${25 - users.length} seats remaining`, direction: 'neutral', label: 'capacity' }}
          sparklineData={[10, 12, 14, 15, 18, 20, 22]}
        />
        <MetricCard
          label="Payment Gateway"
          value="Stripe Direct"
          icon={CreditCard}
          color="emerald"
          trend={{ value: 'Visa •••• 4242', direction: 'neutral', label: 'autopay active' }}
          sparklineData={[1, 1, 1, 1, 1, 1, 1]}
        />
        <MetricCard
          label="Next Invoice Date"
          value="Oct 1, 2026"
          icon={Calendar}
          color="amber"
          trend={{ value: 'Auto-renews', direction: 'neutral', label: 'annual cycle' }}
          sparklineData={[5, 10, 15, 20, 25, 28, 30]}
        />
      </div>

      {/* Stripe-Grade Active Tier Card */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-mono">
                Active Organization Contract
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-2 capitalize tracking-tight">
              Enterprise Operating System License
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Unlimited projects, Attio CRM pipelines, Notion-grade doc vault, and dedicated SSO clustering.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold font-mono text-white">$749<span className="text-xs font-normal text-slate-400">/month</span></span>
          </div>
        </div>

        {/* Seat Usage Bar */}
        <div className="mt-6 pt-4 border-t border-white/[0.06]">
          <div className="flex justify-between text-xs mb-1.5 font-mono">
            <span className="text-slate-400">Seat Capacity Allocation</span>
            <span className="text-white font-semibold">{users.length} of 25 Licensed Seats ({Math.round((users.length / 25) * 100)}%)</span>
          </div>
          <div className="w-full bg-[#0F172A] h-2 rounded-full overflow-hidden border border-white/[0.04]">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full"
              style={{ width: `${(users.length / 25) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0F172A]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Electronic Invoices & Tax Receipts</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Stripe Billing Verified</span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#0F172A]/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3.5 px-4">Invoice Reference</th>
              <th className="py-3.5 px-4">Issue Date</th>
              <th className="py-3.5 px-4">Plan Scope</th>
              <th className="py-3.5 px-4">Amount Paid</th>
              <th className="py-3.5 px-4">Billing Status</th>
              <th className="py-3.5 px-4 text-right">Tax PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-slate-300">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                  No invoices issued yet.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-white font-medium">{inv.invoice_number}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">{inv.date}</td>
                  <td className="py-3.5 px-4 text-slate-300">{inv.plan_name}</td>
                  <td className="py-3.5 px-4 font-semibold font-mono text-white">${inv.amount.toFixed(2)}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] uppercase font-bold font-mono">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDownloadInvoice(inv.invoice_number)}
                      className="p-1.5 rounded-lg bg-[#0F172A] hover:bg-[#7C3AED] hover:text-white text-slate-300 text-[11px] ml-auto inline-flex items-center gap-1.5 border border-white/[0.06] transition-all cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
