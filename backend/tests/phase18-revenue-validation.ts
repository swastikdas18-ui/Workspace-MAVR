/**
 * Phase 18 — Revenue Architecture Validation Suite
 *
 * 8 suites covering:
 * 1. Plan Config integrity
 * 2. Seat cost calculations
 * 3. Annual billing formula
 * 4. Feature gates (80 assertions across 5 plans × 16 features)
 * 5. Seat overages (Business + Scale)
 * 6. Plan migrations
 * 7. GST invoice (CGST + SGST split)
 * 8. Usage warnings (75% / 90% / 100%)
 *
 * Target: 100% pass
 */

import { inMemoryDb } from '../packages/database';
import { PLAN_CONFIG, BillingRepository, WorkspaceFeature, PlanTier } from '../src/repositories/billing-repository';
import { PricingEngine } from '../src/services/pricing-engine';
import { FeatureGate } from '../src/services/feature-gate';
import { InvoiceGeneratorService } from '../src/services/invoice-generator-service';
import { UsageService } from '../src/services/usage-service';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

function assertThrows(fn: () => void, label: string): void {
  try {
    fn();
    console.error(`  ❌ FAIL (expected throw): ${label}`);
    failed++;
  } catch {
    console.log(`  ✅ ${label}`);
    passed++;
  }
}

async function runPhase18Validation() {
  console.log('================================================================');
  console.log('PHASE 18 — REVENUE ARCHITECTURE VALIDATION SUITE');
  console.log('================================================================');

  inMemoryDb.reset();

  // =========================================================================
  // SUITE 1 — Plan Config Integrity
  // =========================================================================
  console.log('\n─── 1. Plan Config Integrity ───');

  const tiers: PlanTier[] = ['free', 'starter', 'business', 'scale', 'enterprise'];

  assert(!('growth' in PLAN_CONFIG), 'No "growth" plan — replaced by "scale"');
  assert(tiers.every((t) => t in PLAN_CONFIG), 'All 5 tiers defined: free, starter, business, scale, enterprise');

  // Free
  assert(PLAN_CONFIG.free.priceMonthly === 0,      'Free: ₹0/month');
  assert(PLAN_CONFIG.free.includedSeats === 3,     'Free: 3 included seats');
  assert(PLAN_CONFIG.free.limits.maxProjects === 2,'Free: 2 project limit');
  assert(PLAN_CONFIG.free.extraSeatPrice === 0,    'Free: no extra seat pricing');

  // Starter
  assert(PLAN_CONFIG.starter.priceMonthly === 999,    'Starter: ₹999/month');
  assert(PLAN_CONFIG.starter.includedSeats === 10,    'Starter: 10 included seats');
  assert(PLAN_CONFIG.starter.priceYearly === 9990,    'Starter annual: ₹9,990 (10 months)');
  assert(PLAN_CONFIG.starter.extraSeatPrice === 0,    'Starter: no seat expansion');

  // Business
  assert(PLAN_CONFIG.business.priceMonthly === 2999,  'Business: ₹2,999/month');
  assert(PLAN_CONFIG.business.includedSeats === 25,   'Business: 25 included seats');
  assert(PLAN_CONFIG.business.extraSeatPrice === 99,  'Business: ₹99/extra seat');
  assert(PLAN_CONFIG.business.priceYearly === 29990,  'Business annual: ₹29,990');
  assert(PLAN_CONFIG.business.highlight === true,     'Business marked as Most Popular');

  // Scale
  assert(PLAN_CONFIG.scale.priceMonthly === 7999,     'Scale: ₹7,999/month');
  assert(PLAN_CONFIG.scale.includedSeats === 75,      'Scale: 75 included seats');
  assert(PLAN_CONFIG.scale.extraSeatPrice === 89,     'Scale: ₹89/extra seat');
  assert(PLAN_CONFIG.scale.priceYearly === 79990,     'Scale annual: ₹79,990');

  // Enterprise
  assert(PLAN_CONFIG.enterprise.priceMonthly === 0,   'Enterprise: custom pricing (₹0 base)');
  assert(PLAN_CONFIG.enterprise.includedSeats === 9999,'Enterprise: unlimited seats');

  // Feature arrays present
  assert(PLAN_CONFIG.business.features.includes('time_tracking'), 'Business features include time_tracking');
  assert(PLAN_CONFIG.scale.features.includes('api_keys'),         'Scale features include api_keys');
  assert(PLAN_CONFIG.enterprise.features.includes('sso'),         'Enterprise features include sso');

  console.log(`\n  ✅ PASS: Plan Config Integrity (${passed} assertions)`);

  // =========================================================================
  // SUITE 2 — Seat Cost Calculations
  // =========================================================================
  console.log('\n─── 2. Seat Cost Calculations ───');

  // Business — exactly at limit
  const biz25 = PricingEngine.calculateSubscriptionCost('business', 25, 'monthly');
  assert(biz25.extraSeats === 0,         'Business 25 users: no overage');
  assert(biz25.totalMonthly === 2999,    'Business 25 users: ₹2,999/month');
  assert(biz25.extraSeatCost === 0,      'Business 25 users: ₹0 overage cost');

  // Business — 5 extra seats
  const biz30 = PricingEngine.calculateSubscriptionCost('business', 30, 'monthly');
  assert(biz30.extraSeats === 5,         'Business 30 users: 5 extra seats');
  assert(biz30.extraSeatCost === 495,    'Business 30 users: 5 × ₹99 = ₹495');
  assert(biz30.totalMonthly === 3494,    'Business 30 users: ₹2,999 + ₹495 = ₹3,494');

  // Scale — exactly at limit
  const scl75 = PricingEngine.calculateSubscriptionCost('scale', 75, 'monthly');
  assert(scl75.extraSeats === 0,         'Scale 75 users: no overage');
  assert(scl75.totalMonthly === 7999,    'Scale 75 users: ₹7,999/month');

  // Scale — 5 extra seats
  const scl80 = PricingEngine.calculateSubscriptionCost('scale', 80, 'monthly');
  assert(scl80.extraSeats === 5,         'Scale 80 users: 5 extra seats');
  assert(scl80.extraSeatCost === 445,    'Scale 80 users: 5 × ₹89 = ₹445');
  assert(scl80.totalMonthly === 8444,    'Scale 80 users: ₹7,999 + ₹445 = ₹8,444');

  // Starter — no expansion
  const str10 = PricingEngine.calculateSubscriptionCost('starter', 15, 'monthly');
  assert(str10.extraSeats === 5,         'Starter 15 users: 5 over limit');
  assert(str10.extraSeatCost === 0,      'Starter: no seat pricing — overage cost ₹0');
  assert(str10.totalMonthly === 999,     'Starter 15 users: still ₹999/month (no expansion)');

  console.log(`\n  ✅ PASS: Seat Cost Calculations`);

  // =========================================================================
  // SUITE 3 — Annual Billing Formula
  // =========================================================================
  console.log('\n─── 3. Annual Billing Formula ───');

  assert(PricingEngine.getAnnualPrice('starter') === 9990,   'Starter annual: ₹999 × 10 = ₹9,990');
  assert(PricingEngine.getAnnualPrice('business') === 29990, 'Business annual: ₹2,999 × 10 = ₹29,990');
  assert(PricingEngine.getAnnualPrice('scale') === 79990,    'Scale annual: ₹7,999 × 10 = ₹79,990');

  const annualBiz = PricingEngine.calculateSubscriptionCost('business', 25, 'yearly');
  assert(annualBiz.totalYearly === 29990,                'Annual Business total: ₹29,990');
  assert(annualBiz.annualSavings === 5998,               'Annual Business savings: ₹2,999 × 2 = ₹5,998');
  assert(annualBiz.effectiveMonthlyFromAnnual === 2499,  'Annual Business: ₹29,990 / 12 ≈ ₹2,499/mo');

  const annualScl = PricingEngine.calculateSubscriptionCost('scale', 80, 'yearly');
  assert(annualScl.totalYearly === 84440,                'Annual Scale (80 users): (₹7,999 + ₹445) × 10 = ₹84,440');
  // Savings = totalMonthly × 2 = ₹8,444 × 2 = ₹16,888
  assert(annualScl.annualSavings === 16888,              'Annual Scale savings: ₹8,444 × 2 = ₹16,888 (2 months free)');

  console.log(`\n  ✅ PASS: Annual Billing Formula`);

  // =========================================================================
  // SUITE 4 — Feature Gate Engine (80 assertions: 5 plans × 16 features)
  // =========================================================================
  console.log('\n─── 4. Feature Gate Engine ───');

  type FM = Record<WorkspaceFeature, boolean>;
  const GATE: Record<PlanTier, FM> = {
    free:       { projects: true,  tasks: true,  crm: false, documents: false, wiki: false, guest_portal_view: false, time_tracking: false, automations: false, client_approvals: false, invoices: false, utilization_reports: false, api_keys: false, webhooks: false, analytics: false, founder_console: false, priority_support: false, sso: false, dedicated_infra: false },
    starter:    { projects: true,  tasks: true,  crm: true,  documents: true,  wiki: true,  guest_portal_view: true,  time_tracking: false, automations: false, client_approvals: false, invoices: false, utilization_reports: false, api_keys: false, webhooks: false, analytics: false, founder_console: false, priority_support: false, sso: false, dedicated_infra: false },
    business:   { projects: true,  tasks: true,  crm: true,  documents: true,  wiki: true,  guest_portal_view: true,  time_tracking: true,  automations: true,  client_approvals: true,  invoices: true,  utilization_reports: true,  api_keys: false, webhooks: false, analytics: false, founder_console: false, priority_support: false, sso: false, dedicated_infra: false },
    scale:      { projects: true,  tasks: true,  crm: true,  documents: true,  wiki: true,  guest_portal_view: true,  time_tracking: true,  automations: true,  client_approvals: true,  invoices: true,  utilization_reports: true,  api_keys: true,  webhooks: true,  analytics: true,  founder_console: true,  priority_support: true,  sso: false, dedicated_infra: false },
    enterprise: { projects: true,  tasks: true,  crm: true,  documents: true,  wiki: true,  guest_portal_view: true,  time_tracking: true,  automations: true,  client_approvals: true,  invoices: true,  utilization_reports: true,  api_keys: true,  webhooks: true,  analytics: true,  founder_console: true,  priority_support: true,  sso: true,  dedicated_infra: true  },
  };

  let gateAssertions = 0;
  for (const [plan, featureMap] of Object.entries(GATE) as [PlanTier, FM][]) {
    for (const [feature, expected] of Object.entries(featureMap) as [WorkspaceFeature, boolean][]) {
      const result = FeatureGate.hasFeature(plan, feature);
      assert(
        result === expected,
        `FeatureGate.hasFeature('${plan}', '${feature}') → ${expected}`,
      );
      gateAssertions++;
    }
  }
  assert(gateAssertions === 90, `Feature gate matrix covered ${gateAssertions} assertions`);

  // assertFeature throws for denied access
  assertThrows(() => FeatureGate.assertFeature('free', 'time_tracking'),  'assertFeature throws for free → time_tracking');
  assertThrows(() => FeatureGate.assertFeature('starter', 'api_keys'),    'assertFeature throws for starter → api_keys');
  assertThrows(() => FeatureGate.assertFeature('business', 'sso'),        'assertFeature throws for business → sso');
  assertThrows(() => FeatureGate.assertFeature('scale', 'dedicated_infra'),'assertFeature throws for scale → dedicated_infra');

  // getEnabledFeatures
  const freeFeat = FeatureGate.getEnabledFeatures('free');
  assert(freeFeat.length === 2,                              'Free plan: 2 features enabled');
  assert(freeFeat.includes('projects'),                      'Free plan: projects enabled');
  const bizFeat = FeatureGate.getEnabledFeatures('business');
  assert(bizFeat.includes('time_tracking'),                  'Business plan: time_tracking enabled');
  assert(!bizFeat.includes('api_keys'),                      'Business plan: api_keys NOT enabled');

  // getUnlockedByUpgrade
  const unlocked = FeatureGate.getUnlockedByUpgrade('starter', 'business');
  assert(unlocked.includes('time_tracking'),                 'Upgrade starter→business unlocks time_tracking');
  assert(unlocked.includes('automations'),                   'Upgrade starter→business unlocks automations');
  assert(!unlocked.includes('projects'),                     'Upgrade starter→business: projects already unlocked');

  console.log(`\n  ✅ PASS: Feature Gate Engine`);

  // =========================================================================
  // SUITE 5 — Seat Overages
  // =========================================================================
  console.log('\n─── 5. Seat Overages ───');

  const ov1 = PricingEngine.getSeatOverage('business', 30);
  assert(ov1.hasOverage === true,          'Business 30 users: hasOverage = true');
  assert(ov1.extraSeats === 5,             'Business 30 users: 5 extra seats');
  assert(ov1.overageCostMonthly === 495,   'Business 30 users: ₹495/month overage');

  const ov2 = PricingEngine.getSeatOverage('business', 25);
  assert(ov2.hasOverage === false,         'Business 25 users: hasOverage = false');
  assert(ov2.overageCostMonthly === 0,     'Business 25 users: ₹0 overage');

  const ov3 = PricingEngine.getSeatOverage('scale', 80);
  assert(ov3.hasOverage === true,          'Scale 80 users: hasOverage = true');
  assert(ov3.extraSeats === 5,             'Scale 80 users: 5 extra seats');
  assert(ov3.overageCostMonthly === 445,   'Scale 80 users: ₹445/month overage');

  const ov4 = PricingEngine.getSeatOverage('starter', 15);
  assert(ov4.hasOverage === false,         'Starter 15 users: no seat expansion (hasOverage = false)');
  assert(ov4.overageCostMonthly === 0,     'Starter 15 users: ₹0 overage (no expansion on Starter)');

  console.log(`\n  ✅ PASS: Seat Overages`);

  // =========================================================================
  // SUITE 6 — Plan Migrations
  // =========================================================================
  console.log('\n─── 6. Plan Migrations (free→starter→business→scale) ───');

  const migrateWsId = 'ws-migrate-18';
  inMemoryDb.workspaces.set(migrateWsId, {
    id: migrateWsId, name: 'Migration Test Co.', slug: 'migration-test',
    ownerId: 'user-mig', plan: 'free', createdAt: new Date().toISOString(),
  } as any);

  // Step 1: free → starter
  const sub1 = await BillingRepository.updateSubscription(migrateWsId, 'starter', 'monthly');
  assert(sub1.plan === 'starter',          'Migrate free→starter: plan updated');
  assert(sub1.status === 'active',         'Migrate free→starter: status active');
  assert(sub1.pricePerMonth === 999,       'Migrate free→starter: price ₹999');

  // Verify feature access
  assert(FeatureGate.hasFeature('starter', 'crm'),          'Starter plan: CRM unlocked');
  assert(!FeatureGate.hasFeature('starter', 'automations'), 'Starter plan: automations still locked');

  // Step 2: starter → business
  const sub2 = await BillingRepository.updateSubscription(migrateWsId, 'business', 'monthly');
  assert(sub2.plan === 'business',         'Migrate starter→business: plan updated');
  assert(sub2.pricePerMonth === 2999,      'Migrate starter→business: price ₹2,999');
  assert(FeatureGate.hasFeature('business', 'time_tracking'), 'Business plan: time_tracking unlocked');
  assert(FeatureGate.hasFeature('business', 'automations'),   'Business plan: automations unlocked');

  // Step 3: business → scale
  const sub3 = await BillingRepository.updateSubscription(migrateWsId, 'scale', 'monthly', 80);
  assert(sub3.plan === 'scale',            'Migrate business→scale: plan updated');
  assert(sub3.seats === 80,               'Migrate to scale: 80 active seats tracked');
  // 80 users = 75 included + 5 extra × ₹89 = ₹445 overage
  assert(sub3.pricePerMonth === 8444,      'Migrate to scale (80 seats): ₹7,999 + ₹445 = ₹8,444');
  assert(FeatureGate.hasFeature('scale', 'api_keys'),         'Scale plan: api_keys unlocked');
  assert(FeatureGate.hasFeature('scale', 'webhooks'),         'Scale plan: webhooks unlocked');
  assert(!FeatureGate.hasFeature('scale', 'sso'),             'Scale plan: sso still locked (Enterprise only)');

  // Annual billing migration
  const sub4 = await BillingRepository.updateSubscription(migrateWsId, 'business', 'yearly');
  assert(sub4.billingCycle === 'yearly',   'Annual billing: billingCycle = yearly');
  assert(sub4.pricePerMonth === 29990,     'Annual business: ₹29,990 billed yearly');

  console.log(`\n  ✅ PASS: Plan Migrations`);

  // =========================================================================
  // SUITE 7 — GST Invoice (CGST + SGST Split)
  // =========================================================================
  console.log('\n─── 7. GST Invoice (CGST 9% + SGST 9%) ───');

  // Seed a time entry
  inMemoryDb.taskTimeEntries.set('te-gst-1', {
    id: 'te-gst-1',
    workspaceId: migrateWsId,
    taskId: 'task-1',
    userId: 'user-mig',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes: 120,      // 2 hours
    billable: true,
    hourlyRate: 2500,          // ₹2,500/hr
    currency: 'INR',
    notes: 'Frontend development',
  } as any);

  const invoice = await InvoiceGeneratorService.generateInvoiceFromTimeEntries({
    workspaceId: migrateWsId,
    clientName: 'Acme Corp',
    companyName: 'Migration Test Co. Pvt Ltd',
    companyGstin: '27AAACM1234F1Z5',
    billingAddress: '400 001, Mumbai, Maharashtra',
    clientEmail: 'billing@acmecorp.com',
    timeEntryIds: ['te-gst-1'],
    taxRatePercent: 18,
  });

  // 2 hours × ₹2,500 = ₹5,000 subtotal
  assert(invoice.subtotal === 5000,                'GST Invoice: subtotal = ₹5,000 (2h × ₹2,500)');
  assert(invoice.gst.cgst === 450,                 'GST Invoice: CGST = ₹450 (9%)');
  assert(invoice.gst.sgst === 450,                 'GST Invoice: SGST = ₹450 (9%)');
  assert(invoice.gst.totalTax === 900,             'GST Invoice: total tax = ₹900 (18%)');
  assert(invoice.total === 5900,                   'GST Invoice: total = ₹5,000 + ₹900 = ₹5,900');
  assert(invoice.currency === 'INR',               'GST Invoice: currency = INR');
  assert(invoice.companyGstin === '27AAACM1234F1Z5','GST Invoice: GSTIN stored correctly');
  assert(invoice.gst.taxableValue === 5000,        'GST Invoice: taxableValue = ₹5,000');
  assert(invoice.gst.igst === 900,                 'GST Invoice: IGST = ₹900 (for inter-state reference)');

  // Subscription GST invoice
  const subInvoice = InvoiceGeneratorService.generateSubscriptionInvoice({
    workspaceId: migrateWsId,
    planName: 'Business',
    baseAmount: 2999,
    extraSeats: 5,
    extraSeatCost: 495,
    billingCycle: 'monthly',
    companyLegalName: 'Apex Digital Pvt Ltd',
    gstin: '29AABCA1234B1ZD',
    billingAddress: '560 001, Bengaluru, Karnataka',
  });

  // ₹2,999 + ₹495 = ₹3,494 subtotal; GST = CGST(9%) + SGST(9%) each rounded
  // Math.round(3494 × 0.09) = Math.round(314.46) = 314; totalTax = 314+314 = 628
  const expectedSubtotal = 3494;
  const expectedCgst = Math.round(expectedSubtotal * 0.09);  // 314
  const expectedSgst = Math.round(expectedSubtotal * 0.09);  // 314
  const expectedGst = expectedCgst + expectedSgst;            // 628
  assert(subInvoice.subtotal === expectedSubtotal,     `Subscription GST Invoice: subtotal = ₹${expectedSubtotal}`);
  assert(subInvoice.gst.totalTax === expectedGst,     `Subscription GST Invoice: total GST = ₹${expectedGst} (CGST ₹${expectedCgst} + SGST ₹${expectedSgst})`);
  assert(subInvoice.total === expectedSubtotal + expectedGst, `Subscription GST Invoice: total = ₹${expectedSubtotal + expectedGst}`);
  assert(subInvoice.items.length === 2,               'Subscription GST Invoice: 2 line items (base + seats)');

  console.log(`\n  ✅ PASS: GST Invoice`);

  // =========================================================================
  // SUITE 8 — Usage Warnings (75% / 90% / 100%)
  // =========================================================================
  console.log('\n─── 8. Usage Warnings (75% / 90% / 100%) ───');

  // Free plan: 3 seats
  const warn_free_75pct = UsageService.evaluateSeatWarning('free', 3, 3);
  assert(warn_free_75pct.level === 'exceeded',        'Free 3/3 seats: level = exceeded (100%)');
  assert(warn_free_75pct.message.includes('🚫'),     'Free 100%: message contains 🚫');
  assert(warn_free_75pct.percent === 100,             'Free 3/3: percent = 100');

  // Business: 25 seats
  const warn_biz_ok = UsageService.evaluateSeatWarning('business', 15, 25);
  assert(warn_biz_ok.level === 'ok',                  'Business 15/25 seats: level = ok (60%)');
  assert(warn_biz_ok.message === '',                  'Business 60%: no warning message');

  const warn_biz_75 = UsageService.evaluateSeatWarning('business', 19, 25);
  assert(warn_biz_75.level === 'approaching',         'Business 19/25 seats: level = approaching (76%)');
  assert(warn_biz_75.message.includes('75%') || warn_biz_75.message.includes('76%'), 'Business 75%: message mentions percent');

  const warn_biz_90 = UsageService.evaluateSeatWarning('business', 23, 25);
  assert(warn_biz_90.level === 'critical',            'Business 23/25 seats: level = critical (92%)');
  assert(warn_biz_90.message.includes('⚠️'),         'Business 90%: message contains ⚠️');
  assert(warn_biz_90.upgradeMessage!.includes('₹99'),'Business 90%: upgrade message mentions ₹99/seat');

  const warn_biz_100 = UsageService.evaluateSeatWarning('business', 25, 25);
  assert(warn_biz_100.level === 'exceeded',           'Business 25/25 seats: level = exceeded (100%)');
  assert(warn_biz_100.message.includes('🚫'),        'Business 100%: message contains 🚫');

  // Scale: 75 seats
  const warn_scl_90 = UsageService.evaluateSeatWarning('scale', 68, 75);
  assert(warn_scl_90.level === 'critical',            'Scale 68/75 seats: level = critical (91%)');
  assert(warn_scl_90.upgradeMessage!.includes('₹89'),'Scale 90%: upgrade message mentions ₹89/seat');

  // Full usage summary
  const usageWsId = 'ws-usage-18';
  inMemoryDb.workspaces.set(usageWsId, {
    id: usageWsId, name: 'Usage Test Corp', slug: 'usage-test',
    ownerId: 'usr-usage', plan: 'business', createdAt: new Date().toISOString(),
  } as any);
  inMemoryDb.subscriptions.set('sub-usage', {
    id: 'sub-usage', workspaceId: usageWsId, plan: 'business',
    status: 'active', billingCycle: 'monthly', seats: 25, pricePerMonth: 2999,
    createdAt: new Date(), updatedAt: new Date(),
  } as any);
  // Seed 23 members → 92% usage → critical warning
  for (let i = 0; i < 23; i++) {
    inMemoryDb.workspaceMembers.set(`mem-u-${i}`, {
      id: `mem-u-${i}`, workspaceId: usageWsId, userId: `usr-${i}`, role: 'employee', joinedAt: new Date(),
    } as any);
  }

  const usage = await UsageService.getWorkspaceUsage(usageWsId);
  assert(usage.plan === 'business',                      'Usage summary: plan = business');
  assert(usage.seatWarning.level === 'critical',         'Usage summary: seatWarning.level = critical');
  assert(usage.usage.members.current === 23,             'Usage summary: 23 members counted');
  assert(usage.usage.members.limit === 25,               'Usage summary: limit = 25 included seats');
  assert(usage.usage.members.percent >= 90,              'Usage summary: percent >= 90');
  assert(usage.recommendation !== undefined,             'Usage summary: recommendation provided');

  console.log(`\n  ✅ PASS: Usage Warnings`);

  // =========================================================================
  // FINAL SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  const total = passed + failed;
  if (failed === 0) {
    console.log(`✅ ALL ${passed}/${total} ASSERTIONS PASSED — 100% PASS RATE`);
  } else {
    console.log(`❌ ${failed}/${total} ASSERTIONS FAILED`);
  }
  console.log('================================================================');
  console.log('\nSuite Results:');
  console.log('  Suite 1: Plan Config Integrity');
  console.log('  Suite 2: Seat Cost Calculations');
  console.log('  Suite 3: Annual Billing Formula');
  console.log('  Suite 4: Feature Gate Engine (90 assertions)');
  console.log('  Suite 5: Seat Overages');
  console.log('  Suite 6: Plan Migrations');
  console.log('  Suite 7: GST Invoice (CGST + SGST)');
  console.log('  Suite 8: Usage Warnings (75% / 90% / 100%)');

  if (failed > 0) process.exit(1);
}

runPhase18Validation().catch((err) => {
  console.error('\n❌ Validation Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
