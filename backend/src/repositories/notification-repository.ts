import { eq, and, or, desc, lt } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';
import { EventBus } from '../realtime/event-bus';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationEntity {
  id: string;
  workspaceId: string;
  recipientId: string;
  userId: string;
  actorId?: string | null;
  title: string;
  message: string;
  type: string;
  priority: NotificationPriority;
  entityType?: string | null;
  entityId?: string | null;
  link?: string | null;
  isRead: boolean;
  archived: boolean;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export interface CreateNotificationParams {
  id?: string;
  workspaceId: string;
  recipientId?: string;
  userId: string;
  actorId?: string | null;
  title: string;
  message: string;
  type: string;
  priority?: NotificationPriority;
  entityType?: string | null;
  entityId?: string | null;
  link?: string | null;
  isRead?: boolean;
  archived?: boolean;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  tab?: 'unread' | 'read' | 'archived' | 'all';
  includeArchived?: boolean;
  search?: string;
  category?: string;
}

export interface UserNotificationPreferences {
  id?: string;
  workspaceId: string;
  userId: string;
  peopleEmployeeInvites: boolean;
  peopleEmployeeJoined: boolean;
  peopleLeaveRequests: boolean;
  projectsInitiativeUpdates: boolean;
  projectsReviewRequests: boolean;
  projectsAssignments: boolean;
  tasksAssignments: boolean;
  tasksCompletions: boolean;
  tasksOverdueAlerts: boolean;
  crmLeadAssignment: boolean;
  crmDealUpdates: boolean;
  mentions: boolean;
}

export class NotificationRepository {
  /**
   * Find an existing notification matching (workspaceId, recipientId, type, entityId)
   */
  static async findDuplicate(
    workspaceId: string,
    recipientId: string,
    type: string,
    entityId: string
  ): Promise<NotificationEntity | null> {
    // Check inMemoryDb first
    for (const notif of inMemoryDb.notifications.values()) {
      const rId = notif.recipientId || notif.userId;
      if (
        notif.workspaceId === workspaceId &&
        rId === recipientId &&
        notif.type === type &&
        notif.entityId === entityId
      ) {
        return {
          id: notif.id,
          workspaceId: notif.workspaceId,
          recipientId: rId,
          userId: rId,
          actorId: notif.actorId || null,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          priority: notif.priority || 'medium',
          entityType: notif.entityType || null,
          entityId: notif.entityId || null,
          link: notif.link || null,
          isRead: notif.isRead,
          archived: notif.archived ?? false,
          metadata: notif.metadata || null,
          createdAt: notif.createdAt,
        };
      }
    }

    // Check database if connected
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.notifications)
          .where(
            and(
              eq(schema.notifications.workspaceId, workspaceId),
              eq(schema.notifications.recipientId, recipientId),
              eq(schema.notifications.type, type),
              eq(schema.notifications.entityId, entityId)
            )
          )
          .limit(1);

        if (rows && rows.length > 0) {
          const r = rows[0] as any;
          return {
            id: r.id,
            workspaceId: r.workspaceId,
            recipientId: r.recipientId || r.userId,
            userId: r.userId || r.recipientId,
            actorId: r.actorId || null,
            title: r.title,
            message: r.message,
            type: r.type,
            priority: r.priority || 'medium',
            entityType: r.entityType || null,
            entityId: r.entityId || null,
            link: r.link || null,
            isRead: r.isRead,
            archived: r.archived ?? false,
            metadata: (r.metadata as Record<string, any>) || null,
            createdAt: r.createdAt,
          };
        }
      }
    } catch {
      // Fallback
    }

    return null;
  }

  /**
   * Get notification by ID with workspace scoping
   */
  static async getNotificationById(
    workspaceId: string,
    notificationId: string
  ): Promise<NotificationEntity | null> {
    const memoryItem = inMemoryDb.notifications.get(notificationId);
    if (memoryItem && memoryItem.workspaceId === workspaceId) {
      return {
        id: memoryItem.id,
        workspaceId: memoryItem.workspaceId,
        recipientId: memoryItem.recipientId || memoryItem.userId,
        userId: memoryItem.userId || memoryItem.recipientId,
        actorId: memoryItem.actorId || null,
        title: memoryItem.title,
        message: memoryItem.message,
        type: memoryItem.type,
        priority: memoryItem.priority || 'medium',
        entityType: memoryItem.entityType || null,
        entityId: memoryItem.entityId || null,
        link: memoryItem.link || null,
        isRead: memoryItem.isRead,
        archived: memoryItem.archived ?? false,
        metadata: memoryItem.metadata || null,
        createdAt: memoryItem.createdAt,
      };
    }

    try {
      const db = getDb();
      if (db) {
        const [row] = await db
          .select()
          .from(schema.notifications)
          .where(
            and(
              eq(schema.notifications.id, notificationId),
              eq(schema.notifications.workspaceId, workspaceId)
            )
          )
          .limit(1);

        if (row) {
          const r = row as any;
          return {
            id: r.id,
            workspaceId: r.workspaceId,
            recipientId: r.recipientId || r.userId,
            userId: r.userId || r.recipientId,
            actorId: r.actorId || null,
            title: r.title,
            message: r.message,
            type: r.type,
            priority: r.priority || 'medium',
            entityType: r.entityType || null,
            entityId: r.entityId || null,
            link: r.link || null,
            isRead: r.isRead,
            archived: r.archived ?? false,
            metadata: (r.metadata as Record<string, any>) || null,
            createdAt: r.createdAt,
          };
        }
      }
    } catch {
      // Handled
    }

    return null;
  }

  /**
   * Create a new notification for a user in a workspace
   */
  static async createNotification(
    data: CreateNotificationParams,
    tx?: any
  ): Promise<NotificationEntity> {
    const recipientId = data.recipientId || data.userId;

    // Idempotency: avoid creating duplicate notification for same entity & event
    if (data.entityId) {
      const existing = await this.findDuplicate(
        data.workspaceId,
        recipientId,
        data.type,
        data.entityId
      );
      if (existing) {
        return existing;
      }
    }

    const id = data.id || 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const now = data.createdAt || new Date();
    const priority = data.priority || 'medium';
    const archived = data.archived ?? false;

    const record: NotificationEntity = {
      id,
      workspaceId: data.workspaceId,
      recipientId,
      userId: recipientId,
      actorId: data.actorId || null,
      title: data.title,
      message: data.message,
      type: data.type,
      priority,
      entityType: data.entityType || null,
      entityId: data.entityId || null,
      link: data.link || null,
      isRead: data.isRead ?? false,
      archived,
      metadata: data.metadata || null,
      createdAt: now,
    };

    // Store in-memory for resilience
    inMemoryDb.notifications.set(id, record);

    try {
      const runner = tx || getDb();
      if (runner) {
        await runner.insert(schema.notifications).values({
          id,
          workspaceId: data.workspaceId,
          recipientId,
          userId: recipientId,
          actorId: data.actorId || null,
          title: data.title,
          message: data.message,
          type: data.type,
          priority,
          entityType: data.entityType || null,
          entityId: data.entityId || null,
          link: data.link || null,
          isRead: data.isRead ?? false,
          archived,
          metadata: data.metadata || null,
          createdAt: now,
        });
      }
    } catch (err: any) {
      // In-memory record retained
    }

    // Publish to Realtime EventBus for immediate delivery to connected user/workspace
    try {
      EventBus.publishWorkspaceEvent(
        data.workspaceId,
        'notification_created',
        record,
        { targetUserId: data.userId, entityType: 'notification', entityId: id }
      );
    } catch (busErr) {
      console.warn('[NotificationRepository] EventBus publish error:', busErr);
    }

    return record;
  }

  /**
   * Helper to determine priority weight for sorting
   */
  private static getPriorityWeight(priority: string = 'medium'): number {
    switch (priority) {
      case 'urgent':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 2;
    }
  }

  /**
   * Fetch notifications for a user within a workspace with priority sorting & filtering
   */
  static async getNotifications(
    workspaceId: string,
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<NotificationEntity[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    let list: NotificationEntity[] = [];

    try {
      const db = getDb();
      if (db) {
        const conditions = [
          eq(schema.notifications.workspaceId, workspaceId),
          or(
            eq(schema.notifications.recipientId, userId),
            eq(schema.notifications.userId, userId)
          ),
        ];

        const rows = await db
          .select()
          .from(schema.notifications)
          .where(and(...conditions));

        if (rows.length > 0) {
          list = rows.map((r: any) => ({
            id: r.id,
            workspaceId: r.workspaceId,
            recipientId: r.recipientId || r.userId,
            userId: r.userId || r.recipientId,
            actorId: r.actorId || null,
            title: r.title,
            message: r.message,
            type: r.type,
            priority: (r.priority as NotificationPriority) || 'medium',
            entityType: r.entityType || null,
            entityId: r.entityId || null,
            link: r.link || null,
            isRead: r.isRead,
            archived: r.archived ?? false,
            metadata: (r.metadata as Record<string, any>) || null,
            createdAt: new Date(r.createdAt),
          }));
        }
      }
    } catch {
      // Fallback
    }

    if (list.length === 0) {
      // Fallback to inMemoryDb
      list = Array.from(inMemoryDb.notifications.values())
        .filter(
          (n: any) =>
            n.workspaceId === workspaceId &&
            (n.recipientId === userId || n.userId === userId)
        )
        .map((n: any) => ({
          ...n,
          priority: n.priority || 'medium',
          archived: n.archived ?? false,
          recipientId: n.recipientId || n.userId,
          createdAt: new Date(n.createdAt),
        }));
    }

    // 1. Tab / Retention Filtering
    if (options.tab === 'archived') {
      list = list.filter((n) => n.archived);
    } else if (options.tab === 'unread') {
      list = list.filter((n) => !n.archived && !n.isRead);
    } else if (options.tab === 'read') {
      list = list.filter((n) => !n.archived && n.isRead);
    } else {
      if (!options.includeArchived) {
        list = list.filter((n) => !n.archived);
      }
      if (options.unreadOnly) {
        list = list.filter((n) => !n.isRead);
      }
    }

    // 2. Category Filtering
    if (options.category && options.category !== 'all') {
      const cat = options.category.toLowerCase();
      list = list.filter((n) => {
        if (cat === 'people') {
          return n.type.startsWith('employee_') || n.type.startsWith('leave_');
        }
        if (cat === 'projects') {
          return n.type.startsWith('initiative_');
        }
        if (cat === 'tasks') {
          return n.type.startsWith('task_');
        }
        if (cat === 'crm') {
          return n.type === 'lead_assigned' || n.type === 'deal_stage_changed';
        }
        if (cat === 'mentions') {
          return n.type === 'mention_received' || n.type === 'comment_mentioned';
        }
        return true;
      });
    }

    // 3. Search Filtering
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q)
      );
    }

    // 4. Sorting order: urgent -> high -> medium -> low, then createdAt desc
    list.sort((a, b) => {
      const weightA = NotificationRepository.getPriorityWeight(a.priority);
      const weightB = NotificationRepository.getPriorityWeight(b.priority);
      if (weightA !== weightB) {
        return weightB - weightA; // Higher weight first
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return list.slice(offset, offset + limit);
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(
    workspaceId: string,
    userId: string,
    notificationId: string
  ): Promise<boolean> {
    const memoryItem = inMemoryDb.notifications.get(notificationId);
    const isOwner =
      memoryItem &&
      memoryItem.workspaceId === workspaceId &&
      (memoryItem.recipientId === userId || memoryItem.userId === userId);

    if (isOwner && memoryItem) {
      memoryItem.isRead = true;
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .update(schema.notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(schema.notifications.id, notificationId),
              eq(schema.notifications.workspaceId, workspaceId),
              or(
                eq(schema.notifications.recipientId, userId),
                eq(schema.notifications.userId, userId)
              )
            )
          );
        return isOwner;
      }
    } catch {
      // Handled
    }

    return isOwner;
  }

  /**
   * Archive a single notification
   */
  static async archiveNotification(
    workspaceId: string,
    userId: string,
    notificationId: string
  ): Promise<boolean> {
    const memoryItem = inMemoryDb.notifications.get(notificationId);
    const isOwner =
      memoryItem &&
      memoryItem.workspaceId === workspaceId &&
      (memoryItem.recipientId === userId || memoryItem.userId === userId);

    if (isOwner && memoryItem) {
      memoryItem.archived = true;
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .update(schema.notifications)
          .set({ archived: true })
          .where(
            and(
              eq(schema.notifications.id, notificationId),
              eq(schema.notifications.workspaceId, workspaceId),
              or(
                eq(schema.notifications.recipientId, userId),
                eq(schema.notifications.userId, userId)
              )
            )
          );
        return true;
      }
    } catch {
      // Handled
    }

    return !!isOwner;
  }

  /**
   * Retention Rule: Archive notifications older than cutoffDays (default 90 days).
   * Does NOT delete records.
   */
  static async archiveOldNotifications(
    workspaceId?: string,
    cutoffDays: number = 90
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const notif of inMemoryDb.notifications.values()) {
      if (
        (!workspaceId || notif.workspaceId === workspaceId) &&
        !notif.archived &&
        new Date(notif.createdAt) < cutoffDate
      ) {
        notif.archived = true;
        count++;
      }
    }

    try {
      const db = getDb();
      if (db) {
        const conditions = [
          lt(schema.notifications.createdAt, cutoffDate),
          eq(schema.notifications.archived, false),
        ];
        if (workspaceId) {
          conditions.push(eq(schema.notifications.workspaceId, workspaceId));
        }
        await db
          .update(schema.notifications)
          .set({ archived: true })
          .where(and(...conditions));
      }
    } catch (err) {
      console.warn('[NotificationRepository.archiveOldNotifications] DB update error:', err);
    }

    return count;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(workspaceId: string, userId: string): Promise<number> {
    let count = 0;
    for (const notif of inMemoryDb.notifications.values()) {
      if (
        notif.workspaceId === workspaceId &&
        (notif.recipientId === userId || notif.userId === userId) &&
        !notif.isRead
      ) {
        notif.isRead = true;
        count++;
      }
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .update(schema.notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(schema.notifications.workspaceId, workspaceId),
              or(
                eq(schema.notifications.recipientId, userId),
                eq(schema.notifications.userId, userId)
              ),
              eq(schema.notifications.isRead, false)
            )
          );
      }
    } catch {
      // Handled
    }

    return count;
  }

  /**
   * Get fast unread notification count for a user (excluding archived)
   */
  static async getUnreadCount(workspaceId: string, userId: string): Promise<number> {
    let memoryCount = 0;
    for (const notif of inMemoryDb.notifications.values()) {
      if (
        notif.workspaceId === workspaceId &&
        (notif.recipientId === userId || notif.userId === userId) &&
        !notif.isRead &&
        !notif.archived
      ) {
        memoryCount++;
      }
    }

    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.notifications)
          .where(
            and(
              eq(schema.notifications.workspaceId, workspaceId),
              or(
                eq(schema.notifications.recipientId, userId),
                eq(schema.notifications.userId, userId)
              ),
              eq(schema.notifications.isRead, false),
              eq(schema.notifications.archived, false)
            )
          );
        return Math.max(memoryCount, rows.length);
      }
    } catch {
      // Handled
    }

    return memoryCount;
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(
    workspaceId: string,
    userId: string,
    notificationId: string
  ): Promise<boolean> {
    const memoryItem = inMemoryDb.notifications.get(notificationId);
    let deleted = false;
    if (memoryItem && memoryItem.workspaceId === workspaceId && memoryItem.userId === userId) {
      inMemoryDb.notifications.delete(notificationId);
      deleted = true;
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .delete(schema.notifications)
          .where(
            and(
              eq(schema.notifications.id, notificationId),
              eq(schema.notifications.workspaceId, workspaceId),
              eq(schema.notifications.userId, userId)
            )
          );
        return true;
      }
    } catch {
      // Handled
    }

    return deleted;
  }

  /**
   * Default notification preferences
   */
  static getDefaultPreferences(workspaceId: string, userId: string): UserNotificationPreferences {
    return {
      workspaceId,
      userId,
      peopleEmployeeInvites: true,
      peopleEmployeeJoined: true,
      peopleLeaveRequests: true,
      projectsInitiativeUpdates: true,
      projectsReviewRequests: true,
      projectsAssignments: true,
      tasksAssignments: true,
      tasksCompletions: true,
      tasksOverdueAlerts: true,
      crmLeadAssignment: true,
      crmDealUpdates: true,
      mentions: true,
    };
  }

  /**
   * Get user notification preferences
   */
  static async getPreferences(
    workspaceId: string,
    userId: string
  ): Promise<UserNotificationPreferences> {
    const key = `${workspaceId}:${userId}`;
    const mem = inMemoryDb.notificationPreferences.get(key);
    if (mem) {
      return { ...mem };
    }

    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.notificationPreferences)
          .where(
            and(
              eq(schema.notificationPreferences.workspaceId, workspaceId),
              eq(schema.notificationPreferences.userId, userId)
            )
          )
          .limit(1);

        if (rows && rows.length > 0) {
          const r = rows[0] as any;
          const prefs: UserNotificationPreferences = {
            id: r.id,
            workspaceId: r.workspaceId,
            userId: r.userId,
            peopleEmployeeInvites: r.peopleEmployeeInvites ?? true,
            peopleEmployeeJoined: r.peopleEmployeeJoined ?? true,
            peopleLeaveRequests: r.peopleLeaveRequests ?? true,
            projectsInitiativeUpdates: r.projectsInitiativeUpdates ?? true,
            projectsReviewRequests: r.projectsReviewRequests ?? true,
            projectsAssignments: r.projectsAssignments ?? true,
            tasksAssignments: r.tasksAssignments ?? true,
            tasksCompletions: r.tasksCompletions ?? true,
            tasksOverdueAlerts: r.tasksOverdueAlerts ?? true,
            crmLeadAssignment: r.crmLeadAssignment ?? true,
            crmDealUpdates: r.crmDealUpdates ?? true,
            mentions: r.mentions ?? true,
          };
          inMemoryDb.notificationPreferences.set(key, prefs);
          return prefs;
        }
      }
    } catch {
      // Fallback
    }

    return this.getDefaultPreferences(workspaceId, userId);
  }

  /**
   * Update user notification preferences
   */
  static async updatePreferences(
    workspaceId: string,
    userId: string,
    updates: Partial<UserNotificationPreferences>
  ): Promise<UserNotificationPreferences> {
    const current = await this.getPreferences(workspaceId, userId);
    const updated: UserNotificationPreferences = {
      ...current,
      ...updates,
      workspaceId,
      userId,
    };

    const key = `${workspaceId}:${userId}`;
    inMemoryDb.notificationPreferences.set(key, updated);

    try {
      const db = getDb();
      if (db) {
        const id = updated.id || 'pref-' + Date.now();
        await db
          .insert(schema.notificationPreferences)
          .values({
            id,
            workspaceId,
            userId,
            peopleEmployeeInvites: updated.peopleEmployeeInvites,
            peopleEmployeeJoined: updated.peopleEmployeeJoined,
            peopleLeaveRequests: updated.peopleLeaveRequests,
            projectsInitiativeUpdates: updated.projectsInitiativeUpdates,
            projectsReviewRequests: updated.projectsReviewRequests,
            projectsAssignments: updated.projectsAssignments,
            tasksAssignments: updated.tasksAssignments,
            tasksCompletions: updated.tasksCompletions,
            tasksOverdueAlerts: updated.tasksOverdueAlerts,
            crmLeadAssignment: updated.crmLeadAssignment,
            crmDealUpdates: updated.crmDealUpdates,
            mentions: updated.mentions,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [schema.notificationPreferences.workspaceId, schema.notificationPreferences.userId],
            set: {
              peopleEmployeeInvites: updated.peopleEmployeeInvites,
              peopleEmployeeJoined: updated.peopleEmployeeJoined,
              peopleLeaveRequests: updated.peopleLeaveRequests,
              projectsInitiativeUpdates: updated.projectsInitiativeUpdates,
              projectsReviewRequests: updated.projectsReviewRequests,
              projectsAssignments: updated.projectsAssignments,
              tasksAssignments: updated.tasksAssignments,
              tasksCompletions: updated.tasksCompletions,
              tasksOverdueAlerts: updated.tasksOverdueAlerts,
              crmLeadAssignment: updated.crmLeadAssignment,
              crmDealUpdates: updated.crmDealUpdates,
              mentions: updated.mentions,
              updatedAt: new Date(),
            },
          });
      }
    } catch (err) {
      console.warn('[NotificationRepository.updatePreferences] DB error:', err);
    }

    return updated;
  }

  /**
   * Delivery Check: Respect user settings before creating a notification
   */
  static async isNotificationAllowed(
    workspaceId: string,
    recipientId: string,
    type: string
  ): Promise<boolean> {
    const prefs = await this.getPreferences(workspaceId, recipientId);

    switch (type) {
      case 'employee_invited':
        return prefs.peopleEmployeeInvites;
      case 'employee_joined':
        return prefs.peopleEmployeeJoined;
      case 'leave_submitted':
      case 'leave_approved':
      case 'leave_rejected':
        return prefs.peopleLeaveRequests;
      case 'initiative_created':
      case 'initiative_started':
      case 'initiative_approved':
      case 'initiative_rejected':
        return prefs.projectsInitiativeUpdates;
      case 'initiative_review_requested':
        return prefs.projectsReviewRequests;
      case 'initiative_assigned':
        return prefs.projectsAssignments;
      case 'task_assigned':
        return prefs.tasksAssignments;
      case 'task_completed':
        return prefs.tasksCompletions;
      case 'task_overdue':
        return prefs.tasksOverdueAlerts;
      case 'lead_assigned':
        return prefs.crmLeadAssignment;
      case 'deal_stage_changed':
        return prefs.crmDealUpdates;
      case 'mention_received':
      case 'comment_mentioned':
        return prefs.mentions;
      default:
        return true;
    }
  }
}
