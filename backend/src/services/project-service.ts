import { UserRole } from '../types';
import { WorkspaceBoundaryValidator } from '../lib/validation';
import { can, normalizeRole } from '../lib/permissions';
import { ProjectRepository, CreateProjectParams, UpdateProjectParams } from '../repositories/project-repository';
import { TeamRepository } from '../repositories/team-repository';
import { EventService } from './event-service';

export interface CreateProjectInput {
  title: string;
  description?: string;
  status?: string;
  startDate?: string;
  dueDate: string;
  budget?: string;
  memberIds?: string[];
  member_ids?: string[];
  departmentId?: string;
  department_id?: string;
  teamIds?: string[];
  team_ids?: string[];
  tags?: string[];
}

export class ProjectService {
  /**
   * List projects in workspace with role scoping
   */
  static async getProjects(workspaceId: string, userId: string, rawRole: UserRole | string): Promise<any[]> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'projects:read', undefined, { userId, workspaceId })) {
      const error: any = new Error('Interns do not have access to organization project roadmaps.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    console.log(`[ProjectService.getProjects] fetching projects for workspace: ${workspaceId}, role: ${role}, user: ${userId}`);
    const projects = await ProjectRepository.listProjects(workspaceId, userId, role);
    console.log(`[ProjectService.getProjects] received ${projects.length} projects from repository`);

    return projects.map((p) => this.formatProject(p));
  }

  static formatProject(p: any) {
    return {
      id: p.id,
      title: p.title,
      description: p.description || '',
      workspace_id: p.workspaceId,
      department_id: p.departmentId || p.department_id || null,
      departmentId: p.departmentId || p.department_id || null,
      created_by: p.createdBy,
      status: p.status,
      progress: p.progress || 0,
      start_date: p.startDate ? new Date(p.startDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      due_date: p.dueDate ? new Date(p.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      budget: p.budget || undefined,
      started_at: p.startedAt ? new Date(p.startedAt).toISOString() : undefined,
      submitted_for_review_at: p.submittedForReviewAt ? new Date(p.submittedForReviewAt).toISOString() : undefined,
      submitted_by: p.submittedBy || undefined,
      completed_at: p.completedAt ? new Date(p.completedAt).toISOString() : undefined,
      approved_by: p.approvedBy || undefined,
      review_feedback: p.reviewFeedback || undefined,
      member_ids: p.memberIds && p.memberIds.length > 0 ? p.memberIds : [p.createdBy],
      tags: p.tags || ['Enterprise', 'Core'],
      created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Helper to check if a user is department head or team lead of any of the project's assigned departments/teams
   */
  private static async isProjectTeamLead(userId: string, projectTeamIds?: string[], departmentId?: string): Promise<boolean> {
    if (departmentId) {
      try {
        const { PeopleRepository } = await import('../repositories/people-repository.js');
        const dept = await PeopleRepository.getDepartmentById('', departmentId);
        if (dept?.headId === userId) return true;
      } catch {}
    }

    if (projectTeamIds && projectTeamIds.length > 0) {
      try {
        const { PeopleRepository } = await import('../repositories/people-repository.js');
        const departments = await PeopleRepository.listDepartments('');
        const userHeadDepts = departments.filter((d: any) => d.headId === userId).map((d: any) => d.id);
        if (projectTeamIds.some((tId) => userHeadDepts.includes(tId))) {
          return true;
        }
      } catch {}

      const ledTeams = await TeamRepository.getUserLedTeams(userId);
      if (projectTeamIds.some((tId) => ledTeams.includes(tId))) {
        return true;
      }
    }

    // Fallback: check if user is a Team Lead or Department Head in the organization
    try {
      const ledTeams = await TeamRepository.getUserLedTeams(userId);
      if (ledTeams.length > 0) return true;
    } catch {}

    return false;
  }

  /**
   * Helper to resolve both People OS department assignment and legacy team IDs for a user
   */
  private static async getUserDepartmentsAndTeams(workspaceId: string, userId: string): Promise<string[]> {
    const ids: string[] = [];
    try {
      const { PeopleRepository } = await import('../repositories/people-repository.js');
      const profile = await PeopleRepository.getProfileByUserId(workspaceId, userId);
      if (profile?.departmentId) {
        ids.push(profile.departmentId);
      }
    } catch {}
    const legacyTeams = await TeamRepository.getUserTeams(userId);
    legacyTeams.forEach((tId) => {
      if (!ids.includes(tId)) ids.push(tId);
    });
    return ids;
  }

  /**
   * Create a new project with RBAC and validation
   */
  static async createProject(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    input: CreateProjectInput
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'projects:create', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from creating projects.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (!input.title || !input.title.trim()) {
      const error: any = new Error('Title is required');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    let parsedDue: Date;
    if (input.dueDate) {
      parsedDue = new Date(input.dueDate);
      if (isNaN(parsedDue.getTime())) {
        const error: any = new Error('Due date must be a valid ISO date');
        error.code = 'VALIDATION_ERROR';
        error.status = 400;
        throw error;
      }
    } else {
      parsedDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const memberIds = input.memberIds || input.member_ids;
    const departmentId = input.departmentId || input.department_id;
    console.log('[ProjectService.createProject]', { departmentId, memberIds });

    if (departmentId) {
      const { departmentRepository } = await import('../repositories/people-repository.js');
      if (!(await departmentRepository.exists(departmentId, workspaceId))) {
        const error: any = new Error('Selected department does not exist');
        error.code = 'BAD_REQUEST';
        error.status = 400;
        throw error;
      }
    }

    // Validate cross-workspace boundaries for memberIds
    if (memberIds && memberIds.length > 0) {
      WorkspaceBoundaryValidator.validateWorkspaceMembers(workspaceId, memberIds);
    }

    const created = await ProjectRepository.createProject({
      title: input.title.trim(),
      description: input.description?.trim() || '',
      workspaceId,
      departmentId,
      createdBy: userId,
      status: input.status || 'planning',
      progress: 0,
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
      dueDate: parsedDue,
      budget: input.budget || '$0',
      tags: input.tags || ['General'],
      memberIds: memberIds && memberIds.length > 0 ? memberIds : [userId],
    });

    // Emit event: Project Created
    await EventService.emitProjectCreated(
      { workspaceId, actorId: userId },
      {
        id: created.id,
        title: created.title,
        memberIds: created.memberIds || [userId],
        budget: created.budget,
      }
    );

    // Dispatch Notifications: Department Lead & Assigned Members
    try {
      const { NotificationService } = await import('./notification-service.js');
      const { inMemoryDb } = await import('../../packages/database/index.js');
      const creator = inMemoryDb.users.get(userId);
      const notifiedRecipients = new Set<string>();

      // 1. Notify assigned department lead
      if (departmentId) {
        let deptHeadId: string | undefined;
        try {
          const { PeopleRepository } = await import('../repositories/people-repository.js');
          const depts = await PeopleRepository.listDepartments(workspaceId);
          const dept = depts.find((d: any) => d.id === departmentId);
          deptHeadId = dept?.headId;
        } catch {
          const { inMemoryDb } = await import('../../packages/database/index.js');
          const dept = inMemoryDb.departments.get(departmentId);
          deptHeadId = dept?.headId;
        }

        if (deptHeadId && deptHeadId !== userId) {
          notifiedRecipients.add(deptHeadId);
          await NotificationService.createNotification({
            workspaceId,
            recipientId: deptHeadId,
            actorId: userId,
            type: 'initiative_created',
            title: 'New Department Initiative Created',
            message: `${creator?.name || 'A team member'} launched initiative "${created.title}" in your department.`,
            entityType: 'project',
            entityId: created.id,
            link: `/projects/${created.id}`,
          }).catch(() => null);
        }
      }

      // 2. Notify assigned members
      const finalMemberIds = created.memberIds || [userId];
      for (const mId of finalMemberIds) {
        if (mId !== userId && !notifiedRecipients.has(mId)) {
          notifiedRecipients.add(mId);
          await NotificationService.createNotification({
            workspaceId,
            recipientId: mId,
            actorId: userId,
            type: 'initiative_assigned',
            title: 'Assigned to New Initiative',
            message: `${creator?.name || 'A team member'} assigned you to initiative "${created.title}".`,
            entityType: 'project',
            entityId: created.id,
            link: `/projects/${created.id}`,
          }).catch(() => null);
        }
      }
    } catch {}

    const projectPayload = this.formatProject(created);

    return {
      project: projectPayload,
      ...projectPayload,
    };
  }

  /**
   * Get a single project by ID with membership and isolation checks
   */
  static async getProjectById(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'projects:read', undefined, { userId, workspaceId })) {
      const error: any = new Error('Interns do not have access to organization project roadmaps.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: project belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    const projectPayload = this.formatProject(existing);
    return {
      project: projectPayload,
      ...projectPayload,
    };
  }

  /**
   * Start Work on a project (Planning -> In Progress)
   * Allowed: Admin or Team Lead (or project creator)
   */
  static async startProject(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (role === 'intern') {
      const error: any = new Error('Interns cannot start projects.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.status !== 'planning') {
      const error: any = new Error(`Cannot start project with status "${existing.status}". Must be in "planning" state.`);
      error.code = 'INVALID_TRANSITION';
      error.status = 400;
      throw error;
    }

    const isLead = await this.isProjectTeamLead(userId, existing.teamIds);
    const isOwner = existing.createdBy === userId;
    const currentMemberIds = existing.memberIds || [existing.createdBy];
    const isMember = currentMemberIds.includes(userId);
    const userTeams = await this.getUserDepartmentsAndTeams(workspaceId, userId);
    const isTeamMember = existing.teamIds.some((tId) => userTeams.includes(tId));
    const projDeptId = existing.departmentId || (existing as any).department_id;
    const isDeptMember = projDeptId ? userTeams.includes(projDeptId) : false;

    if (role === 'employee' && !isLead && !isOwner && !isMember && !isTeamMember && !isDeptMember) {
      const error: any = new Error('You can only start work on initiatives assigned to you or your department.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const updated = await ProjectRepository.startProject(workspaceId, projectId, userId);
    if (!updated) {
      const error: any = new Error('Failed to start project.');
      error.code = 'INTERNAL_SERVER_ERROR';
      error.status = 500;
      throw error;
    }

    // Dispatch initiative_started notification to assigned members
    try {
      const { NotificationService } = await import('./notification-service.js');
      const members = updated.memberIds || [updated.createdBy];
      for (const mId of members) {
        if (mId !== userId) {
          await NotificationService.createNotification({
            workspaceId,
            recipientId: mId,
            actorId: userId,
            type: 'initiative_started',
            title: 'Initiative Started',
            message: `Work has started on initiative "${updated.title}".`,
            entityType: 'project',
            entityId: updated.id,
            link: `/projects/${updated.id}`,
          }).catch(() => null);
        }
      }
    } catch {}

    const projectPayload = this.formatProject(updated);
    return { project: projectPayload, ...projectPayload };
  }

  /**
   * Update Progress (with note and historical log in project_updates)
   * Allowed: Admin, Team Lead, or Assigned Member
   */
  static async updateProgress(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string,
    progress: number,
    note?: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (role === 'intern') {
      const error: any = new Error('Interns cannot update project progress.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (typeof progress !== 'number' || isNaN(progress) || progress < 0 || progress > 100) {
      const error: any = new Error('Progress must be a number between 0 and 100.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const currentMemberIds = existing.memberIds || [existing.createdBy];
    const isOwner = existing.createdBy === userId;
    const isMember = currentMemberIds.includes(userId);
    const userTeams = await TeamRepository.getUserTeams(userId);
    const isTeamMember = existing.teamIds.some((tId) => userTeams.includes(tId));

    if (role === 'employee' && !isOwner && !isMember && !isTeamMember) {
      const error: any = new Error('You can only update progress for projects assigned to you or your teams.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const updateRecord = await ProjectRepository.addProjectUpdate(workspaceId, projectId, userId, progress, note);
    const updated = await ProjectRepository.getProjectById(workspaceId, projectId);

    const projectPayload = this.formatProject(updated!);
    return {
      update: updateRecord,
      project: projectPayload,
      ...projectPayload,
    };
  }

  /**
   * Submit Project for Review (In Progress -> Review)
   * Allowed: Admin, Team Lead, or Assigned Member
   */
  static async submitReview(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (role === 'intern') {
      const error: any = new Error('Interns cannot submit project reviews.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.status !== 'in_progress') {
      const error: any = new Error(`Cannot submit project for review from status "${existing.status}". Must be "in_progress".`);
      error.code = 'INVALID_TRANSITION';
      error.status = 400;
      throw error;
    }

    const currentMemberIds = existing.memberIds || [existing.createdBy];
    const isOwner = existing.createdBy === userId;
    const isMember = currentMemberIds.includes(userId);
    const userTeams = await TeamRepository.getUserTeams(userId);
    const isTeamMember = existing.teamIds.some((tId) => userTeams.includes(tId));

    if (role === 'employee' && !isOwner && !isMember && !isTeamMember) {
      const error: any = new Error('You can only submit assigned projects for review.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const updated = await ProjectRepository.submitForReview(workspaceId, projectId, userId);
    if (!updated) {
      const error: any = new Error('Failed to submit project for review.');
      error.code = 'INTERNAL_SERVER_ERROR';
      error.status = 500;
      throw error;
    }

    // Dispatch initiative_review_requested notification to reviewer / admins / creator
    try {
      const { NotificationService } = await import('./notification-service.js');
      const { inMemoryDb } = await import('../../packages/database/index.js');
      const admins = Array.from(inMemoryDb.workspaceMembers.values()).filter(
        (wm) => wm.workspaceId === workspaceId && wm.role === 'admin' && wm.userId !== userId
      );
      const recipientIds = new Set<string>(admins.map((a) => a.userId));
      if (updated.createdBy !== userId) recipientIds.add(updated.createdBy);

      for (const recId of recipientIds) {
        await NotificationService.createNotification({
          workspaceId,
          recipientId: recId,
          actorId: userId,
          type: 'initiative_review_requested',
          title: 'Initiative Review Requested',
          message: `Initiative "${updated.title}" was submitted for review.`,
          entityType: 'project',
          entityId: updated.id,
          link: `/projects/${updated.id}`,
        }).catch(() => null);
      }
    } catch {}

    const projectPayload = this.formatProject(updated);
    return { project: projectPayload, ...projectPayload };
  }

  /**
   * Approve Project Review and complete initiative (Review -> Completed)
   * Allowed: Admin or Team Lead only
   */
  static async approveReview(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (role === 'intern') {
      const error: any = new Error('Interns cannot approve reviews.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.status !== 'review') {
      const error: any = new Error(`Cannot approve project with status "${existing.status}". Must be in "review" state.`);
      error.code = 'INVALID_TRANSITION';
      error.status = 400;
      throw error;
    }

    const isLead = await this.isProjectTeamLead(userId, existing.teamIds);
    if (role === 'employee' && !isLead) {
      const error: any = new Error('Only Admins or Team Leads can approve project reviews.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const updated = await ProjectRepository.approveProject(workspaceId, projectId, userId);
    if (!updated) {
      const error: any = new Error('Failed to approve project.');
      error.code = 'INTERNAL_SERVER_ERROR';
      error.status = 500;
      throw error;
    }

    // Dispatch initiative_approved notification to assigned members & creator
    try {
      const { NotificationService } = await import('./notification-service.js');
      const recipients = new Set<string>(updated.memberIds || [updated.createdBy]);
      recipients.add(updated.createdBy);

      for (const recId of recipients) {
        if (recId !== userId) {
          await NotificationService.createNotification({
            workspaceId,
            recipientId: recId,
            actorId: userId,
            type: 'initiative_approved',
            title: 'Initiative Approved',
            message: `Initiative "${updated.title}" has been approved and completed.`,
            entityType: 'project',
            entityId: updated.id,
            link: `/projects/${updated.id}`,
          }).catch(() => null);
        }
      }
    } catch {}

    const projectPayload = this.formatProject(updated);
    return { project: projectPayload, ...projectPayload };
  }

  /**
   * Request Changes on project (Review -> In Progress)
   * Allowed: Admin or Team Lead only
   */
  static async requestChanges(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string,
    feedback: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (role === 'intern') {
      const error: any = new Error('Interns cannot request changes.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (!feedback || !feedback.trim()) {
      const error: any = new Error('Review feedback explanation is required when requesting changes.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.status !== 'review') {
      const error: any = new Error(`Cannot request changes on project with status "${existing.status}". Must be in "review" state.`);
      error.code = 'INVALID_TRANSITION';
      error.status = 400;
      throw error;
    }

    const isLead = await this.isProjectTeamLead(userId, existing.teamIds);
    if (role === 'employee' && !isLead) {
      const error: any = new Error('Only Admins or Team Leads can request changes on project reviews.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const updated = await ProjectRepository.requestChanges(workspaceId, projectId, userId, feedback.trim());
    if (!updated) {
      const error: any = new Error('Failed to request changes on project.');
      error.code = 'INTERNAL_SERVER_ERROR';
      error.status = 500;
      throw error;
    }

    // Dispatch initiative_rejected notification to creator & assigned members
    try {
      const { NotificationService } = await import('./notification-service.js');
      const recipients = new Set<string>(updated.memberIds || [updated.createdBy]);
      recipients.add(updated.createdBy);

      for (const recId of recipients) {
        if (recId !== userId) {
          await NotificationService.createNotification({
            workspaceId,
            recipientId: recId,
            actorId: userId,
            type: 'initiative_rejected',
            title: 'Initiative Changes Requested',
            message: `Changes requested on initiative "${updated.title}": ${feedback.trim()}`,
            entityType: 'project',
            entityId: updated.id,
            link: `/projects/${updated.id}`,
          }).catch(() => null);
        }
      }
    } catch {}

    const projectPayload = this.formatProject(updated);
    return { project: projectPayload, ...projectPayload };
  }

  /**
   * Get all progress updates and timeline events for a project
   */
  static async getProjectUpdates(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string
  ): Promise<any[]> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'projects:read', undefined, { userId, workspaceId })) {
      const error: any = new Error('Interns cannot access project timeline details.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    return ProjectRepository.getProjectUpdates(projectId);
  }

  /**
   * Update an existing project
   */
  static async updateProject(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string,
    updates: Partial<CreateProjectInput & { progress?: number; status?: string }>
  ): Promise<any> {
    const role = normalizeRole(rawRole);

    if (!can(role, 'projects:update')) {
      const error: any = new Error('Insufficient permissions');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: project belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    const currentMemberIds = existing.memberIds || [existing.createdBy];
    const isOwner = existing.createdBy === userId;
    const isMember = currentMemberIds.includes(userId);

    let isTeamMember = false;
    if (existing.teamIds && existing.teamIds.length > 0) {
      const userTeams = await this.getUserDepartmentsAndTeams(workspaceId, userId);
      isTeamMember = existing.teamIds.some((tId) => userTeams.includes(tId));
    }

    let isDeptMember = false;
    const projDeptId = existing.departmentId || (existing as any).department_id;
    if (projDeptId) {
      const userDepts = await this.getUserDepartmentsAndTeams(workspaceId, userId);
      isDeptMember = userDepts.includes(projDeptId);
    }

    const isLead = await this.isProjectTeamLead(userId, existing.teamIds);

    if (role === 'employee' && !isOwner && !isMember && !isTeamMember && !isDeptMember && !isLead) {
      const error: any = new Error('You can only update projects assigned to you or your department.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    // Strict status transition state machine validation
    if (updates.status !== undefined && updates.status !== existing.status) {
      const from = existing.status;
      const to = updates.status;

      // Allowable paths:
      // 1. planning -> in_progress (Admin / Lead / Owner)
      // 2. in_progress -> review (Admin / Lead / Assigned Employee)
      // 3. review -> completed (Admin / Lead only)
      // 4. review -> in_progress (Admin / Lead only)
      // 5. in_progress -> planning (Admin only)
      if (from === 'planning' && to === 'in_progress') {
        if (role === 'employee' && !isLead && !isOwner && !isMember && !isTeamMember && !isDeptMember) {
          const error: any = new Error('You can only start work on projects assigned to you or your department.');
          error.code = 'FORBIDDEN';
          error.status = 403;
          throw error;
        }
      } else if (from === 'in_progress' && to === 'review') {
        // Allowed for all assigned
      } else if (from === 'review' && to === 'completed') {
        if (role === 'employee' && !isLead) {
          const error: any = new Error('Only Admins or Team Leads can approve reviews and complete projects.');
          error.code = 'FORBIDDEN';
          error.status = 403;
          throw error;
        }
      } else if (from === 'review' && to === 'in_progress') {
        if (role === 'employee' && !isLead) {
          const error: any = new Error('Only Admins or Team Leads can request changes and move projects back to In Progress.');
          error.code = 'FORBIDDEN';
          error.status = 403;
          throw error;
        }
      } else if (role === 'admin') {
        // Admin has superuser override if needed
      } else {
        const error: any = new Error(`Illegal status transition from "${from}" to "${to}". Must follow Planning -> In Progress -> Review -> Completed.`);
        error.code = 'INVALID_TRANSITION';
        error.status = 400;
        throw error;
      }
    }

    if (updates.title !== undefined && (!updates.title || !updates.title.trim())) {
      const error: any = new Error('Title cannot be empty');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    let parsedDueDate: Date | undefined;
    if (updates.dueDate !== undefined) {
      parsedDueDate = new Date(updates.dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        const error: any = new Error('Due date must be a valid ISO date');
        error.code = 'VALIDATION_ERROR';
        error.status = 400;
        throw error;
      }
    }

    const memberIds = updates.memberIds || updates.member_ids;
    const teamIds = updates.teamIds || updates.team_ids;

    if (memberIds && memberIds.length > 0) {
      WorkspaceBoundaryValidator.validateWorkspaceMembers(workspaceId, memberIds);
    }

    const updateParams: UpdateProjectParams = {};
    if (updates.title !== undefined) updateParams.title = updates.title.trim();
    if (updates.description !== undefined) updateParams.description = updates.description.trim();
    if (updates.status !== undefined) updateParams.status = updates.status;
    if (updates.progress !== undefined) updateParams.progress = updates.progress;
    if (updates.budget !== undefined) updateParams.budget = updates.budget;
    if (updates.startDate !== undefined) updateParams.startDate = new Date(updates.startDate);
    if (parsedDueDate !== undefined) updateParams.dueDate = parsedDueDate;
    if (memberIds !== undefined) updateParams.memberIds = memberIds;
    if (teamIds !== undefined) updateParams.teamIds = teamIds;

    // Automatic audit timestamp assignment on status change
    if (updates.status === 'in_progress' && existing.status === 'planning') {
      updateParams.startedAt = new Date();
    } else if (updates.status === 'review' && existing.status === 'in_progress') {
      updateParams.submittedForReviewAt = new Date();
      updateParams.submittedBy = userId;
    } else if (updates.status === 'completed' && existing.status === 'review') {
      updateParams.completedAt = new Date();
      updateParams.approvedBy = userId;
      updateParams.progress = 100;
    }

    const updated = await ProjectRepository.updateProject(workspaceId, projectId, updateParams);
    if (!updated) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Emit event: Project Updated
    await EventService.emitProjectUpdated(
      { workspaceId, actorId: userId },
      {
        id: updated.id,
        title: updated.title,
        oldValues: {
          status: existing.status,
          progress: existing.progress,
          budget: existing.budget,
        },
        newValues: {
          status: updated.status,
          progress: updated.progress,
          budget: updated.budget,
        },
      }
    );

    const projectPayload = this.formatProject(updated);

    return {
      project: projectPayload,
      ...projectPayload,
    };
  }

  /**
   * Delete project with RBAC checks
   */
  static async deleteProject(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string
  ): Promise<boolean> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'projects:delete', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from deleting projects.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: project belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    const currentMemberIds = existing.memberIds || [existing.createdBy];
    const isOwner = existing.createdBy === userId;
    const isMember = currentMemberIds.includes(userId);

    if (role === 'employee' && !isOwner && !isMember) {
      const error: any = new Error('You can only delete your own projects');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    return ProjectRepository.deleteProject(workspaceId, projectId);
  }
}

