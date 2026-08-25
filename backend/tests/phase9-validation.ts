import { foundingPartnerRouter } from '../src/routes/founding-partner';
import { BillingRepository, PLAN_CONFIG } from '../src/repositories/billing-repository';
import { UsageService } from '../src/services/usage-service';
import { inMemoryDb } from '../packages/database';

async function testPhase9() {
  console.log('=== TEST 1: Billing Plans Config ===');
  console.log('Plans:', Object.keys(PLAN_CONFIG));
  console.log('Business Plan Limits:', PLAN_CONFIG.business);

  console.log('=== TEST 2: Founding Partner Ingestion & CRM Lead Auto-Creation ===');
  const appRes = await foundingPartnerRouter.request('/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Apex Digital Studio',
      industry: 'Agency',
      teamSize: '12',
      location: 'Bangalore, India',
      ownerName: 'Swastik Das',
      email: 'swastik@apexdigital.test',
      phone: '+91 98765 43210',
      currentTools: 'WhatsApp, Google Drive, Trello',
      biggestChallenge: 'Scattered communication and lost lead followups',
      whyInterested: 'Want 1 operating system for our 12 team members'
    })
  });
  const appData = await appRes.json();
  console.log('Application Submission Response:', appRes.status, appData);

  console.log('=== TEST 3: Founding Partner Funnel Metrics ===');
  const metricsRes = await foundingPartnerRouter.request('/metrics', { method: 'GET' });
  const metricsData = await metricsRes.json();
  console.log('Funnel Metrics:', JSON.stringify(metricsData, null, 2));
  console.log('=== PHASE 9 VALIDATION COMPLETE ===');
}

testPhase9();
