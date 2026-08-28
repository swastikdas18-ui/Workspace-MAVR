import { Hono } from 'hono';
import { CRMRepository } from '../repositories/crm-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { TaskRepository } from '../repositories/task-repository';
import { DocumentRepository } from '../repositories/document-repository';
import { WorkspaceRepository } from '../repositories/workspace-repository';
import { BillingRepository } from '../repositories/billing-repository';
import { EventService } from '../services/event-service';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';
import { inMemoryDb } from '../../packages/database/index.js';

export const foundingPartnerRouter = new Hono();

export interface FoundingPartnerApplication {
  id: string;
  businessName: string;
  industry: string;
  website?: string;
  teamSize: string;
  location: string;
  ownerName: string;
  email: string;
  phone: string;
  currentTools?: string;
  biggestChallenge?: string;
  whyInterested?: string;
  stage: 'applied' | 'qualified' | 'discovery_scheduled' | 'pilot_started' | 'active_customer' | 'testimonial_received';
  createdAt: Date;
  updatedAt: Date;
}

// In-memory application store for rapid retrieval and funnel metrics
const partnerApplications: Map<string, FoundingPartnerApplication> = new Map();

/**
 * POST /api/founding-partner/apply
 * Public submission of Founding Partner Program Application
 */
foundingPartnerRouter.post('/apply', async (c) => {
  try {
    const body = await c.req.json();
    const {
      businessName,
      industry,
      website = '',
      teamSize,
      location,
      ownerName,
      email,
      phone,
      currentTools = '',
      biggestChallenge = '',
      whyInterested = '',
    } = body;

    if (!businessName || !ownerName || !email || !phone) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Business name, owner name, email, and phone are required.' } },
        400
      );
    }

    // Check strict 3 organizations cap
    const activeCount = Array.from(partnerApplications.values()).filter(
      (a) => a.stage === 'active_customer' || a.stage === 'testimonial_received'
    ).length;

    if (activeCount >= 3) {
      return c.json(
        {
          error: {
            code: 'PROGRAM_FULL',
            message: 'All 3 Founding Partner Program slots are currently filled. Applications are closed.',
          },
        },
        400
      );
    }

    const appId = `fpa-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const application: FoundingPartnerApplication = {
      id: appId,
      businessName: businessName.trim(),
      industry: industry || 'MSME',
      website,
      teamSize: String(teamSize || '5-15'),
      location: location || 'India',
      ownerName: ownerName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      currentTools,
      biggestChallenge,
      whyInterested,
      stage: 'applied',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    partnerApplications.set(appId, application);

    // Also auto-create a CRM Lead in the target system for the default admin workspace or active workspace
    const primaryWs = Array.from(inMemoryDb.workspaces.values())[0];
    const wsId = primaryWs?.id || 'ws-default-admin';
    const ownerId = primaryWs?.ownerId || 'usr-system';

    const crmRecord = await CRMRepository.createRecord({
      customerName: ownerName.trim(),
      company: businessName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      dealValue: 1499 * 12, // 1 Year Business Pro Value in INR (₹17,988)
      status: 'new_lead',
      ownerId,
      workspaceId: wsId,
      notes: `[Founding Partner Application]\nIndustry: ${industry}\nTeam Size: ${teamSize}\nLocation: ${location}\nTools Used: ${currentTools}\nChallenge: ${biggestChallenge}\nWhy Workspace OS: ${whyInterested}`,
    });

    return c.json(
      {
        success: true,
        message: 'Founding Partner application submitted successfully. Our team will review and schedule your discovery call.',
        applicationId: appId,
        crmLeadId: crmRecord.id,
      },
      201
    );
  } catch (err: any) {
    return c.json(
      { error: { code: 'APPLICATION_ERROR', message: err.message || 'Failed to submit application' } },
      500
    );
  }
});

/**
 * GET /api/founding-partner/metrics
 * Acquisition Funnel Analytics for Founding Partner Program
 */
foundingPartnerRouter.get('/metrics', async (c) => {
  const allApps = Array.from(partnerApplications.values());

  // Count by stage
  const counts = {
    applied: allApps.filter((a) => a.stage === 'applied').length,
    qualified: allApps.filter((a) => a.stage === 'qualified').length,
    discovery_scheduled: allApps.filter((a) => a.stage === 'discovery_scheduled').length,
    pilot_started: allApps.filter((a) => a.stage === 'pilot_started').length,
    active_customer: allApps.filter((a) => a.stage === 'active_customer').length,
    testimonial_received: allApps.filter((a) => a.stage === 'testimonial_received').length,
  };

  const total = allApps.length;
  const activeCustomers = counts.active_customer + counts.testimonial_received;
  const maxSlots = 3;
  const remainingSlots = Math.max(0, maxSlots - activeCustomers);
  const slotsStatus = activeCustomers >= maxSlots ? '3 / 3 Filled (Program Full)' : `${activeCustomers} / ${maxSlots} Filled (${remainingSlots} Slots Remaining)`;

  const conversionToQualified = total > 0 ? Math.round(((counts.qualified + counts.discovery_scheduled + counts.pilot_started + counts.active_customer + counts.testimonial_received) / total) * 100) : 0;
  const conversionToActive = total > 0 ? Math.round((activeCustomers / total) * 100) : 0;

  return c.json(
    {
      metrics: {
        applicationsReceived: total,
        qualifiedLeads: counts.qualified + counts.discovery_scheduled + counts.pilot_started + counts.active_customer + counts.testimonial_received,
        discoveryCalls: counts.discovery_scheduled + counts.pilot_started + counts.active_customer + counts.testimonial_received,
        pilotActivations: counts.pilot_started + counts.active_customer + counts.testimonial_received,
        activeCustomers,
        testimonialsCollected: counts.testimonial_received,
        totalSlots: maxSlots,
        remainingSlots,
        slotsStatus,
        isProgramFull: activeCustomers >= maxSlots,
        stageBreakdown: counts,
        conversionRates: {
          qualificationRate: `${conversionToQualified}%`,
          finalActivationRate: `${conversionToActive}%`,
        },
      },
    },
    200
  );
});

/**
 * GET /api/founding-partner/applications
 * List applications (Admin authenticated)
 */
foundingPartnerRouter.get('/applications', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const list = Array.from(partnerApplications.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  return c.json({ applications: list }, 200);
});

/**
 * POST /api/founding-partner/approve
 * Approves a Founding Partner & auto-provisions a pre-configured MSME Workspace Template
 */
foundingPartnerRouter.post('/approve', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const { applicationId, workspaceName } = body;

    const app = partnerApplications.get(applicationId);
    if (app) {
      app.stage = 'active_customer';
      app.updatedAt = new Date();
      partnerApplications.set(applicationId, app);
    }

    const wsId = `ws-partner-${Date.now()}`;
    const name = workspaceName || app?.businessName || 'Founding Partner Workspace';
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // 1. Create Workspace
    const ws = await WorkspaceRepository.createWorkspace({
      id: wsId,
      name,
      slug,
      ownerId: user.id,
      plan: 'pro',
    });

    // 2. Set Free 12-Month Business Pro Subscription (₹1,499/mo plan)
    await BillingRepository.updateSubscription(wsId, 'business', 'yearly');

    // 3. Auto-Create 3 Standard MSME Projects
    const opsProj = await ProjectRepository.createProject({
      workspaceId: wsId,
      createdBy: user.id,
      title: 'Operations',
      description: 'Core standard operating procedures and recurring business operations.',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 30 * 86400000),
    });

    const salesProj = await ProjectRepository.createProject({
      workspaceId: wsId,
      createdBy: user.id,
      title: 'Sales & Customer Acquisition',
      description: 'Pipeline tracking, client discovery, and outbound outreach.',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 30 * 86400000),
    });

    const teamProj = await ProjectRepository.createProject({
      workspaceId: wsId,
      createdBy: user.id,
      title: 'Team Management',
      description: 'Hiring, onboarding checklists, training plans, and department alignment.',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 60 * 86400000),
    });

    // 4. Auto-Create Standard Starter Documents
    await DocumentRepository.createDocument({
      title: 'SOP Library',
      fileUrl: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300',
      fileType: 'doc',
      fileSize: '150 KB',
      fileSizeBytes: 153600,
      mimeType: 'application/pdf',
      storageKey: `${wsId}/doc-sop-library/sop_library.pdf`,
      storageUrl: `/api/documents/vault/${wsId}/doc-sop-library/sop_library.pdf`,
      ownerId: user.id,
      workspaceId: wsId,
      visibility: 'team',
      category: 'Policy',
    });

    await DocumentRepository.createDocument({
      title: 'Company Handbook',
      fileUrl: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300',
      fileType: 'pdf',
      fileSize: '220 KB',
      fileSizeBytes: 225280,
      mimeType: 'application/pdf',
      storageKey: `${wsId}/doc-handbook/company_handbook.pdf`,
      storageUrl: `/api/documents/vault/${wsId}/doc-handbook/company_handbook.pdf`,
      ownerId: user.id,
      workspaceId: wsId,
      visibility: 'learning',
      category: 'Onboarding',
    });

    // 5. Auto-Create 3 Onboarding Tasks
    await TaskRepository.createTask(wsId, user.id, {
      title: 'Invite Team Members',
      description: 'Invite your core employees and interns to your new Workspace OS.',
      projectId: teamProj.id,
      assignedTo: user.id,
      priority: 'high',
      status: 'todo',
    });

    await TaskRepository.createTask(wsId, user.id, {
      title: 'Upload Company Documents',
      description: 'Upload your standard operating procedures, training docs, and client templates.',
      projectId: opsProj.id,
      assignedTo: user.id,
      priority: 'medium',
      status: 'todo',
    });

    await TaskRepository.createTask(wsId, user.id, {
      title: 'Create First Workflow Automation',
      description: 'Set up an automated rule to assign new inbound leads to your sales manager.',
      projectId: salesProj.id,
      assignedTo: user.id,
      priority: 'medium',
      status: 'todo',
    });

    return c.json(
      {
        success: true,
        message: 'Pre-configured MSME Workspace provisioned in under 15 minutes.',
        workspace: ws,
        projects: [opsProj, salesProj, teamProj],
      },
      201
    );
  } catch (err: any) {
    return c.json(
      { error: { code: 'PROVISIONING_ERROR', message: err.message || 'Failed to provision workspace template' } },
      500
    );
  }
});
