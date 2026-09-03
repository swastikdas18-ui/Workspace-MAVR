import { ChatRepository } from '../repositories/chat-repository.js';
import { TaskRepository } from '../repositories/task-repository.js';
import { ProjectRepository } from '../repositories/project-repository.js';
import { PeopleRepository } from '../repositories/people-repository.js';
import { CRMRepository } from '../repositories/crm-repository.js';
import { NotificationRepository } from '../repositories/notification-repository.js';
import { AuditRepository } from '../repositories/audit-repository.js';
import { normalizeRole } from '../lib/permissions.js';

export interface WorkInboxItem {
  id: string;
  title: string;
  subtitle: string;
  entityType: 'task' | 'leave' | 'initiative' | 'mention' | 'chat' | 'lead' | 'deal' | 'notification';
  entityId: string;
  priority: 'urgent' | 'today' | 'upcoming' | 'completed';
  actionLabel: string;
  actionRoute: string;
  dueDate?: string | null;
  timestamp: string | Date;
  status?: string;
  metadata?: Record<string, any>;
}

export interface WorkInboxPayload {
  urgent: WorkInboxItem[];
  today: WorkInboxItem[];
  upcoming: WorkInboxItem[];
  completedRecently: WorkInboxItem[];
  summary: {
    totalUrgent: number;
    totalToday: number;
    totalUpcoming: number;
    totalCompletedRecently: number;
    totalUnresolved: number;
  };
}

export class WorkInboxService {
  /**
   * Aggregate all actionable responsibilities into a structured Work Inbox
   */
  public static async getWorkInbox(
    workspaceId: string,
    userId: string,
    rawRole: string = 'employee'
  ): Promise<WorkInboxPayload> {
    const role = (rawRole || 'employee').toLowerCase();
    const isAdmin = role === 'admin';
    const isIntern = role === 'intern';

    const urgent: WorkInboxItem[] = [];
    const today: WorkInboxItem[] = [];
    const upcoming: WorkInboxItem[] = [];
    const completedRecently: WorkInboxItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Track added entity identifiers to prevent duplicates
    const addedKeys = new Set<string>();

    // =========================================================================
    // 1. UNREAD CHAT MENTIONS & UNREAD CONVERSATIONS
    // =========================================================================
    try {
      const conversations = await ChatRepository.listUserConversations(workspaceId, userId, role);
      for (const conv of conversations) {
        const convTitle = conv.title || (conv.type === 'dm' ? 'Direct Message' : 'Discussion');
        const lastContent = conv.lastMessage?.content || 'Unread conversation awaiting review.';

        if (conv.hasUnreadMention) {
          const key = `mention-${conv.id}`;
          if (!addedKeys.has(key)) {
            addedKeys.add(key);
            urgent.push({
              id: key,
              title: `Mentioned in ${conv.type === 'dm' ? convTitle : '#' + convTitle}`,
              subtitle: lastContent,
              entityType: 'mention',
              entityId: conv.id,
              priority: 'urgent',
              actionLabel: 'Open Conversation',
              actionRoute: `/chat?conversation=${conv.id}`,
              timestamp: conv.lastMessageAt || conv.createdAt,
              metadata: { conversationId: conv.id, unreadCount: conv.unreadCount },
            });
          }
        } else if (conv.unreadCount && conv.unreadCount > 0) {
          const key = `chat-${conv.id}`;
          if (!addedKeys.has(key)) {
            addedKeys.add(key);
            today.push({
              id: key,
              title: `${conv.type === 'dm' ? convTitle : '#' + convTitle} (${conv.unreadCount} unread)`,
              subtitle: lastContent,
              entityType: 'chat',
              entityId: conv.id,
              priority: 'today',
              actionLabel: 'Open Chat',
              actionRoute: `/chat?conversation=${conv.id}`,
              timestamp: conv.lastMessageAt || conv.createdAt,
              metadata: { conversationId: conv.id, unreadCount: conv.unreadCount },
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('[WorkInboxService] Chat aggregation error:', err.message);
    }

    // =========================================================================
    // 2. ASSIGNED, OVERDUE & RECENTLY COMPLETED TASKS
    // =========================================================================
    try {
      const allTasks = await TaskRepository.listTasks(workspaceId, {
        userId,
        role: role as any,
      });

      for (const t of allTasks) {
        // RBAC filtering:
        // Interns only see assigned learning tasks
        if (isIntern && !t.isLearningTask && (t as any).assigneeId !== userId && t.assignedTo !== userId) {
          continue;
        }

        // Check user assignment
        const isAssigned =
          (t as any).assigneeId === userId ||
          t.assignedTo === userId ||
          (Array.isArray((t as any).assigneeIds) && (t as any).assigneeIds.includes(userId)) ||
          (isAdmin && !(t as any).assigneeId && !t.assignedTo); // Unassigned tasks visible to admin

        if (!isAssigned) continue;

        const isDone = t.status === 'done' || t.status === 'completed';

        if (isDone) {
          const completionTime = t.completedAt ? new Date(t.completedAt) : (t as any).updatedAt ? new Date((t as any).updatedAt) : new Date(t.createdAt);
          if (completionTime >= sevenDaysAgo) {
            completedRecently.push({
              id: `task-done-${t.id}`,
              title: `Completed: ${t.title}`,
              subtitle: `Finished on ${completionTime.toLocaleDateString()} • Priority: ${(t.priority || 'medium').toUpperCase()}`,
              entityType: 'task',
              entityId: t.id,
              priority: 'completed',
              actionLabel: 'View Task',
              actionRoute: `/tasks/${t.id}`,
              status: t.status,
              timestamp: completionTime,
              metadata: { taskId: t.id, priority: t.priority },
            });
          }
          continue;
        } else {
          // Open task: evaluate due date
          const taskDueDate = t.dueDate ? new Date(t.dueDate) : null;

          if (taskDueDate && taskDueDate < startOfToday) {
            // Overdue -> Urgent
            urgent.push({
              id: `task-overdue-${t.id}`,
              title: `Overdue: ${t.title}`,
              subtitle: `Due on ${taskDueDate.toLocaleDateString()} • Priority: ${(t.priority || 'medium').toUpperCase()}`,
              entityType: 'task',
              entityId: t.id,
              priority: 'urgent',
              actionLabel: 'Open Task',
              actionRoute: `/tasks/${t.id}`,
              dueDate: taskDueDate.toISOString(),
              status: t.status,
              timestamp: taskDueDate,
              metadata: { taskId: t.id, priority: t.priority },
            });
          } else if (taskDueDate && taskDueDate >= startOfToday && taskDueDate <= endOfToday) {
            // Due Today -> Today
            today.push({
              id: `task-today-${t.id}`,
              title: `Due Today: ${t.title}`,
              subtitle: `Task due today • Priority: ${(t.priority || 'medium').toUpperCase()}`,
              entityType: 'task',
              entityId: t.id,
              priority: 'today',
              actionLabel: 'Open Task',
              actionRoute: `/tasks/${t.id}`,
              dueDate: taskDueDate.toISOString(),
              status: t.status,
              timestamp: taskDueDate,
              metadata: { taskId: t.id, priority: t.priority },
            });
          } else if (taskDueDate && taskDueDate > endOfToday) {
            // Future -> Upcoming
            upcoming.push({
              id: `task-upcoming-${t.id}`,
              title: t.title,
              subtitle: `Due ${taskDueDate.toLocaleDateString()} • Priority: ${(t.priority || 'medium').toUpperCase()}`,
              entityType: 'task',
              entityId: t.id,
              priority: 'upcoming',
              actionLabel: 'Open Task',
              actionRoute: `/tasks/${t.id}`,
              dueDate: taskDueDate.toISOString(),
              status: t.status,
              timestamp: taskDueDate,
              metadata: { taskId: t.id, priority: t.priority },
            });
          } else {
            // No due date but assigned -> Today's active queue
            today.push({
              id: `task-active-${t.id}`,
              title: t.title,
              subtitle: `Active Task • Status: ${(t.status || 'todo').toUpperCase()}`,
              entityType: 'task',
              entityId: t.id,
              priority: 'today',
              actionLabel: 'Open Task',
              actionRoute: `/tasks/${t.id}`,
              status: t.status,
              timestamp: t.createdAt ? new Date(t.createdAt) : now,
              metadata: { taskId: t.id, priority: t.priority },
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('[WorkInboxService] Task aggregation error:', err.message);
    }

    // =========================================================================
    // 3. INITIATIVES (PROJECTS) AWAITING REVIEW & RECENTLY APPROVED
    // =========================================================================
    if (!isIntern) {
      try {
        const allProjects = await ProjectRepository.listProjects(workspaceId, userId, role);

        for (const p of allProjects) {
          const isAwaitingReview =
            p.status === 'review' ||
            p.status === 'under_review' ||
            (p.submittedForReviewAt && p.status !== 'completed' && p.status !== 'done');

          if (isAwaitingReview) {
            // Awaiting Review -> Urgent (for Admins or assignees)
            if (isAdmin || (Array.isArray(p.memberIds) && p.memberIds.includes(userId))) {
              urgent.push({
                id: `initiative-review-${p.id}`,
                title: `Initiative Review: ${p.title}`,
                subtitle: `Submitted by ${p.submittedBy || 'Team'} awaiting executive review`,
                entityType: 'initiative',
                entityId: p.id,
                priority: 'urgent',
                actionLabel: 'Review Initiative',
                actionRoute: `/projects/${p.id}`,
                status: p.status,
                timestamp: p.submittedForReviewAt ? new Date(p.submittedForReviewAt) : now,
                metadata: { projectId: p.id },
              });
            }
          } else if (p.status === 'completed' || p.status === 'done' || p.approvedBy) {
            const finishTime = p.completedAt ? new Date(p.completedAt) : (p as any).updatedAt ? new Date((p as any).updatedAt) : new Date(p.createdAt);
            if (finishTime >= sevenDaysAgo) {
              completedRecently.push({
                id: `initiative-done-${p.id}`,
                title: `Approved Initiative: ${p.title}`,
                subtitle: `Approved by ${p.approvedBy || 'Leadership'} and completed`,
                entityType: 'initiative',
                entityId: p.id,
                priority: 'completed',
                actionLabel: 'View Initiative',
                actionRoute: `/projects/${p.id}`,
                status: p.status,
                timestamp: finishTime,
              });
            }
          } else if (p.startDate && new Date(p.startDate) > endOfToday) {
            // Future initiative -> Upcoming
            upcoming.push({
              id: `initiative-upcoming-${p.id}`,
              title: `Upcoming Initiative: ${p.title}`,
              subtitle: `Kickoff scheduled on ${new Date(p.startDate).toLocaleDateString()}`,
              entityType: 'initiative',
              entityId: p.id,
              priority: 'upcoming',
              actionLabel: 'View Initiative',
              actionRoute: `/projects/${p.id}`,
              timestamp: new Date(p.startDate),
            });
          }
        }
      } catch (err: any) {
        console.warn('[WorkInboxService] Project aggregation error:', err.message);
      }
    }

    // =========================================================================
    // 4. LEAVE REQUESTS AWAITING APPROVAL
    // =========================================================================
    try {
      const allLeaves = await PeopleRepository.listLeaveRequests(workspaceId);

      for (const l of allLeaves) {
        const applicantName = l.user?.name || 'Team Member';

        if (l.status === 'pending') {
          // If Admin, show all pending leave approvals in urgent
          if (isAdmin) {
            urgent.push({
              id: `leave-review-${l.id}`,
              title: `Leave Approval: ${applicantName}`,
              subtitle: `${l.leaveType || 'Leave'} (${l.startDate} to ${l.endDate}) • Reason: ${l.reason || 'Personal'}`,
              entityType: 'leave',
              entityId: l.id,
              priority: 'urgent',
              actionLabel: 'Review Request',
              actionRoute: '/teams',
              timestamp: l.createdAt ? new Date(l.createdAt) : now,
              metadata: {
                leaveId: l.id,
                applicantId: l.userId,
                applicantName,
                leaveType: l.leaveType,
                startDate: l.startDate,
                endDate: l.endDate,
              },
            });
          }
        } else if (l.userId === userId && l.status === 'approved') {
          const approvedTime = l.reviewedAt ? new Date(l.reviewedAt) : l.updatedAt ? new Date(l.updatedAt) : now;
          if (approvedTime >= sevenDaysAgo) {
            completedRecently.push({
              id: `leave-approved-${l.id}`,
              title: `Leave Approved: ${l.leaveType || 'Time Off'}`,
              subtitle: `Your leave request for ${l.startDate} was approved`,
              entityType: 'leave',
              entityId: l.id,
              priority: 'completed',
              actionLabel: 'View Schedule',
              actionRoute: '/teams',
              timestamp: approvedTime,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('[WorkInboxService] Leave request aggregation error:', err.message);
    }

    // =========================================================================
    // 5. CRM LEADS & DEALS REQUIRING ACTION
    // =========================================================================
    if (isAdmin || role === 'employee') {
      try {
        const allLeads = await CRMRepository.listRecords(workspaceId, isAdmin ? undefined : { ownerId: userId });

        for (const lead of allLeads) {
          if (lead.status === 'new' || lead.status === 'contacted' || lead.status === 'negotiation') {
            const key = `lead-${lead.id}`;
            if (!addedKeys.has(key)) {
              addedKeys.add(key);
              today.push({
                id: key,
                title: `CRM Deal: ${lead.customerName} (${lead.company})`,
                subtitle: `Value: ₹${(lead.dealValue || 0).toLocaleString()} • Status: ${lead.status.toUpperCase()}`,
                entityType: 'lead',
                entityId: lead.id,
                priority: 'today',
                actionLabel: 'Open Lead',
                actionRoute: `/crm/${lead.id}`,
                timestamp: lead.lastContacted ? new Date(lead.lastContacted) : now,
                metadata: { leadId: lead.id, company: lead.company, dealValue: lead.dealValue },
              });
            }
          }
        }
      } catch (err: any) {
        console.warn('[WorkInboxService] CRM aggregation error:', err.message);
      }
    }

    // =========================================================================
    // 6. HIGH-PRIORITY SYSTEM NOTIFICATIONS
    // =========================================================================
    try {
      const allNotifs = await NotificationRepository.getNotifications(workspaceId, userId, {
        unreadOnly: true,
        limit: 100,
      });

      for (const notif of allNotifs) {
        // Skip chat mentions if already aggregated under chat section
        if (notif.type === 'mention_received') {
          const mentionKey = `mention-${notif.entityId}`;
          if (addedKeys.has(mentionKey)) continue;
        }

        if (notif.priority === 'urgent' || notif.priority === 'high') {
          const notifKey = `notif-${notif.id}`;
          if (!addedKeys.has(notifKey)) {
            addedKeys.add(notifKey);
            urgent.push({
              id: notifKey,
              title: notif.title,
              subtitle: notif.message,
              entityType: 'notification',
              entityId: notif.id,
              priority: 'urgent',
              actionLabel: 'View Alert',
              actionRoute: notif.link || '/notifications',
              timestamp: notif.createdAt ? new Date(notif.createdAt) : now,
              metadata: { notificationId: notif.id, type: notif.type },
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('[WorkInboxService] Notification aggregation error:', err.message);
    }

    // =========================================================================
    // 7. SORTING ENGINE
    // =========================================================================
    // Sort items within each bucket chronologically / by urgency
    const sortByTime = (a: WorkInboxItem, b: WorkInboxItem) => {
      const timeA = new Date(a.dueDate || a.timestamp).getTime();
      const timeB = new Date(b.dueDate || b.timestamp).getTime();
      return timeA - timeB;
    };

    urgent.sort(sortByTime);
    today.sort(sortByTime);
    upcoming.sort(sortByTime);
    completedRecently.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const summary = {
      totalUrgent: urgent.length,
      totalToday: today.length,
      totalUpcoming: upcoming.length,
      totalCompletedRecently: completedRecently.length,
      totalUnresolved: urgent.length + today.length,
    };

    return {
      urgent,
      today,
      upcoming,
      completedRecently,
      summary,
    };
  }

  /**
   * Execute in-line quick action directly from an inbox card with strict enterprise authorization & audit logging
   */
  public static async executeQuickAction(
    workspaceId: string,
    userId: string,
    rawRole: string,
    action: string,
    payload: Record<string, any>
  ): Promise<{ success: boolean; message: string }> {
    const role = normalizeRole(rawRole);
    const isAdmin = role === 'admin';

    // Helper for audit logging
    const recordAudit = async (resource: string, targetId: string, result: 'allowed' | 'denied', details?: any) => {
      try {
        await AuditRepository.logAudit({
          workspaceId,
          userId,
          action: `inbox.quick_action.${action}`,
          resource,
          resourceId: targetId,
          newValues: { result, details, timestamp: new Date() },
        });
      } catch (auditErr: any) {
        console.warn('[WorkInboxService.executeQuickAction] Audit log warning:', auditErr?.message);
      }
    };

    switch (action) {
      case 'mark_task_complete': {
        const { taskId } = payload;
        if (!taskId) throw new Error('taskId is required.');

        // 1. Fetch task and verify workspace boundary
        const task = await TaskRepository.getTaskById(workspaceId, taskId);
        if (!task || task.workspaceId !== workspaceId) {
          await recordAudit('task', taskId, 'denied', { reason: 'not_found_or_boundary_mismatch' });
          const error: any = new Error('Task not found in this workspace.');
          error.code = 'NOT_FOUND';
          error.status = 404;
          throw error;
        }

        // 2. Authorization: Assigned user OR Admin only
        const isAssigned =
          task.assignedTo === userId ||
          (task as any).assigneeId === userId ||
          (Array.isArray((task as any).assigneeIds) && (task as any).assigneeIds.includes(userId));

        if (!isAdmin && !isAssigned) {
          await recordAudit('task', taskId, 'denied', { reason: 'not_assigned_and_not_admin', role });
          const error: any = new Error('Forbidden: Only the assigned user or a workspace administrator can mark this task complete.');
          error.code = 'FORBIDDEN';
          error.status = 403;
          throw error;
        }

        // 3. Mutation
        const updated = await TaskRepository.updateTask(workspaceId, taskId, {
          status: 'done',
          completedAt: new Date(),
        });
        if (!updated) throw new Error('Task not found.');

        await recordAudit('task', taskId, 'allowed', { previousStatus: task.status, newStatus: 'done' });
        return { success: true, message: 'Task marked as complete.' };
      }

      case 'approve_leave':
      case 'reject_leave': {
        const { leaveId, reviewNotes } = payload;
        if (!leaveId) throw new Error('leaveId is required.');
        const decision = action === 'approve_leave' ? 'approved' : 'rejected';

        // 1. Fetch leave request and verify workspace boundary
        const leave = await PeopleRepository.getLeaveRequestById(workspaceId, leaveId);
        if (!leave || leave.workspaceId !== workspaceId) {
          await recordAudit('leave_request', leaveId, 'denied', { reason: 'not_found_or_boundary_mismatch' });
          const error: any = new Error('Leave request not found in this workspace.');
          error.code = 'NOT_FOUND';
          error.status = 404;
          throw error;
        }

        // 2. Authorization Rules:
        // - Intern: Denied
        // - Employee: Denied (cannot approve self or others)
        // - Department Head: Allowed ONLY for their department
        // - Workspace Admin: Allowed
        if (role === 'intern') {
          await recordAudit('leave_request', leaveId, 'denied', { reason: 'intern_role_forbidden', applicantId: leave.userId });
          const error: any = new Error('Forbidden: Interns are not authorized to review leave requests.');
          error.code = 'FORBIDDEN';
          error.status = 403;
          throw error;
        }

        let isAuthorized = false;

        if (isAdmin) {
          isAuthorized = true;
        } else {
          // Check if caller is Department Head of the applicant's department
          const applicantProfile = await PeopleRepository.getProfileByUserId(workspaceId, leave.userId);
          const applicantDeptId = applicantProfile?.departmentId || applicantProfile?.department?.id;

          if (applicantDeptId) {
            const department = await PeopleRepository.getDepartmentById(workspaceId, applicantDeptId);
            if (department && department.headId === userId) {
              isAuthorized = true;
            }
          }
        }

        if (!isAuthorized) {
          await recordAudit('leave_request', leaveId, 'denied', { reason: 'insufficient_privileges', role, applicantId: leave.userId });
          const error: any = new Error('Forbidden: Only workspace administrators or the department head of the applicant can review this leave request.');
          error.code = 'FORBIDDEN';
          error.status = 403;
          throw error;
        }

        // 3. Mutation
        const updated = await PeopleRepository.reviewLeaveRequest(
          workspaceId,
          leaveId,
          userId,
          decision,
          reviewNotes
        );
        if (!updated) throw new Error('Leave request not found.');

        // 4. Side-effects: Notify applicant & emit events if approved
        try {
          const reviewerProfile = await PeopleRepository.getProfileByUserId(workspaceId, userId);
          const reviewerName = reviewerProfile?.user?.name || (isAdmin ? 'Admin' : 'Department Head');
          const notifType = decision === 'approved' ? 'leave_approved' : 'leave_rejected';
          const title = decision === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected';
          const message = `Your ${leave.leaveType} leave request was ${decision} by ${reviewerName}.`;

          await NotificationRepository.createNotification({
            workspaceId,
            recipientId: leave.userId,
            userId: leave.userId,
            actorId: userId,
            type: notifType,
            title,
            message,
            entityType: 'leave_request',
            entityId: leave.id,
            link: '/people',
          });
        } catch (notifErr: any) {
          console.warn('[WorkInboxService] Leave review notification warning:', notifErr?.message);
        }

        await recordAudit('leave_request', leaveId, 'allowed', { decision, applicantId: leave.userId });
        return { success: true, message: `Leave request ${decision} successfully.` };
      }

      case 'mark_notification_read': {
        const { notificationId } = payload;
        if (!notificationId) throw new Error('notificationId is required.');

        // 1. Fetch notification to verify ownership & workspace boundary
        const notification = await NotificationRepository.getNotificationById(workspaceId, notificationId);
        if (!notification || notification.workspaceId !== workspaceId) {
          await recordAudit('notification', notificationId, 'denied', { reason: 'not_found_or_boundary_mismatch' });
          const error: any = new Error('Notification not found in this workspace.');
          error.code = 'NOT_FOUND';
          error.status = 404;
          throw error;
        }

        // 2. Authorization: Owner only
        const isOwner = notification.recipientId === userId || notification.userId === userId;
        if (!isOwner) {
          await recordAudit('notification', notificationId, 'denied', { reason: 'not_owner', recipientId: notification.recipientId });
          const error: any = new Error('Forbidden: You can only mark your own notifications as read.');
          error.code = 'FORBIDDEN';
          error.status = 403;
          throw error;
        }

        // 3. Mutation
        await NotificationRepository.markAsRead(workspaceId, notificationId, userId);
        await recordAudit('notification', notificationId, 'allowed');
        return { success: true, message: 'Notification marked as read.' };
      }

      default:
        throw new Error(`Unknown quick action: ${action}`);
    }
  }
}
