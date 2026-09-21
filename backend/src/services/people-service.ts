import { PeopleRepository, EmployeeProfileEntity, DepartmentEntity, LeaveRequestEntity, GoalEntity, PerformanceReviewEntity } from '../repositories/people-repository';
import { NotificationService } from './notification-service';
import { EventService } from './event-service';
import { AuditRepository } from '../repositories/audit-repository';
import { inMemoryDb } from '../../packages/database/index.js';

export class PeopleService {
  // 1. Directory & Profiles
  static async listDirectory(workspaceId: string, filters?: { departmentId?: string; search?: string; managerId?: string; status?: string; employmentType?: string }) {
    return PeopleRepository.listProfiles(workspaceId, filters);
  }

  static async getProfile(workspaceId: string, userId: string) {
    return PeopleRepository.getProfileByUserId(workspaceId, userId);
  }

  static async updateProfile(
    workspaceId: string,
    targetUserId: string,
    actorId: string,
    actorRole: string,
    updates: any
  ) {
    // Permission check: User can update own profile (bio, skills, phone), Admin can update all fields
    const isSelf = actorId === targetUserId;
    const isAdmin = actorRole === 'admin';

    if (!isSelf && !isAdmin) {
      const error: any = new Error('Forbidden: You can only update your own profile.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const payload: any = { ...updates };
    if (!isAdmin) {
      // Employees cannot change their own designation, manager, or department without admin
      delete payload.designation;
      delete payload.managerId;
      delete payload.departmentId;
      delete payload.status;
    }

    const profile = await PeopleRepository.upsertProfile(workspaceId, targetUserId, payload);

    await AuditRepository.log({
      workspaceId,
      userId: actorId,
      action: 'UPDATE_EMPLOYEE_PROFILE',
      resource: 'employee_profile',
      resourceId: profile.id,
      newValues: payload,
    });

    return profile;
  }

  // 2. Departments
  static async listDepartments(workspaceId: string) {
    return PeopleRepository.listDepartments(workspaceId);
  }

  static async createDepartment(workspaceId: string, actorId: string, data: { name: string; description?: string; headId?: string; color?: string }) {
    const dept = await PeopleRepository.createDepartment(workspaceId, data);
    if (data.headId) {
      try {
        await PeopleRepository.transferDepartment(workspaceId, data.headId, dept.id);
      } catch {
        // Handled
      }
    }

    // Mirror to teams repository with identical ID so Projects and Teams APIs refer to the same entity
    try {
      const { TeamRepository } = await import('../repositories/team-repository.js');
      await TeamRepository.createTeam({
        id: dept.id,
        workspaceId,
        name: dept.name,
        description: dept.description || '',
        leadId: dept.headId || actorId,
        color: dept.color || '#7C3AED',
        memberIds: dept.headId ? [dept.headId] : [actorId],
      });
    } catch (e) {
      console.warn('[PeopleService] Department to team mirror notice:', e);
    }

    await AuditRepository.log({
      workspaceId,
      userId: actorId,
      action: 'CREATE_DEPARTMENT',
      resource: 'department',
      resourceId: dept.id,
      newValues: data,
    });
    return dept;
  }

  static async updateDepartment(workspaceId: string, actorId: string, departmentId: string, data: Partial<{ name: string; description: string; headId: string | null; color: string }>) {
    const dept = await PeopleRepository.updateDepartment(workspaceId, departmentId, data);
    if (data.headId) {
      try {
        await PeopleRepository.transferDepartment(workspaceId, data.headId, departmentId);
      } catch {
        // Handled
      }
    }
    await AuditRepository.log({
      workspaceId,
      userId: actorId,
      action: 'UPDATE_DEPARTMENT',
      resource: 'department',
      resourceId: departmentId,
      newValues: data,
    });
    return dept;
  }

  static async deleteDepartment(workspaceId: string, actorId: string, departmentId: string) {
    const res = await PeopleRepository.deleteDepartment(workspaceId, departmentId);
    await AuditRepository.log({
      workspaceId,
      userId: actorId,
      action: 'DELETE_DEPARTMENT',
      resource: 'department',
      resourceId: departmentId,
      newValues: {},
    });
    return res;
  }

  static async getDepartmentMembers(workspaceId: string, departmentId: string) {
    return PeopleRepository.getDepartmentMembers(workspaceId, departmentId);
  }

  static async addDepartmentMember(workspaceId: string, actorId: string, departmentId: string, userId: string) {
    const profile = await PeopleRepository.addDepartmentMember(workspaceId, departmentId, userId);
    await AuditRepository.log({
      workspaceId,
      userId: actorId,
      action: 'DEPARTMENT_ADD_MEMBER',
      resource: 'department',
      resourceId: departmentId,
      newValues: { departmentId, userId },
    });
    return profile;
  }

  static async removeDepartmentMember(workspaceId: string, actorId: string, departmentId: string, userId: string) {
    const profile = await PeopleRepository.removeDepartmentMember(workspaceId, departmentId, userId);
    await AuditRepository.log({
      workspaceId,
      userId: actorId,
      action: 'DEPARTMENT_REMOVE_MEMBER',
      resource: 'department',
      resourceId: departmentId,
      newValues: { departmentId, userId },
    });
    return profile;
  }

  static async setDepartmentLead(workspaceId: string, actorId: string, departmentId: string, leadId: string | null) {
    const dept = await PeopleRepository.setDepartmentLead(workspaceId, departmentId, leadId);
    await AuditRepository.log({
      workspaceId,
      userId: actorId,
      action: 'DEPARTMENT_SET_LEAD',
      resource: 'department',
      resourceId: departmentId,
      newValues: { departmentId, leadId },
    });
    return dept;
  }

  static async moveDepartmentMember(workspaceId: string, actorId: string, fromDepartmentId: string, toDepartmentId: string, userId: string) {
    const profile = await PeopleRepository.moveDepartmentMember(workspaceId, fromDepartmentId, toDepartmentId, userId);
    await AuditRepository.log({
      workspaceId,
      userId: actorId,
      action: 'DEPARTMENT_MOVE_MEMBER',
      resource: 'department',
      resourceId: toDepartmentId,
      newValues: { fromDepartmentId, toDepartmentId, userId },
    });
    return profile;
  }

  // 3. Org Chart
  static async getOrgChart(workspaceId: string) {
    return PeopleRepository.getOrgChart(workspaceId);
  }

  static async reassignManager(workspaceId: string, actorId: string, userId: string, managerId: string | null) {
    const profile = await PeopleRepository.reassignManager(workspaceId, userId, managerId);
    await AuditRepository.log({
      workspaceId,
      userId: actorId,
      action: 'REASSIGN_MANAGER',
      resource: 'employee_profile',
      resourceId: profile.id,
      newValues: { userId, managerId },
    });
    return profile;
  }

  static async transferDepartment(workspaceId: string, actorId: string, userId: string, departmentId: string | null) {
    const profile = await PeopleRepository.transferDepartment(workspaceId, userId, departmentId);
    await AuditRepository.log({
      workspaceId,
      userId: actorId,
      action: 'TRANSFER_DEPARTMENT',
      resource: 'employee_profile',
      resourceId: profile.id,
      newValues: { userId, departmentId },
    });
    return profile;
  }

  // 4. Leave Management
  static async requestLeave(
    workspaceId: string,
    userId: string,
    data: { leaveType: string; startDate: Date; endDate: Date; reason: string; daysCount?: number }
  ) {
    const leave = await PeopleRepository.createLeaveRequest(workspaceId, userId, data);

    // Notify Workspace Admin(s) and/or Manager
    const applicant = inMemoryDb.users.get(userId);
    const admins = Array.from(inMemoryDb.workspaceMembers.values()).filter(
      (wm) => wm.workspaceId === workspaceId && wm.role === 'admin' && wm.userId !== userId
    );
    for (const admin of admins) {
      await NotificationService.createNotification({
        workspaceId,
        recipientId: admin.userId,
        actorId: userId,
        type: 'leave_submitted',
        title: 'New Leave Request Submitted',
        message: `${applicant?.name || 'An employee'} submitted a ${leave.leaveType} leave request.`,
        entityType: 'leave_request',
        entityId: leave.id,
        link: '/people',
      }).catch(() => null);
    }

    return leave;
  }

  static async listLeaves(workspaceId: string, options?: { userId?: string; status?: string }) {
    return PeopleRepository.listLeaveRequests(workspaceId, options);
  }

  static async reviewLeave(
    workspaceId: string,
    leaveId: string,
    reviewerId: string,
    reviewerRole: string,
    decision: 'approved' | 'rejected',
    reviewNotes?: string
  ) {
    if (reviewerRole !== 'admin' && reviewerRole !== 'lead') {
      const error: any = new Error('Forbidden: Only managers and administrators can review leaves.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const leave = await PeopleRepository.reviewLeaveRequest(workspaceId, leaveId, reviewerId, decision, reviewNotes);
    if (!leave) {
      const error: any = new Error('Leave request not found.');
      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Notify Employee
    const reviewer = inMemoryDb.users.get(reviewerId);
    const notifType = decision === 'approved' ? 'leave_approved' : 'leave_rejected';
    const title = decision === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected';
    const message = `Your ${leave.leaveType} leave request was ${decision} by ${reviewer?.name || 'Admin'}.`;

    await NotificationService.createNotification({
      workspaceId,
      recipientId: leave.userId,
      actorId: reviewerId,
      type: notifType,
      title,
      message,
      entityType: 'leave_request',
      entityId: leave.id,
      link: '/people',
    }).catch(() => null);

    // If approved, trigger automation event
    if (decision === 'approved') {
      await EventService.emit(
        { workspaceId, actorId: reviewerId },
        'leave_approved',
        'leave_request',
        leave.id,
        { ...leave, status: 'approved' }
      );
    }

    return leave;
  }

  static async getLeaveBalances(workspaceId: string, userId: string) {
    return PeopleRepository.getLeaveBalances(workspaceId, userId);
  }

  // 5. Attendance System
  static async checkIn(workspaceId: string, userId: string, ipAddress?: string, notes?: string) {
    return PeopleRepository.checkIn(workspaceId, userId, ipAddress, notes);
  }

  static async checkOut(workspaceId: string, userId: string, notes?: string) {
    return PeopleRepository.checkOut(workspaceId, userId, notes);
  }

  static async getTodayAttendance(workspaceId: string, userId: string) {
    return PeopleRepository.getTodayAttendance(workspaceId, userId);
  }

  static async listAttendance(workspaceId: string, options?: { userId?: string; startDate?: string; endDate?: string; limit?: number }) {
    return PeopleRepository.listAttendanceHistory(workspaceId, options);
  }

  static async getAttendanceMetrics(workspaceId: string) {
    return PeopleRepository.getAttendanceMetrics(workspaceId);
  }

  // 6. Goals & OKRs
  static async createGoal(workspaceId: string, userId: string, data: any) {
    return PeopleRepository.createGoal(workspaceId, userId, data);
  }

  static async listGoals(workspaceId: string, options?: { userId?: string; departmentId?: string; category?: string; status?: string }) {
    return PeopleRepository.listGoals(workspaceId, options);
  }

  static async updateGoalProgress(workspaceId: string, goalId: string, userId: string, progressValue: number, progressPercent: number, notes?: string) {
    const goal = await PeopleRepository.addGoalUpdate(workspaceId, goalId, userId, progressValue, progressPercent, notes);
    if (goal && progressPercent >= 100) {
      await EventService.emit(
        { workspaceId, actorId: userId },
        'goal_completed',
        'goal',
        goal.id,
        { ...goal, status: 'completed' }
      );
    }
    return goal;
  }

  // 7. Performance Reviews
  static async createReviewCycle(workspaceId: string, actorId: string, data: { userId: string; reviewerId: string; cycle: string }) {
    return PeopleRepository.createReview(workspaceId, data);
  }

  static async listReviews(workspaceId: string, options?: { userId?: string; reviewerId?: string; cycle?: string; status?: string }) {
    return PeopleRepository.listReviews(workspaceId, options);
  }

  static async submitSelfReview(workspaceId: string, reviewId: string, userId: string, selfRatings: Record<string, any>, comments?: string) {
    return PeopleRepository.submitSelfReview(workspaceId, reviewId, userId, selfRatings, comments);
  }

  static async submitManagerReview(
    workspaceId: string,
    reviewId: string,
    reviewerId: string,
    managerRatings: Record<string, any>,
    comments?: string,
    strengths?: string,
    growthAreas?: string
  ) {
    const review = await PeopleRepository.submitManagerReview(workspaceId, reviewId, reviewerId, managerRatings, comments, strengths, growthAreas);
    if (review) {
      await EventService.emit(
        { workspaceId, actorId: reviewerId },
        'review_completed',
        'performance_review',
        review.id,
        { ...review, status: 'completed' }
      );
    }
    return review;
  }

  // 8. Executive People Analytics
  static async getPeopleAnalytics(workspaceId: string) {
    return PeopleRepository.getPeopleAnalytics(workspaceId);
  }
}
