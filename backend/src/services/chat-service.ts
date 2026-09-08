import { ChatRepository, ConversationEntity, MessageEntity } from '../repositories/chat-repository.js';
import { inMemoryDb, getDb, schema } from '../../packages/database/index.js';
import { EventBus } from '../realtime/event-bus.js';
import { NotificationService } from './notification-service.js';
import { eq, and } from 'drizzle-orm';

export class ChatService {
  /**
   * Ensure default announcement channel exists for workspace
   */
  static async getOrCreateAnnouncementChannel(workspaceId: string, adminUserId?: string): Promise<ConversationEntity> {
    let announcement = await ChatRepository.findAnnouncementConversation(workspaceId);
    if (!announcement) {
      // Find an admin or workspace owner if adminUserId not provided
      let creatorId = adminUserId;
      if (!creatorId) {
        const ws = inMemoryDb.workspaces.get(workspaceId);
        creatorId = ws?.ownerId || 'admin';
      }

      announcement = await ChatRepository.createConversation({
        workspaceId,
        type: 'announcement',
        title: 'Announcements',
        description: 'Official organization updates, strategic milestones, and company announcements.',
        createdById: creatorId,
      });

      // Add all workspace members
      const memberUserIds: string[] = [];
      for (const m of inMemoryDb.workspaceMembers.values()) {
        const wsId = m.workspaceId || (m as any).workspace_id;
        if (wsId === workspaceId) {
          const uId = m.userId || (m as any).user_id;
          if (uId) memberUserIds.push(uId);
        }
      }

      if (memberUserIds.length > 0) {
        await ChatRepository.addConversationMembers(announcement.id, workspaceId, memberUserIds);
      }
    }

    return announcement;
  }

  /**
   * Get or create department conversation and auto-sync department members
   */
  static async getOrCreateDepartmentChannel(
    workspaceId: string,
    departmentId: string,
    actorId?: string
  ): Promise<ConversationEntity | null> {
    let deptName = 'Department';
    let deptDesc = '';
    let headId: string | null = null;

    // Resolve department details
    const memDept = inMemoryDb.departments.get(departmentId);
    if (memDept) {
      deptName = memDept.name;
      deptDesc = memDept.description || '';
      headId = memDept.headId || null;
    } else {
      const db = getDb();
      if (db) {
        try {
          const [row] = await db.select().from(schema.departments).where(eq(schema.departments.id, departmentId));
          if (row) {
            deptName = row.name;
            deptDesc = row.description || '';
            headId = row.headId || null;
          }
        } catch {}
      }
    }

    let conv = await ChatRepository.findDepartmentConversation(workspaceId, departmentId);
    if (!conv) {
      conv = await ChatRepository.createConversation({
        workspaceId,
        type: 'department',
        title: deptName,
        description: deptDesc || `Discussion channel for ${deptName}`,
        departmentId,
        createdById: headId || actorId || 'admin',
      });
    }

    // Auto-sync members: Department members + Department Head + Admins
    await this.syncDepartmentMembers(workspaceId, departmentId, conv.id);

    return conv;
  }

  /**
   * Auto-sync department members into department conversation
   */
  static async syncDepartmentMembers(
    workspaceId: string,
    departmentId: string,
    conversationId?: string
  ): Promise<void> {
    let convId = conversationId;
    if (!convId) {
      const conv = await ChatRepository.findDepartmentConversation(workspaceId, departmentId);
      if (!conv) return;
      convId = conv.id;
    }

    const memberIds = new Set<string>();

    // 1. Department profiles in in-memory
    for (const p of inMemoryDb.employeeProfiles.values()) {
      if (p.workspaceId === workspaceId && p.departmentId === departmentId) {
        memberIds.add(p.userId);
      }
    }

    // 2. Department head
    const dept = inMemoryDb.departments.get(departmentId);
    if (dept?.headId) {
      memberIds.add(dept.headId);
    }

    // 3. All workspace Admins
    for (const m of inMemoryDb.workspaceMembers.values()) {
      const wsId = m.workspaceId || (m as any).workspace_id;
      const role = m.role || (m as any).role;
      if (wsId === workspaceId && role === 'admin') {
        const uId = m.userId || (m as any).user_id;
        if (uId) memberIds.add(uId);
      }
    }

    // Database check
    const db = getDb();
    if (db) {
      try {
        const profiles = await db
          .select()
          .from(schema.employeeProfiles)
          .where(and(eq(schema.employeeProfiles.workspaceId, workspaceId), eq(schema.employeeProfiles.departmentId, departmentId)));
        profiles.forEach((p) => memberIds.add(p.userId));

        const [dbDept] = await db.select().from(schema.departments).where(eq(schema.departments.id, departmentId));
        if (dbDept?.headId) memberIds.add(dbDept.headId);

        const adminMembers = await db
          .select()
          .from(schema.workspaceMembers)
          .where(and(eq(schema.workspaceMembers.workspaceId, workspaceId), eq(schema.workspaceMembers.role, 'admin')));
        adminMembers.forEach((m) => memberIds.add(m.userId));
      } catch {}
    }

    if (memberIds.size > 0) {
      await ChatRepository.addConversationMembers(convId, workspaceId, Array.from(memberIds));
    }
  }

  /**
   * Auto-create project channel when project is created
   */
  static async autoCreateProjectChannel(workspaceId: string, project: any): Promise<ConversationEntity> {
    let conv = await ChatRepository.findProjectConversation(workspaceId, project.id);
    const creatorId = project.createdBy || project.created_by || 'admin';
    const memberIds = new Set<string>();

    if (creatorId) memberIds.add(creatorId);

    // Add assigned project members
    const projMemberIds = project.memberIds || project.member_ids || [];
    projMemberIds.forEach((id: string) => memberIds.add(id));

    // Add Department Lead if department is attached
    const deptId = project.departmentId || project.department_id;
    if (deptId) {
      const dept = inMemoryDb.departments.get(deptId);
      if (dept?.headId) memberIds.add(dept.headId);
    }

    // Add workspace Admins
    for (const m of inMemoryDb.workspaceMembers.values()) {
      const wsId = m.workspaceId || (m as any).workspace_id;
      const role = m.role || (m as any).role;
      if (wsId === workspaceId && role === 'admin') {
        const uId = m.userId || (m as any).user_id;
        if (uId) memberIds.add(uId);
      }
    }

    if (!conv) {
      conv = await ChatRepository.createConversation({
        workspaceId,
        type: 'project',
        title: project.title,
        description: project.description || `Discussion channel for initiative: ${project.title}`,
        projectId: project.id,
        departmentId: deptId || null,
        createdById: creatorId,
      });

      // System welcome message
      await ChatRepository.createMessage({
        conversationId: conv.id,
        workspaceId,
        senderId: creatorId,
        content: `👋 Channel initialized for strategic initiative "${project.title}". Team members and department leads are synced.`,
      });
    }

    if (memberIds.size > 0) {
      await ChatRepository.addConversationMembers(conv.id, workspaceId, Array.from(memberIds));
    }

    return conv;
  }

  /**
   * Get or create a direct message conversation
   */
  static async getOrCreateDm(
    workspaceId: string,
    currentUserId: string,
    targetUserId: string
  ): Promise<ConversationEntity> {
    if (currentUserId === targetUserId) {
      const error: any = new Error('Cannot start a direct message conversation with yourself.');
      error.status = 400;
      throw error;
    }

    let dm = await ChatRepository.findDmConversation(workspaceId, currentUserId, targetUserId);
    if (!dm) {
      dm = await ChatRepository.createConversation({
        workspaceId,
        type: 'dm',
        createdById: currentUserId,
      });

      await ChatRepository.addConversationMember({
        conversationId: dm.id,
        workspaceId,
        userId: currentUserId,
        role: 'member',
      });
      await ChatRepository.addConversationMember({
        conversationId: dm.id,
        workspaceId,
        userId: targetUserId,
        role: 'member',
      });
    }

    return dm;
  }

  /**
   * Create a public or organizational channel (Admin only)
   */
  static async createChannel(
    workspaceId: string,
    title: string,
    description: string | null = null,
    userId: string,
    rawRole: string = 'employee'
  ): Promise<ConversationEntity> {
    const role = (rawRole || 'employee').toLowerCase();
    if (role !== 'admin') {
      const error: any = new Error('Forbidden: Only workspace admins can create channels.');
      error.status = 403;
      throw error;
    }

    if (!title || !title.trim()) {
      const error: any = new Error('Channel name is required.');
      error.status = 400;
      throw error;
    }

    const cleanTitle = title.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const channel = await ChatRepository.createConversation({
      workspaceId,
      type: 'channel',
      title: cleanTitle,
      description: description ? description.trim() : null,
      createdById: userId,
    });

    // Add creator as member
    await ChatRepository.addConversationMember({
      conversationId: channel.id,
      workspaceId,
      userId,
      role: 'admin',
    });

    // Broadcast new channel creation
    try {
      EventBus.publishWorkspaceEvent(workspaceId, 'chat.channel.created', {
        channel,
      }, {
        actorId: userId,
        entityType: 'chat',
        entityId: channel.id,
      });
    } catch {}

    return channel;
  }

  /**
   * Create a group conversation (Admin or Employee)
   */
  static async createGroup(
    workspaceId: string,
    title: string,
    memberUserIds: string[],
    userId: string,
    rawRole: string = 'employee'
  ): Promise<ConversationEntity> {
    const role = (rawRole || 'employee').toLowerCase();
    if (role !== 'admin' && role !== 'employee') {
      const error: any = new Error('Forbidden: Interns cannot create groups.');
      error.status = 403;
      throw error;
    }

    if (!title || !title.trim()) {
      const error: any = new Error('Group name is required.');
      error.status = 400;
      throw error;
    }

    const group = await ChatRepository.createConversation({
      workspaceId,
      type: 'group',
      title: title.trim(),
      createdById: userId,
    });

    // Add creator and all requested members
    const allMemberIds = new Set<string>([userId, ...(memberUserIds || [])]);
    await ChatRepository.addConversationMembers(group.id, workspaceId, Array.from(allMemberIds));

    // Broadcast group creation
    try {
      EventBus.publishWorkspaceEvent(workspaceId, 'chat.group.created', {
        group,
      }, {
        actorId: userId,
        entityType: 'chat',
        entityId: group.id,
      });
    } catch {}

    return group;
  }

  /**
   * List all conversations for a user
   */
  static async getConversations(
    workspaceId: string,
    userId: string,
    rawRole: string = 'employee',
    filter?: 'all' | 'unread' | 'mentions'
  ): Promise<ConversationEntity[]> {
    const role = (rawRole || 'employee').toLowerCase();

    // 1. Ensure default announcements channel exists
    await this.getOrCreateAnnouncementChannel(workspaceId, role === 'admin' ? userId : undefined);

    // 2. Ensure user's department channel is initialized
    let userDeptId: string | null = null;
    for (const p of inMemoryDb.employeeProfiles.values()) {
      if (p.workspaceId === workspaceId && p.userId === userId && p.departmentId) {
        userDeptId = p.departmentId;
        break;
      }
    }
    if (userDeptId) {
      await this.getOrCreateDepartmentChannel(workspaceId, userDeptId, userId);
    }

    return await ChatRepository.listUserConversations(workspaceId, userId, role, filter);
  }

  /**
   * Get messages in conversation with permission checks
   */
  static async getMessages(
    workspaceId: string,
    conversationId: string,
    userId: string,
    rawRole: string = 'employee',
    limit: number = 50,
    before?: string
  ): Promise<MessageEntity[]> {
    const role = (rawRole || 'employee').toLowerCase();
    const isAdmin = role === 'admin';

    const conv = await ChatRepository.getConversationById(workspaceId, conversationId);
    if (!conv) {
      const error: any = new Error('Conversation not found');
      error.status = 404;
      throw error;
    }

    const isMember = await ChatRepository.isConversationMember(conversationId, userId);

    // Permission Enforcement
    if (conv.type === 'dm') {
      if (!isMember) {
        const error: any = new Error('Access denied: You are not a participant in this direct message.');
        error.status = 403;
        throw error;
      }
    } else if (conv.type === 'department' || conv.type === 'project') {
      if (!isMember && !isAdmin) {
        const error: any = new Error(`Access denied: You are not assigned to this ${conv.type} channel.`);
        error.status = 403;
        throw error;
      }
    }

    // Mark as read
    await ChatRepository.markConversationRead(conversationId, userId);

    return await ChatRepository.listMessages(conversationId, limit, before);
  }

  /**
   * Send a message to a conversation
   */
  static async sendMessage(
    workspaceId: string,
    conversationId: string,
    senderId: string,
    rawRole: string = 'employee',
    content: string
  ): Promise<MessageEntity> {
    const role = (rawRole || 'employee').toLowerCase();
    const isAdmin = role === 'admin';

    if (!content || !content.trim()) {
      const error: any = new Error('Message content cannot be empty');
      error.status = 400;
      throw error;
    }

    const conv = await ChatRepository.getConversationById(workspaceId, conversationId);
    if (!conv) {
      const error: any = new Error('Conversation not found');
      error.status = 404;
      throw error;
    }

    // ==========================================
    // PHASE 2 — ANNOUNCEMENTS WRITE RESTRICTION
    // ==========================================
    if (conv.type === 'announcement' && !isAdmin) {
      const error: any = new Error('Forbidden: Announcements channel is read-only for employees and interns. Only workspace Administrators can post announcements.');
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const isMember = await ChatRepository.isConversationMember(conversationId, senderId);
    if (conv.type === 'dm' && !isMember) {
      const error: any = new Error('Forbidden: You are not a participant in this conversation.');
      error.status = 403;
      throw error;
    }
    if ((conv.type === 'department' || conv.type === 'project') && !isMember && !isAdmin) {
      const error: any = new Error(`Forbidden: You are not a member of this ${conv.type} channel.`);
      error.status = 403;
      throw error;
    }

    // If sender is an Admin viewing a channel they aren't explicitly joined to, auto-join them
    if (!isMember && isAdmin) {
      await ChatRepository.addConversationMember({
        conversationId,
        workspaceId,
        userId: senderId,
        role: 'admin',
      });
    }

    // ==========================================
    // PHASE 3 — MENTIONS RESOLUTION (@user & @department)
    // ==========================================
    const mentions: string[] = [];
    const trimmedContent = content.trim();

    // 1. Check for @department mention
    const deptRegex = /@([a-zA-Z0-9_-]+)/g;
    const allMatches = Array.from(trimmedContent.matchAll(deptRegex), (m) => m[1]);

    const senderUser = inMemoryDb.users.get(senderId);
    const senderName = senderUser?.name || 'A team member';

    // Resolve channel members for notification dispatch
    const channelMembers = await ChatRepository.getConversationMembers(conversationId);

    for (const match of allMatches) {
      const matchLower = match.toLowerCase();

      // Check if matches department name
      let matchedDept: any = null;
      for (const d of inMemoryDb.departments.values()) {
        if (d.workspaceId === workspaceId && d.name.toLowerCase().replace(/\s+/g, '') === matchLower) {
          matchedDept = d;
          break;
        }
      }

      if (matchedDept) {
        mentions.push(`@${matchedDept.name}`);
        // Notify all members of this department
        for (const p of inMemoryDb.employeeProfiles.values()) {
          if (p.workspaceId === workspaceId && p.departmentId === matchedDept.id && p.userId !== senderId) {
            await NotificationService.createNotification({
              workspaceId,
              recipientId: p.userId,
              actorId: senderId,
              type: 'mention_received',
              priority: 'high',
              title: `Department Mention from ${senderName}`,
              message: `You were mentioned via @${matchedDept.name}: "${trimmedContent.slice(0, 100)}"`,
              entityType: 'chat',
              entityId: conversationId,
              link: `/chat?conversation=${conversationId}`,
            });
          }
        }
      }

      // Check if matches user name / handle
      for (const u of inMemoryDb.users.values()) {
        if (
          u.name.toLowerCase().replace(/\s+/g, '') === matchLower ||
          u.name.split(' ')[0].toLowerCase() === matchLower ||
          u.email.split('@')[0].toLowerCase() === matchLower
        ) {
          const mentionTag = `@${u.name}`;
          if (!mentions.includes(mentionTag)) {
            mentions.push(mentionTag);
          }
        }
      }
    }

    // 2. Dispatch user mentions via NotificationService.dispatchMentions
    const cleanSnippet = trimmedContent.length > 120 ? `${trimmedContent.slice(0, 117)}...` : trimmedContent;
    await NotificationService.dispatchMentions({
      workspaceId,
      actorId: senderId,
      text: trimmedContent,
      entityType: 'chat',
      entityId: conversationId,
      link: `/chat?conversation=${conversationId}`,
    });

    // Save message
    const message = await ChatRepository.createMessage({
      conversationId,
      workspaceId,
      senderId,
      content: trimmedContent,
      mentions,
    });

    // Realtime EventBus Broadcast (Chat V2 Event Contract)
    try {
      EventBus.publishWorkspaceEvent(
        workspaceId,
        'chat.message.created',
        {
          workspaceId,
          conversationId,
          messageId: message.id,
          senderId,
          createdAt: message.createdAt,
          message,
        },
        {
          actorId: senderId,
          entityType: 'chat',
          entityId: conversationId,
          meta: { conversationId, senderId },
        }
      );

      // Backwards-compatible alias
      EventBus.publishWorkspaceEvent(workspaceId, 'chat_message_created', message, {
        actorId: senderId,
        entityType: 'chat',
        entityId: conversationId,
        meta: { conversationId, senderId },
      });
    } catch (busErr) {
      console.warn('[ChatService] EventBus publish error:', busErr);
    }

    return message;
  }

  /**
   * Edit own message
   */
  static async editMessage(
    workspaceId: string,
    messageId: string,
    userId: string,
    newContent: string
  ): Promise<MessageEntity> {
    const msg = await ChatRepository.getMessageById(messageId);
    if (!msg || msg.workspaceId !== workspaceId) {
      const error: any = new Error('Message not found');
      error.status = 404;
      throw error;
    }

    if (msg.senderId !== userId) {
      const error: any = new Error('Forbidden: You can only edit your own messages.');
      error.status = 403;
      throw error;
    }

    if (!newContent || !newContent.trim()) {
      const error: any = new Error('Message content cannot be empty');
      error.status = 400;
      throw error;
    }

    const updated = await ChatRepository.updateMessage(messageId, newContent.trim());

    try {
      EventBus.publishWorkspaceEvent(workspaceId, 'chat_message_updated', updated, {
        actorId: userId,
        entityType: 'chat',
        entityId: msg.conversationId,
        meta: { conversationId: msg.conversationId, messageId },
      });
    } catch {}

    return updated!;
  }

  /**
   * Delete own message or Admin moderation delete
   */
  static async deleteMessage(
    workspaceId: string,
    messageId: string,
    userId: string,
    rawRole: string = 'employee'
  ): Promise<boolean> {
    const role = (rawRole || 'employee').toLowerCase();
    const isAdmin = role === 'admin';

    const msg = await ChatRepository.getMessageById(messageId);
    if (!msg || msg.workspaceId !== workspaceId) {
      const error: any = new Error('Message not found');
      error.status = 404;
      throw error;
    }

    if (msg.senderId !== userId && !isAdmin) {
      const error: any = new Error('Forbidden: You do not have permission to delete this message.');
      error.status = 403;
      throw error;
    }

    await ChatRepository.deleteMessage(messageId);

    try {
      EventBus.publishWorkspaceEvent(workspaceId, 'chat_message_deleted', { messageId }, {
        actorId: userId,
        entityType: 'chat',
        entityId: msg.conversationId,
        meta: { conversationId: msg.conversationId, messageId },
      });
    } catch {}

    return true;
  }

  /**
   * Toggle emoji reaction
   */
  static async toggleReaction(
    workspaceId: string,
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<{ added: boolean; reaction?: any }> {
    const msg = await ChatRepository.getMessageById(messageId);
    if (!msg || msg.workspaceId !== workspaceId) {
      const error: any = new Error('Message not found');
      error.status = 404;
      throw error;
    }

    const result = await ChatRepository.toggleReaction(messageId, msg.conversationId, userId, emoji);

    try {
      EventBus.publishWorkspaceEvent(
        workspaceId,
        'chat_reaction_toggled',
        {
          messageId,
          userId,
          emoji,
          added: result.added,
        },
        {
          actorId: userId,
          entityType: 'chat',
          entityId: msg.conversationId,
          meta: { conversationId: msg.conversationId },
        }
      );
    } catch {}

    return result;
  }

  /**
   * Mark conversation as read
   */
  static async markConversationRead(
    workspaceId: string,
    conversationId: string,
    userId: string,
    lastReadMessageId?: string | null
  ): Promise<void> {
    await ChatRepository.markConversationRead(conversationId, userId, lastReadMessageId);
  }

  /**
   * Get global unread messages count for user (Sum across all accessible conversations)
   */
  static async getUnreadCount(workspaceId: string, userId: string, rawRole: string = 'employee'): Promise<number> {
    return await ChatRepository.getGlobalUnreadCount(workspaceId, userId, rawRole);
  }

  /**
   * Get unread counts mapped by conversation ID
   */
  static async getUnreadCountsByConversation(
    workspaceId: string,
    userId: string,
    rawRole: string = 'employee'
  ): Promise<Record<string, number>> {
    return await ChatRepository.getUnreadCountsByConversation(workspaceId, userId, rawRole);
  }

  /**
   * Broadcast ephemeral typing indicator
   */
  static async broadcastTyping(
    workspaceId: string,
    conversationId: string,
    userId: string,
    name?: string
  ): Promise<void> {
    const userName = name || inMemoryDb.users.get(userId)?.name || 'User';
    try {
      EventBus.publishWorkspaceEvent(
        workspaceId,
        'chat.user.typing',
        {
          workspaceId,
          conversationId,
          userId,
          name: userName,
        },
        {
          actorId: userId,
          entityType: 'chat',
          entityId: conversationId,
          meta: { conversationId, userId, name: userName },
        }
      );
    } catch (err: any) {
      console.warn('[ChatService.broadcastTyping] error:', err?.message);
    }
  }
}
