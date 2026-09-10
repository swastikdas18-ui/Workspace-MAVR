import { EventBus, RealtimeEvent } from '../realtime/event-bus.js';
import { ActivityRepository, ActivityFeedItem } from '../repositories/activity-repository.js';
import { inMemoryDb, getDb, schema } from '../../packages/database/index.js';
import { eq, desc } from 'drizzle-orm';

export interface OperationalActivityEvent {
  workspaceId: string;
  userId: string;
  action: string;
  entityType: 'task' | 'project' | 'document' | 'employee' | 'sop';
  entityId: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export class ActivityAggregationService {
  private static isInitialized = false;

  /**
   * Initialize event bus subscriptions for operational work events
   */
  static initSubscriptions(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Task Created
    EventBus.subscribe('task_created', async (evt: RealtimeEvent) => {
      await this.handleTaskEvent('task_created', evt);
    });

    // 2. Task Updated
    EventBus.subscribe('task_updated', async (evt: RealtimeEvent) => {
      await this.handleTaskEvent('task_updated', evt);
    });
    EventBus.subscribe('task_assigned', async (evt: RealtimeEvent) => {
      await this.handleTaskEvent('task_updated', evt);
    });

    // 3. Task Completed
    EventBus.subscribe('task_completed', async (evt: RealtimeEvent) => {
      await this.handleTaskEvent('task_completed', evt);
    });

    // 4. Project Assigned / Created
    EventBus.subscribe('project_created', async (evt: RealtimeEvent) => {
      await this.handleProjectEvent('project_created', evt);
    });
    EventBus.subscribe('project_updated', async (evt: RealtimeEvent) => {
      await this.handleProjectEvent('project_assigned', evt);
    });
    EventBus.subscribe('project_assigned', async (evt: RealtimeEvent) => {
      await this.handleProjectEvent('project_assigned', evt);
    });

    // 5. Document Updated
    EventBus.subscribe('document_updated', async (evt: RealtimeEvent) => {
      await this.handleDocumentEvent('document_updated', evt);
    });
    EventBus.subscribe('document_uploaded', async (evt: RealtimeEvent) => {
      await this.handleDocumentEvent('document_updated', evt);
    });

    // 6. Employee Added
    EventBus.subscribe('member_added', async (evt: RealtimeEvent) => {
      await this.handleEmployeeEvent('employee_added', evt);
    });
    EventBus.subscribe('employee_added', async (evt: RealtimeEvent) => {
      await this.handleEmployeeEvent('employee_added', evt);
    });

    // 7. SOP Published
    EventBus.subscribe('sop_published', async (evt: RealtimeEvent) => {
      await this.handleSopEvent('sop_published', evt);
    });
    EventBus.subscribe('wiki_created', async (evt: RealtimeEvent) => {
      await this.handleSopEvent('sop_published', evt);
    });
  }

  /**
   * Direct Ingestion of Operational Activity
   */
  static async ingestActivity(data: OperationalActivityEvent): Promise<ActivityFeedItem> {
    const actorId = data.userId || 'system';
    const log = await ActivityRepository.logActivity({
      workspaceId: data.workspaceId,
      userId: actorId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      metadata: data.metadata || null,
      createdAt: data.createdAt || new Date(),
    });

    const user = inMemoryDb.users.get(actorId);

    const feedItem: ActivityFeedItem = {
      id: log.id,
      workspaceId: log.workspaceId,
      type: `${log.entityType}_${log.action}`,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      user: {
        id: actorId,
        name: user?.name || 'Workspace User',
        email: user?.email || '',
        avatar: user?.avatar || null,
      },
      metadata: log.metadata || null,
      createdAt: log.createdAt,
    };

    // Broadcast specialized chat activity event for real-time timeline tabs
    try {
      EventBus.publishWorkspaceEvent(
        data.workspaceId,
        'chat.activity.created',
        feedItem,
        { actorId, entityType: data.entityType, entityId: data.entityId }
      );
    } catch {}

    return feedItem;
  }

  private static async handleTaskEvent(action: string, evt: RealtimeEvent) {
    if (!evt.workspaceId) return;
    const p = evt.payload || {};
    await this.ingestActivity({
      workspaceId: evt.workspaceId,
      userId: evt.actorId || p.actorId || 'system',
      entityType: 'task',
      entityId: evt.entityId || p.taskId || p.id || 'unknown',
      action: action.replace('task_', ''),
      metadata: {
        title: p.title || p.taskTitle,
        projectId: p.projectId,
        assignedTo: p.assignedTo,
        status: p.status,
      },
    });
  }

  private static async handleProjectEvent(action: string, evt: RealtimeEvent) {
    if (!evt.workspaceId) return;
    const p = evt.payload || {};
    await this.ingestActivity({
      workspaceId: evt.workspaceId,
      userId: evt.actorId || p.actorId || 'system',
      entityType: 'project',
      entityId: evt.entityId || p.projectId || p.id || 'unknown',
      action: action === 'project_assigned' ? 'assigned' : 'created',
      metadata: {
        title: p.title || p.name,
        assignedTo: p.assignedTo || p.leadId,
        status: p.status,
      },
    });
  }

  private static async handleDocumentEvent(action: string, evt: RealtimeEvent) {
    if (!evt.workspaceId) return;
    const p = evt.payload || {};
    await this.ingestActivity({
      workspaceId: evt.workspaceId,
      userId: evt.actorId || p.actorId || 'system',
      entityType: 'document',
      entityId: evt.entityId || p.documentId || p.id || 'unknown',
      action: 'updated',
      metadata: {
        title: p.title || p.name,
        fileType: p.fileType,
      },
    });
  }

  private static async handleEmployeeEvent(action: string, evt: RealtimeEvent) {
    if (!evt.workspaceId) return;
    const p = evt.payload || {};
    await this.ingestActivity({
      workspaceId: evt.workspaceId,
      userId: evt.actorId || p.actorId || 'system',
      entityType: 'employee',
      entityId: evt.entityId || p.userId || p.id || 'unknown',
      action: 'added',
      metadata: {
        name: p.name || p.userName,
        role: p.role,
        email: p.email,
      },
    });
  }

  private static async handleSopEvent(action: string, evt: RealtimeEvent) {
    if (!evt.workspaceId) return;
    const p = evt.payload || {};
    await this.ingestActivity({
      workspaceId: evt.workspaceId,
      userId: evt.actorId || p.actorId || 'system',
      entityType: 'sop',
      entityId: evt.entityId || p.sopId || p.wikiId || p.id || 'unknown',
      action: 'published',
      metadata: {
        title: p.title || 'Standard Operating Procedure',
        departmentId: p.departmentId,
      },
    });
  }

  /**
   * Get operational timeline for a conversation context
   */
  static async getConversationTimeline(
    workspaceId: string,
    conversationId: string,
    projectId?: string | null,
    limit = 50
  ): Promise<ActivityFeedItem[]> {
    // Ensure subscriptions are listening
    this.initSubscriptions();

    // Fetch workspace activities
    const allActivities = await ActivityRepository.getActivityFeed(workspaceId, { limit: 100 });

    // Filter relevant to conversation context if project linked
    let filtered = allActivities;
    if (projectId) {
      filtered = allActivities.filter((act) => {
        // Match if entity is the project or metadata points to the project
        if (act.entityType === 'project' && act.entityId === projectId) return true;
        if (act.metadata && act.metadata.projectId === projectId) return true;
        // Also include major milestones or SOPs
        if (act.entityType === 'sop' || act.entityType === 'employee') return true;
        return false;
      });
    }

    return filtered.slice(0, limit);
  }
}

// Auto-initialize event listeners
ActivityAggregationService.initSubscriptions();
