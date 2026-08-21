import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CreditCard, Check, Download, ShieldCheck, Zap, ArrowUpRight } from 'lucide-react';

export const BillingView: React.FC = () => {
  const { currentWorkspace, invoices, users } = useWorkspace();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Organization Billing & Subscription</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold uppercase">
            {currentWorkspace.plan} Plan
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Manage enterprise seat licenses, payment methods, and automated billing invoices.
        </p>
      </div>

      {/* Plan Card */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-800/40 rounded-2xl p-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              Active Tier
            </span>
            <h2 className="text-2xl font-bold text-white mt-2 capitalize">{currentWorkspace?.plan || 'Professional'} Organization Plan</h2>
            <p className="text-xs text-slate-400 mt-1">
              Active organization billing subscription
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/25 transition-colors">
              Manage Subscription
            </button>
          </div>
        </div>

        {/* Seat Usage Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">Seat Utilization</span>
            <span className="text-white font-semibold">{users.length} of 25 Active Seats</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full"
              style={{ width: `${(users.length / 25) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Billing & Payment History</span>
          </h3>
          <span className="text-xs text-slate-400">Electronic Invoicing</span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="p-3.5">Invoice Number</th>
              <th className="p-3.5">Billing Date</th>
              <th className="p-3.5">Plan Scope</th>
              <th className="p-3.5">Amount</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                  No invoices issued yet.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono text-white font-medium">{inv.invoice_number}</td>
                  <td className="p-3.5 text-slate-400">{inv.date}</td>
                  <td className="p-3.5 text-slate-300">{inv.plan_name}</td>
                  <td className="p-3.5 font-semibold text-white">${inv.amount.toFixed(2)}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] uppercase font-bold">
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] ml-auto">
                      <Download className="w-3 h-3" />
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
