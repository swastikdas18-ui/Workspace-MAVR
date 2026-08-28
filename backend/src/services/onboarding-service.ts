/**
 * Phase 21B: User Onboarding Engine Service
 * 
 * Manages 6-step workspace setup wizard, completion progress, and progress bar generation.
 */

import { inMemoryDb } from '../../packages/database/index.js';

export const ONBOARDING_STEPS = [
  { id: 'company_info', label: 'Company Profile & Workspace Info', order: 1 },
  { id: 'invite_team', label: 'Invite Teammates & Colleagues', order: 2 },
  { id: 'create_project', label: 'Create First Project Workspace', order: 3 },
  { id: 'create_task', label: 'Create & Assign First Task', order: 4 },
  { id: 'upload_document', label: 'Upload Documentation Vault Item', order: 5 },
  { id: 'enable_automation', label: 'Enable First Automation Rule', order: 6 },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id'];

export interface OnboardingStatus {
  workspaceId: string;
  completedSteps: string[];
  totalSteps: number;
  completedCount: number;
  progressPercent: number;
  progressBarText: string;
  isComplete: boolean;
  dismissed: boolean;
  nextStep: typeof ONBOARDING_STEPS[number] | null;
  steps: Array<{
    id: string;
    label: string;
    order: number;
    completed: boolean;
  }>;
}

export class OnboardingService {
  /**
   * Helper to format ASCII progress bar string (e.g. "████████░░ 80%")
   */
  public static formatProgressBar(percent: number): string {
    const totalBlocks = 10;
    const filledBlocks = Math.round((percent / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    return `${bar} ${percent}%`;
  }

  /**
   * Get onboarding progress for a given workspace.
   */
  public static async getStatus(workspaceId: string): Promise<OnboardingStatus> {
    let state = inMemoryDb.onboardingState.get(workspaceId);
    if (!state) {
      // Auto-detect organically completed steps from workspace contents
      const completed: string[] = ['company_info'];
      const hasMembers = Array.from(inMemoryDb.workspaceMembers.values()).some((m) => m.workspaceId === workspaceId);
      const hasProjects = Array.from(inMemoryDb.projects.values()).some((p) => p.workspaceId === workspaceId);
      const hasTasks = Array.from(inMemoryDb.tasks.values()).some((t) => t.workspaceId === workspaceId);
      const hasDocs = Array.from(inMemoryDb.documents.values()).some((d) => d.workspaceId === workspaceId);
      const hasAutomations = Array.from(inMemoryDb.automationRules.values()).some((r) => r.workspaceId === workspaceId);

      if (hasMembers) completed.push('invite_team');
      if (hasProjects) completed.push('create_project');
      if (hasTasks) completed.push('create_task');
      if (hasDocs) completed.push('upload_document');
      if (hasAutomations) completed.push('enable_automation');

      state = {
        workspaceId,
        completedSteps: completed,
        dismissed: false,
        updatedAt: new Date(),
      };
      inMemoryDb.onboardingState.set(workspaceId, state);
    }

    const totalSteps = ONBOARDING_STEPS.length;
    const completedCount = state.completedSteps.length;
    const progressPercent = Math.min(100, Math.round((completedCount / totalSteps) * 100));
    const progressBarText = this.formatProgressBar(progressPercent);
    const isComplete = completedCount === totalSteps;

    const nextStep = ONBOARDING_STEPS.find((s) => !state.completedSteps.includes(s.id)) || null;

    const steps = ONBOARDING_STEPS.map((s) => ({
      ...s,
      completed: state.completedSteps.includes(s.id),
    }));

    return {
      workspaceId,
      completedSteps: state.completedSteps,
      totalSteps,
      completedCount,
      progressPercent,
      progressBarText,
      isComplete,
      dismissed: state.dismissed,
      nextStep,
      steps,
    };
  }

  /**
   * Mark a specific step as complete.
   */
  public static async completeStep(workspaceId: string, stepId: string): Promise<OnboardingStatus> {
    let state = inMemoryDb.onboardingState.get(workspaceId);
    if (!state) {
      state = {
        workspaceId,
        completedSteps: [],
        dismissed: false,
        updatedAt: new Date(),
      };
    }

    if (!state.completedSteps.includes(stepId)) {
      state.completedSteps.push(stepId);
      state.updatedAt = new Date();
      inMemoryDb.onboardingState.set(workspaceId, state);
    }

    return this.getStatus(workspaceId);
  }

  /**
   * Dismiss the onboarding widget.
   */
  public static async setDismissed(workspaceId: string, dismissed: boolean): Promise<OnboardingStatus> {
    let state = inMemoryDb.onboardingState.get(workspaceId);
    if (!state) {
      state = {
        workspaceId,
        completedSteps: ['company_info'],
        dismissed,
        updatedAt: new Date(),
      };
    } else {
      state.dismissed = dismissed;
      state.updatedAt = new Date();
    }
    inMemoryDb.onboardingState.set(workspaceId, state);
    return this.getStatus(workspaceId);
  }
}
