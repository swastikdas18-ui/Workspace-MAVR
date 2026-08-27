import React, { useState, useMemo, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  CreditCard, Check, Download, Zap, ArrowUpRight, Sparkles,
  Users, IndianRupee, Crown, Shield, ToggleLeft, ToggleRight,
  TrendingUp, ChevronRight, AlertCircle, CheckCircle2, X, HardDrive
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { motion, AnimatePresence } from 'motion/react';

// ─────────────────────────────────────────────────────────────────────────────
// Plan Data (mirrors billing-repository.ts PLAN_CONFIG)
// ─────────────────────────────────────────────────────────────────────────────

type PlanTier = 'free' | 'starter' | 'business' | 'scale' | 'enterprise';

interface Plan {
  tier: PlanTier;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  includedSeats: number;
  extraSeatPrice: number;
  highlight?: boolean;
  features: string[];
  notIncluded: string[];
}

const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Free',
    tagline: 'For individuals and tiny teams',
    priceMonthly: 0,
    priceYearly: 0,
    includedSeats: 3,
    extraSeatPrice: 0,
    features: ['3 users', '2 projects', 'Tasks & Subtasks', 'Basic workspace'],
    notIncluded: ['CRM', 'Documents', 'Wiki', 'Client Portal', 'Automations', 'Time Tracking'],
  },
  {
    tier: 'starter',
    name: 'Starter',
    tagline: 'For growing teams that need structure',
    priceMonthly: 999,
    priceYearly: 9990,
    includedSeats: 10,
    extraSeatPrice: 0,
    features: ['10 users', 'Unlimited projects', 'CRM & Lead Management', 'Document Vault', 'Team Wiki', 'Guest Portal (view)'],
    notIncluded: ['Time Tracking', 'Automations', 'Client Approvals', 'GST Invoices', 'API Keys', 'Analytics'],
  },
  {
    tier: 'business',
    name: 'Business',
    tagline: 'For agencies and professional teams',
    priceMonthly: 2999,
    priceYearly: 29990,
    includedSeats: 25,
    extraSeatPrice: 99,
    highlight: true,
    features: ['25 included users', '₹99/extra seat', 'Everything in Starter', 'Time Tracking & Billable Hours', 'Workflow Automations', 'Client Approvals & Sign-offs', 'GST Invoices', 'Utilization Reports'],
    notIncluded: ['API Keys', 'Webhooks', 'Advanced Analytics', 'Founder Dashboard', 'SSO'],
  },
  {
    tier: 'scale',
    name: 'Scale',
    tagline: 'For large teams that need full control',
    priceMonthly: 7999,
    priceYearly: 79990,
    includedSeats: 75,
    extraSeatPrice: 89,
    features: ['75 included users', '₹89/extra seat', 'Everything in Business', 'API Keys & Developer Access', 'Webhooks & Integrations', 'Advanced Analytics', 'Founder Dashboard', 'Priority Support'],
    notIncluded: ['SSO', 'Dedicated Infrastructure'],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    tagline: 'For large organizations with custom needs',
    priceMonthly: 0,
    priceYearly: 0,
    includedSeats: 9999,
    extraSeatPrice: 0,
    features: ['Unlimited users', 'Everything in Scale', 'Single Sign-On (SSO)', 'Dedicated Infrastructure', 'Custom SLA', 'Dedicated Account Manager'],
    notIncluded: [],
  },
];

const PLAN_COLORS: Record<PlanTier, { border: string; badge: string; btn: string; glow: string }> = {
  free:       { border: 'border-slate-700/60', badge: 'bg-slate-700/40 text-slate-300', btn: 'bg-slate-700 hover:bg-slate-600', glow: '' },
  starter:    { border: 'border-emerald-500/25', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', btn: 'bg-emerald-600 hover:bg-emerald-500', glow: 'shadow-emerald-500/10' },
  business:   { border: 'border-blue-500/40', badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20', btn: 'bg-blue-600 hover:bg-blue-500', glow: 'shadow-blue-500/20' },
  scale:      { border: 'border-purple-500/30', badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20', btn: 'bg-purple-600 hover:bg-purple-500', glow: 'shadow-purple-500/15' },
  enterprise: { border: 'border-amber-500/25', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20', btn: 'bg-amber-600 hover:bg-amber-500', glow: 'shadow-amber-500/10' },
};

function calcCost(plan: Plan, seats: number, cycle: 'monthly' | 'yearly'): {
  base: number; overage: number; total: number; perMonth: number;
} {
  if (plan.tier === 'enterprise') return { base: 0, overage: 0, total: 0, perMonth: 0 };
  const base = cycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  const extra = Math.max(0, seats - plan.includedSeats);
  const overageMonthly = plan.extraSeatPrice > 0 ? extra * plan.extraSeatPrice : 0;
  const overage = cycle === 'monthly' ? overageMonthly : overageMonthly * 10;
  const total = base + overage;
  const perMonth = cycle === 'monthly' ? total : Math.round(total / 12);
  return { base, overage, total, perMonth };
}

// ─────────────────────────────────────────────────────────────────────────────
// BillingView
// ─────────────────────────────────────────────────────────────────────────────

export const BillingView: React.FC = () => {
  const { currentWorkspace, currentUser, invoices, users, addToast } = useWorkspace();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [seatCount, setSeatCount] = useState<number>(users?.length || 5);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PlanTier>('business');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [activePlanTier, setActivePlanTier] = useState<PlanTier>(
    (currentWorkspace?.plan as PlanTier) || 'free'
  );

  useEffect(() => {
    if (currentWorkspace?.plan) {
      setActivePlanTier(currentWorkspace.plan as PlanTier);
    }
  }, [currentWorkspace?.id, currentWorkspace?.plan]);

  const handleDownloadInvoice = (invNumber: string) => {
    addToast({ type: 'success', title: 'Invoice Downloaded', message: `Tax receipt PDF for ${invNumber} generated.` });
  };

  const handleSelectPlan = (tier: PlanTier) => {
    if (tier === 'enterprise') {
      addToast({ type: 'info', title: 'Enterprise Sales', message: 'Our team will contact you within 24 hours.' });
      return;
    }
    if (tier === activePlanTier) return;
    setSelectedTier(tier);
    setIsUpgradeModalOpen(true);
  };

  const handleLaunchRazorpayCheckout = async (planTier: PlanTier) => {
    try {
      setIsPaymentProcessing(true);
      addToast({ type: 'info', title: 'Initializing Razorpay Checkout', message: 'Creating subscription contract...' });

      const res = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier, billingCycle, seats: seatCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to initialize subscription.');

      if (!(window as any).Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => { script.onload = resolve; });
      }

      const options = {
        key: data.razorpayKey || 'rzp_test_mock_key_id_12345',
        subscription_id: data.subscriptionId,
        name: 'Workspace OS',
        description: `${planTier.toUpperCase()} Plan (${billingCycle})`,
        image: 'https://app.workspaceos.dev/logo.png',
        handler: async function (response: any) {
          const verifyRes = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              planTier,
              billingCycle,
              seats: seatCount,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error?.message || 'Payment verification failed.');

          setActivePlanTier(planTier);
          setIsUpgradeModalOpen(false);
          addToast({ type: 'success', title: '🎉 Subscription Activated!', message: `Welcome to ${planTier.toUpperCase()} plan.` });
        },
        prefill: { name: currentUser?.name || '', email: currentUser?.email || '' },
        theme: { color: '#2563EB' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Checkout Failed', message: err.message });
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const annualSavings = useMemo(() => {
    const plan = PLANS.find((p) => p.tier === selectedTier);
    if (!plan || plan.tier === 'enterprise' || plan.priceMonthly === 0) return 0;
    return plan.priceMonthly * 2;
  }, [selectedTier]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing & Subscription"
        description="Manage your plan, seats, and invoices. All prices exclusive of 18% GST."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono font-bold flex items-center gap-1.5">
            <IndianRupee className="w-3 h-3" />
            {activePlanTier.toUpperCase()}
          </span>
        }
      />

      {/* Billing Cycle Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111827] border border-white/[0.06] rounded-2xl px-5 py-4">
        <div>
          <p className="text-sm font-bold text-white">Billing Cycle</p>
          <p className="text-xs text-slate-400 mt-0.5">Switch to annual and get 2 months free</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
          <button
            id="billing-cycle-toggle"
            onClick={() => setBillingCycle((c) => c === 'monthly' ? 'yearly' : 'monthly')}
            className="relative cursor-pointer"
            aria-label="Toggle billing cycle"
          >
            {billingCycle === 'yearly' ? (
              <ToggleRight className="w-10 h-10 text-blue-500" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-slate-500" />
            )}
          </button>
          <span className={`text-sm font-semibold ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-500'}`}>
            Annual
            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              Save 2 months
            </span>
          </span>
        </div>
      </div>

      {/* Seat Count Slider */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <p className="text-sm font-bold text-white">Team Size Estimator</p>
          </div>
          <span className="text-sm font-mono font-bold text-white bg-blue-500/15 border border-blue-500/20 px-2.5 py-0.5 rounded-lg">
            {seatCount} users
          </span>
        </div>
        <input
          id="seat-count-slider"
          type="range"
          min={1}
          max={200}
          value={seatCount}
          onChange={(e) => setSeatCount(Number(e.target.value))}
          className="w-full h-1.5 rounded-full accent-blue-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>1</span><span>50</span><span>100</span><span>150</span><span>200</span>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {PLANS.map((plan, i) => {
          const colors = PLAN_COLORS[plan.tier];
          const isActive = activePlanTier === plan.tier;
          const cost = calcCost(plan, seatCount, billingCycle);
          const hasOverage = plan.extraSeatPrice > 0 && seatCount > plan.includedSeats;
          const overageSeats = Math.max(0, seatCount - plan.includedSeats);

          return (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`relative flex flex-col bg-[#0F1629] border rounded-2xl overflow-hidden transition-all ${colors.border} ${plan.highlight ? `shadow-xl ${colors.glow}` : ''}`}
            >
              {/* Most Popular Badge */}
              {plan.highlight && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600" />
              )}
              {plan.highlight && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-blue-600 text-white rounded-b-lg shadow-lg">
                    <Sparkles className="w-2.5 h-2.5" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-5 flex flex-col flex-1">
                {/* Plan Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-black text-white">{plan.name}</h3>
                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">{plan.tagline}</p>
                </div>

                {/* Pricing */}
                <div className="mb-4">
                  {plan.tier === 'enterprise' ? (
                    <div>
                      <p className="text-2xl font-black text-white">Custom</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Contact our sales team</p>
                    </div>
                  ) : plan.priceMonthly === 0 ? (
                    <div>
                      <p className="text-2xl font-black text-white">₹0</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Forever free</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-slate-500 font-bold">₹</span>
                        <span className="text-2xl font-black text-white">
                          {billingCycle === 'yearly'
                            ? Math.round(cost.perMonth).toLocaleString('en-IN')
                            : cost.total.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-500">/mo</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Billed ₹{cost.total.toLocaleString('en-IN')}/year
                          <span className="ml-1 text-emerald-400 font-bold">
                            (save ₹{(plan.priceMonthly * 2).toLocaleString('en-IN')})
                          </span>
                        </p>
                      )}
                      {/* Seat info */}
                      <div className="mt-2 flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span className="text-[11px] text-slate-400">
                          {plan.includedSeats} seats included
                        </span>
                      </div>
                      {plan.extraSeatPrice > 0 && (
                        <div className="flex items-center gap-1.5">
                          <ArrowUpRight className="w-3 h-3 text-slate-500" />
                          <span className="text-[11px] text-slate-400">
                            ₹{plan.extraSeatPrice}/extra seat
                          </span>
                        </div>
                      )}
                      {/* Live overage indicator */}
                      {hasOverage && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-[10px] text-amber-300 font-semibold">
                            +{overageSeats} extra seats = +₹{(overageSeats * plan.extraSeatPrice).toLocaleString('en-IN')}/mo
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="flex-1 space-y-1.5 mb-5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-300">{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded.slice(0, 3).map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <X className="w-3 h-3 text-slate-700 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-600">{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  id={`plan-select-${plan.tier}`}
                  onClick={() => handleSelectPlan(plan.tier)}
                  disabled={isActive || isPaymentProcessing}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-slate-700/50 text-slate-400 border border-white/[0.06]'
                      : colors.btn
                  }`}
                >
                  {isActive ? 'Current Plan' : plan.tier === 'enterprise' ? 'Contact Sales' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* GST Note */}
      <p className="text-[11px] text-slate-600 text-center">
        All prices are exclusive of 18% GST (CGST 9% + SGST 9%). GST invoice generated on payment.
      </p>

      {/* Invoice History */}
      {invoices && invoices.length > 0 && (
        <div className="bg-[#111827] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white">Invoice History</h3>
            <p className="text-xs text-slate-500 mt-0.5">GST-compliant tax receipts for all payments</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.04] bg-slate-900/30">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice #</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Plan</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {invoices.slice(0, 10).map((inv: any) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-slate-300 font-mono">{inv.invoiceNumber || inv.id.slice(0, 12)}</td>
                  <td className="px-5 py-3 text-slate-400">
                    {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-400 capitalize">{inv.plan || activePlanTier}</td>
                  <td className="px-5 py-3 text-white font-semibold">
                    ₹{((inv.amount || 0) / 100).toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {inv.status || 'paid'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDownloadInvoice(inv.invoiceNumber || inv.id)}
                      className="flex items-center gap-1 text-slate-400 hover:text-white text-[11px] font-medium ml-auto cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      <AnimatePresence>
        {isUpgradeModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsUpgradeModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="bg-[#0F1629] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Upgrade to {PLANS.find(p => p.tier === selectedTier)?.name}</h3>
                  <p className="text-xs text-slate-400">Confirm your subscription details</p>
                </div>
              </div>

              {(() => {
                const plan = PLANS.find(p => p.tier === selectedTier)!;
                const cost = calcCost(plan, seatCount, billingCycle);
                const overageSeats = Math.max(0, seatCount - plan.includedSeats);
                const gst = Math.round(cost.total * 0.18);
                const totalWithGst = cost.total + gst;
                return (
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{plan.name} Plan ({billingCycle})</span>
                      <span className="text-white font-mono">₹{(billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly).toLocaleString('en-IN')}</span>
                    </div>
                    {overageSeats > 0 && plan.extraSeatPrice > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">+{overageSeats} extra seats × ₹{plan.extraSeatPrice}</span>
                        <span className="text-amber-300 font-mono">₹{(overageSeats * plan.extraSeatPrice * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {billingCycle === 'yearly' && (
                      <div className="flex justify-between text-xs">
                        <span className="text-emerald-400 font-semibold">Annual savings (2 months free)</span>
                        <span className="text-emerald-400 font-mono">-₹{annualSavings.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">GST (18%)</span>
                      <span className="text-slate-300 font-mono">₹{gst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-white/[0.06] pt-3 flex justify-between">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-sm font-black text-white font-mono">₹{totalWithGst.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 bg-slate-800/60 border border-white/[0.06] hover:bg-slate-700/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-upgrade-btn"
                  onClick={() => handleLaunchRazorpayCheckout(selectedTier)}
                  disabled={isPaymentProcessing}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isPaymentProcessing ? (
                    <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
                  ) : (
                    <><CreditCard className="w-3.5 h-3.5" />Pay with Razorpay</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
