/**
 * Workspace Health & Customer Success Telemetry Service V2
 *
 * Computes:
 * - Comprehensive Health Score (0–100) based on 10 pillars
 * - Churn Risk Detection: Healthy / At Risk / Critical
 * - Power Users Identification
 * - Account Recommendations & Growth Opportunities
 *
 * New in V2:
 * - Login Frequency pillar
 * - Invite Acceptance Rate pillar
 * - Wiki Adoption pillar
 * - Client Portal Usage pillar
 */

import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';

export interface WorkspaceHealthMetric {
  score: number; // 0–100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'Healthy' | 'At Risk' | 'Critical';
  breakdown: {
    userActivityScore: number;       // 0–15
    projectVelocityScore: number;    // 0–15
    taskCompletionScore: number;     // 0–15
    automationAdoptionScore: number; // 0–10
    searchAdoptionScore: number;     // 0–10
    collaborationScore: number;      // 0–10
    loginFrequencyScore: number;     // 0–10
    inviteAcceptanceScore: number;   // 0–5
    wikiAdoptionScore: number;       // 0–5
    clientPortalScore: number;       // 0–5
  };
  metrics: {
    totalMembers: number;
    activeMembers: number;
    completedProjects: number;
    totalProjects: number;
    completedTasks: number;
    totalTasks: number;
    activeAutomations: number;
    inviteAcceptanceRate: number;
    wikiPagesCount: number;
    activeGuestSessions: number;
  };
  riskFactors: string[];
  recommendations: string[];
  powerUsers: { id: string; name: string; taskCount: number }[];
}

export class WorkspaceHealthService {
  /**
   * Calculate full health diagnostics for a workspace (V2)
   */
  public static calculateHealth(workspaceId: string): WorkspaceHealthMetric {
    // 1. Members
    const members: any[] = [];
    for (const m of inMemoryDb.workspaceMembers.values()) {
      if (m.workspaceId === workspaceId) members.push(m);
    }
    const totalMembers = Math.max(1, members.length);

    // Active members: logged in within last 14 days (using session data)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    const activeMemberIds = new Set<string>();
    for (const session of inMemoryDb.sessions.values()) {
      if (session.workspaceId === workspaceId && new Date(session.createdAt) > fourteenDaysAgo) {
        activeMemberIds.add(session.userId);
      }
    }
    const activeMembers = Math.max(1, activeMemberIds.size || totalMembers);

    // 2. Projects
    const projects: any[] = [];
    for (const p of inMemoryDb.projects.values()) {
      if (p.workspaceId === workspaceId) projects.push(p);
    }
    const totalProjects = projects.length;
    const completedProjects = projects.filter((p) => p.status === 'completed' || p.progress === 100).length;

    // 3. Tasks & Power Users
    const tasks: any[] = [];
    const userTaskCount: Map<string, number> = new Map();

    for (const t of inMemoryDb.tasks.values()) {
      if (t.workspaceId === workspaceId) {
        tasks.push(t);
        if (t.assignedTo) {
          userTaskCount.set(t.assignedTo, (userTaskCount.get(t.assignedTo) || 0) + 1);
        }
      }
    }
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;

    // 4. Automations
    let activeAutomations = 0;
    for (const a of inMemoryDb.automationRules.values()) {
      if (a.workspaceId === workspaceId && a.isActive !== false) {
        activeAutomations++;
      }
    }

    // 5. V2: Invite acceptance rate
    let invitesSent = 0, invitesAccepted = 0;
    const seenInvites = new Set<string>();
    for (const inv of inMemoryDb.workspaceInvites.values()) {
      if (seenInvites.has(inv.id) || inv.workspaceId !== workspaceId) continue;
      seenInvites.add(inv.id);
      invitesSent++;
      if (inv.acceptedAt) invitesAccepted++;
    }
    const inviteAcceptanceRate = invitesSent > 0 ? Math.round((invitesAccepted / invitesSent) * 100) : 100;

    // 6. V2: Wiki adoption
    let wikiPagesCount = 0;
    for (const page of inMemoryDb.wikiPages.values()) {
      if (page.workspaceId === workspaceId) wikiPagesCount++;
    }

    // 7. V2: Client portal usage
    let activeGuestSessions = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    for (const guest of inMemoryDb.guestUsers.values()) {
      if (guest.workspaceId === workspaceId && guest.lastAccessAt && new Date(guest.lastAccessAt) > thirtyDaysAgo) {
        activeGuestSessions++;
      }
    }

    // --- Scoring Engine V2 (sum = 100) ---

    // Pillar 1: User Activity (0–15)
    const userActivityScore = Math.min(15, Math.round((activeMembers / totalMembers) * 15));

    // Pillar 2: Project Velocity (0–15)
    let projectVelocityScore = 10;
    if (totalProjects > 0) {
      const completionRate = completedProjects / totalProjects;
      projectVelocityScore = Math.min(15, Math.round(completionRate * 8 + 7));
    }

    // Pillar 3: Task Completion Rate (0–15)
    let taskCompletionScore = 10;
    if (totalTasks > 0) {
      taskCompletionScore = Math.min(15, Math.round((completedTasks / totalTasks) * 15));
    }

    // Pillar 4: Automation Adoption (0–10)
    const automationAdoptionScore = activeAutomations > 0 ? Math.min(10, activeAutomations * 3) : 3;

    // Pillar 5: Search Adoption (0–10)
    const searchAdoptionScore = 8; // Default healthy

    // Pillar 6: Collaboration (0–10)
    const collaborationScore = totalMembers > 1 ? Math.min(10, totalMembers * 2) : 3;

    // Pillar 7: Login Frequency (0–10) — active sessions ratio
    const loginFrequencyScore = Math.min(10, Math.round((activeMembers / totalMembers) * 10));

    // Pillar 8: Invite Acceptance Rate (0–5)
    const inviteAcceptanceScore = Math.min(5, Math.round((inviteAcceptanceRate / 100) * 5));

    // Pillar 9: Wiki Adoption (0–5)
    const wikiAdoptionScore = wikiPagesCount > 0 ? Math.min(5, wikiPagesCount) : 0;

    // Pillar 10: Client Portal Usage (0–5)
    const clientPortalScore = activeGuestSessions > 0 ? Math.min(5, activeGuestSessions * 2) : 0;

    // Aggregate Score
    const totalScore = Math.min(
      100,
      userActivityScore +
      projectVelocityScore +
      taskCompletionScore +
      automationAdoptionScore +
      searchAdoptionScore +
      collaborationScore +
      loginFrequencyScore +
      inviteAcceptanceScore +
      wikiAdoptionScore +
      clientPortalScore
    );

    // Grade & Status Mapping (simplified to 3-tier as requested)
    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    let status: 'Healthy' | 'At Risk' | 'Critical' = 'Healthy';

    if (totalScore >= 85) {
      grade = 'A+'; status = 'Healthy';
    } else if (totalScore >= 70) {
      grade = 'A'; status = 'Healthy';
    } else if (totalScore >= 55) {
      grade = 'B'; status = 'Healthy';
    } else if (totalScore >= 40) {
      grade = 'C'; status = 'At Risk';
    } else if (totalScore >= 25) {
      grade = 'D'; status = 'Critical';
    } else {
      grade = 'F'; status = 'Critical';
    }

    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (totalProjects === 0) {
      riskFactors.push('Zero active projects created in workspace.');
      recommendations.push('Create first project roadmap to structure deliverables.');
    }
    if (totalTasks > 0 && completedTasks === 0) {
      riskFactors.push('Low task velocity: 0% completion rate.');
      recommendations.push('Review backlog items with team leads to unblock blockers.');
    }
    if (activeAutomations === 0) {
      recommendations.push('Adopt workflow automations to reduce manual overhead.');
    }
    if (totalMembers === 1) {
      recommendations.push('Invite colleagues to collaborate in real-time.');
    }
    if (wikiPagesCount === 0) {
      riskFactors.push('No wiki pages created — knowledge not being captured.');
      recommendations.push('Create a team wiki page to document processes and decisions.');
    }
    if (invitesSent > 0 && inviteAcceptanceRate < 50) {
      riskFactors.push(`Low invite acceptance rate: ${inviteAcceptanceRate}%. Pending members may need follow-up.`);
      recommendations.push('Resend pending invitations or schedule onboarding calls.');
    }
    if (loginFrequencyScore < 5) {
      riskFactors.push('Low login frequency detected — team may not be actively using the platform.');
      recommendations.push('Send a daily digest or re-engage team with a project kickoff.');
    }

    // Identify Power Users
    const powerUsers: { id: string; name: string; taskCount: number }[] = [];
    for (const [userId, count] of userTaskCount.entries()) {
      const user = inMemoryDb.users.get(userId);
      if (user) {
        powerUsers.push({ id: userId, name: user.name, taskCount: count });
      }
    }
    powerUsers.sort((a, b) => b.taskCount - a.taskCount);

    return {
      score: totalScore,
      grade,
      status,
      breakdown: {
        userActivityScore,
        projectVelocityScore,
        taskCompletionScore,
        automationAdoptionScore,
        searchAdoptionScore,
        collaborationScore,
        loginFrequencyScore,
        inviteAcceptanceScore,
        wikiAdoptionScore,
        clientPortalScore,
      },
      metrics: {
        totalMembers,
        activeMembers,
        completedProjects,
        totalProjects,
        completedTasks,
        totalTasks,
        activeAutomations,
        inviteAcceptanceRate,
        wikiPagesCount,
        activeGuestSessions,
      },
      riskFactors,
      recommendations,
      powerUsers: powerUsers.slice(0, 5),
    };
  }
}
