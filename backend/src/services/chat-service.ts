import { ChatRepository, ConversationEntity, MessageEntity } from '../repositories/chat-repository.js';
import { inMemoryDb, getDb, schema } from '../../packages/database/index.js';
import { EventBus } from '../realtime/event-bus.js';
import { NotificationService } from './notification-service.js';
import { eq, and, desc } from 'drizzle-orm';

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
    content: string,
    options?: {
      parentId?: string | null;
      attachments?: import('../repositories/chat-repository.js').ChatAttachment[];
    }
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

    const senderUser = inMemoryDb.users.get(senderId);
    const senderName = senderUser?.name || 'A team member';
    const cleanSnippet = trimmedContent.length > 120 ? `${trimmedContent.slice(0, 117)}...` : trimmedContent;

    // Resolve channel members for notification dispatch
    const channelMembers = await ChatRepository.getConversationMembers(conversationId);

    // Track structured mentions to persist in message_mentions
    // Array<{ userId: string; mentionType: 'user' | 'team' | 'admins' | 'everyone' }>
    const targetMentionsMap = new Map<string, 'user' | 'team' | 'admins' | 'everyone'>();

    // 1. Parse Mentions (@username, @team, @admins, @everyone, @department)
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const allMatches = Array.from(trimmedContent.matchAll(mentionRegex), (m) => m[1]);

    // Fetch all workspace members
    let workspaceMembersList: Array<{ userId: string; role: string; user?: any }> = [];
    const db = getDb();
    if (db) {
      try {
        const rows = await db
          .select({
            userId: schema.workspaceMembers.userId,
            role: schema.workspaceMembers.role,
          })
          .from(schema.workspaceMembers)
          .where(eq(schema.workspaceMembers.workspaceId, workspaceId));
        workspaceMembersList = rows;
      } catch {
        workspaceMembersList = [];
      }
    }
    if (workspaceMembersList.length === 0) {
      for (const wm of inMemoryDb.workspaceMembers.values()) {
        if (wm.workspaceId === workspaceId) {
          workspaceMembersList.push({ userId: wm.userId, role: wm.role });
        }
      }
    }

    for (const match of allMatches) {
      const matchLower = match.toLowerCase();

      // Check @everyone
      if (matchLower === 'everyone' || matchLower === 'channel' || matchLower === 'here') {
        if (!mentions.includes('@everyone')) mentions.push('@everyone');
        // If channel conversation, notify channel members; otherwise notify workspace members
        const targets = channelMembers.length > 0 ? channelMembers.map((cm) => cm.userId) : workspaceMembersList.map((wm) => wm.userId);
        for (const uid of targets) {
          if (uid !== senderId && !targetMentionsMap.has(uid)) {
            targetMentionsMap.set(uid, 'everyone');
          }
        }
        continue;
      }

      // Check @admins
      if (matchLower === 'admins' || matchLower === 'admin') {
        if (!mentions.includes('@admins')) mentions.push('@admins');
        const adminIds = workspaceMembersList.filter((wm) => wm.role === 'admin').map((wm) => wm.userId);
        // Also check owner
        const ws = inMemoryDb.workspaces.get(workspaceId);
        if (ws?.ownerId) adminIds.push(ws.ownerId);

        for (const uid of adminIds) {
          if (uid !== senderId && !targetMentionsMap.has(uid)) {
            targetMentionsMap.set(uid, 'admins');
          }
        }
        continue;
      }

      // Check @team or @team_<name>
      if (matchLower === 'team') {
        if (!mentions.includes('@team')) mentions.push('@team');
        // Target all members of any team in this workspace or channel
        for (const tm of inMemoryDb.teamMembers.values()) {
          const t = inMemoryDb.teams.get(tm.teamId);
          if (t && t.workspaceId === workspaceId && tm.userId !== senderId) {
            if (!targetMentionsMap.has(tm.userId)) {
              targetMentionsMap.set(tm.userId, 'team');
            }
          }
        }
        continue;
      }

      // Check specific team name: e.g. @frontend, @backend, @devs
      let matchedTeam: any = null;
      for (const t of inMemoryDb.teams.values()) {
        if (t.workspaceId === workspaceId && t.name.toLowerCase().replace(/\s+/g, '') === matchLower) {
          matchedTeam = t;
          break;
        }
      }
      if (matchedTeam) {
        const teamTag = `@${matchedTeam.name}`;
        if (!mentions.includes(teamTag)) mentions.push(teamTag);
        for (const tm of inMemoryDb.teamMembers.values()) {
          if (tm.teamId === matchedTeam.id && tm.userId !== senderId) {
            if (!targetMentionsMap.has(tm.userId)) {
              targetMentionsMap.set(tm.userId, 'team');
            }
          }
        }
        continue;
      }

      // Check department name: e.g. @Engineering, @Design
      let matchedDept: any = null;
      for (const d of inMemoryDb.departments.values()) {
        if (d.workspaceId === workspaceId && d.name.toLowerCase().replace(/\s+/g, '') === matchLower) {
          matchedDept = d;
          break;
        }
      }
      if (matchedDept) {
        const deptTag = `@${matchedDept.name}`;
        if (!mentions.includes(deptTag)) mentions.push(deptTag);
        for (const p of inMemoryDb.employeeProfiles.values()) {
          if (p.workspaceId === workspaceId && p.departmentId === matchedDept.id && p.userId !== senderId) {
            if (!targetMentionsMap.has(p.userId)) {
              targetMentionsMap.set(p.userId, 'team');
            }
          }
        }
        continue;
      }

      // Check @user (User's name or email prefix or user ID)
      for (const wm of workspaceMembersList) {
        const u = inMemoryDb.users.get(wm.userId);
        if (!u) continue;
        const normalizedName = u.name.toLowerCase().replace(/\s+/g, '');
        const emailPrefix = u.email.split('@')[0].toLowerCase();
        const firstWord = u.name.toLowerCase().split(/\s+/)[0];

        if (
          normalizedName === matchLower ||
          emailPrefix === matchLower ||
          firstWord === matchLower ||
          u.id === match
        ) {
          const mentionTag = `@${u.name}`;
          if (!mentions.includes(mentionTag)) mentions.push(mentionTag);
          if (u.id !== senderId && !targetMentionsMap.has(u.id)) {
            targetMentionsMap.set(u.id, 'user');
          }
        }
      }
    }

    // Save message
    const message = await ChatRepository.createMessage({
      conversationId,
      workspaceId,
      senderId,
      content: trimmedContent,
      parentId: options?.parentId || null,
      attachments: options?.attachments || [],
      mentions,
    });

    // 2. Persist message_mentions entities
    const mentionsToCreate: Array<{
      workspaceId: string;
      messageId: string;
      mentionedUserId: string;
      mentionType: 'user' | 'team' | 'admins' | 'everyone';
    }> = [];

    for (const [mentionedUserId, mentionType] of targetMentionsMap.entries()) {
      mentionsToCreate.push({
        workspaceId,
        messageId: message.id,
        mentionedUserId,
        mentionType,
      });
    }

    const recordedMentions = await ChatRepository.recordMentions(mentionsToCreate);

    // 3. Generate notifications for each mentioned user
    for (const [mentionedUserId, mentionType] of targetMentionsMap.entries()) {
      let title = `${senderName} mentioned you`;
      if (mentionType === 'everyone') title = `${senderName} mentioned @everyone`;
      else if (mentionType === 'admins') title = `${senderName} mentioned @admins`;
      else if (mentionType === 'team') title = `${senderName} mentioned the team`;

      await NotificationService.createNotification({
        workspaceId,
        recipientId: mentionedUserId,
        actorId: senderId,
        type: 'mention_received',
        priority: 'high',
        title,
        message: cleanSnippet,
        entityType: 'chat',
        entityId: conversationId,
        link: `/chat?conversation=${conversationId}&messageId=${message.id}`,
      });
    }

    // 4. Emit chat.mention.created realtime event for each mention
    for (const rm of recordedMentions) {
      try {
        EventBus.publishWorkspaceEvent(
          workspaceId,
          'chat.mention.created',
          {
            id: rm.id,
            workspaceId,
            messageId: message.id,
            conversationId,
            mentionedUserId: rm.mentionedUserId,
            mentionType: rm.mentionType,
            senderId,
            senderName,
            content: cleanSnippet,
            createdAt: rm.createdAt,
          },
          {
            targetUserId: rm.mentionedUserId,
            actorId: senderId,
            entityType: 'chat',
            entityId: message.id,
            meta: { messageId: message.id, mentionType: rm.mentionType },
          }
        );
      } catch (err: any) {
        console.warn('[ChatService.sendMessage] Mention realtime event dispatch error:', err?.message);
      }
    }

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
          parentId: message.parentId,
          createdAt: message.createdAt,
          message,
        },
        {
          actorId: senderId,
          entityType: 'chat',
          entityId: conversationId,
          meta: { conversationId, senderId, parentId: message.parentId },
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
      EventBus.publishWorkspaceEvent(workspaceId, 'chat.message.updated', { message: updated }, {
        actorId: userId,
        entityType: 'chat',
        entityId: msg.conversationId,
        meta: { conversationId: msg.conversationId, messageId },
      });
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
      EventBus.publishWorkspaceEvent(workspaceId, 'chat.message.deleted', { messageId, conversationId: msg.conversationId }, {
        actorId: userId,
        entityType: 'chat',
        entityId: msg.conversationId,
        meta: { conversationId: msg.conversationId, messageId },
      });
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
      const eventType = result.added ? 'chat.reaction.created' : 'chat.reaction.removed';
      EventBus.publishWorkspaceEvent(
        workspaceId,
        eventType,
        {
          messageId,
          conversationId: msg.conversationId,
          userId,
          emoji,
          added: result.added,
          reaction: result.reaction,
        },
        {
          actorId: userId,
          entityType: 'chat',
          entityId: msg.conversationId,
          meta: { conversationId: msg.conversationId, messageId, emoji },
        }
      );

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
   * Toggle pinned state of a message (Admin only)
   */
  static async togglePin(
    workspaceId: string,
    messageId: string,
    userId: string,
    rawRole: string = 'employee'
  ): Promise<MessageEntity> {
    const role = (rawRole || 'employee').toLowerCase();
    if (role !== 'admin') {
      const error: any = new Error('Forbidden: Only Administrators can pin messages.');
      error.status = 403;
      throw error;
    }

    const msg = await ChatRepository.getMessageById(messageId);
    if (!msg || msg.workspaceId !== workspaceId) {
      const error: any = new Error('Message not found');
      error.status = 404;
      throw error;
    }

    const updated = await ChatRepository.togglePinMessage(messageId);

    try {
      EventBus.publishWorkspaceEvent(
        workspaceId,
        'chat.message.pinned',
        { messageId, conversationId: msg.conversationId, isPinned: updated?.isPinned },
        {
          actorId: userId,
          entityType: 'chat',
          entityId: msg.conversationId,
          meta: { conversationId: msg.conversationId, messageId },
        }
      );
    } catch {}

    return updated!;
  }

  /**
   * Get thread replies for a parent message
   */
  static async getThread(
    workspaceId: string,
    parentId: string,
    userId: string,
    rawRole: string = 'employee'
  ): Promise<{ parent: MessageEntity; replies: MessageEntity[] }> {
    const role = (rawRole || 'employee').toLowerCase();
    const parent = await ChatRepository.getMessageById(parentId);
    if (!parent || parent.workspaceId !== workspaceId) {
      const error: any = new Error('Message not found');
      error.status = 404;
      throw error;
    }

    // Check accessibility to conversation
    const isMember = await ChatRepository.isConversationMember(parent.conversationId, userId);
    if (!isMember && role !== 'admin') {
      const error: any = new Error('Access denied to this conversation thread.');
      error.status = 403;
      throw error;
    }

    const replies = await ChatRepository.listThreadReplies(parentId);
    return { parent, replies };
  }

  /**
   * Send a reply in a thread
   */
  static async replyThread(
    workspaceId: string,
    parentId: string,
    senderId: string,
    rawRole: string = 'employee',
    content: string
  ): Promise<MessageEntity> {
    const parent = await ChatRepository.getMessageById(parentId);
    if (!parent || parent.workspaceId !== workspaceId) {
      const error: any = new Error('Parent message not found');
      error.status = 404;
      throw error;
    }

    return await this.sendMessage(
      workspaceId,
      parent.conversationId,
      senderId,
      rawRole,
      content,
      { parentId }
    );
  }

  /**
   * Mark conversation as read and broadcast chat.read event
   */
  static async markConversationRead(
    workspaceId: string,
    conversationId: string,
    userId: string,
    lastReadMessageId?: string | null
  ): Promise<void> {
    await ChatRepository.markConversationRead(conversationId, userId, lastReadMessageId);

    try {
      EventBus.publishWorkspaceEvent(
        workspaceId,
        'chat.read',
        {
          conversationId,
          userId,
          lastReadMessageId: lastReadMessageId || null,
          readAt: new Date().toISOString(),
        },
        {
          actorId: userId,
          entityType: 'chat',
          entityId: conversationId,
          meta: { conversationId, userId },
        }
      );
    } catch {}
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
   * Broadcast ephemeral typing indicator (typing start / stop)
   */
  static async broadcastTyping(
    workspaceId: string,
    conversationId: string,
    userId: string,
    name?: string,
    isTyping: boolean = true
  ): Promise<void> {
    const userName = name || inMemoryDb.users.get(userId)?.name || 'User';
    try {
      const eventType = isTyping ? 'chat.typing.start' : 'chat.typing.stop';
      EventBus.publishWorkspaceEvent(
        workspaceId,
        eventType,
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

      // Backwards-compatible alias
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

  /**
   * Phase 2A: Convert a chat message into a task and link them
   */
  static async createMessageTask(
    workspaceId: string,
    messageId: string,
    userId: string,
    role: string,
    taskData: {
      title?: string;
      description?: string;
      projectId?: string;
      assignedTo?: string;
      priority?: string;
      dueDate?: string;
    }
  ): Promise<{ messageTask: any; task: any }> {
    // 1. Fetch message and verify existence
    const message = await ChatRepository.getMessageById(messageId);
    if (!message) {
      const error: any = new Error('Message not found.');
      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // 2. Multi-tenant isolation check
    if (message.workspaceId !== workspaceId) {
      const error: any = new Error('Message does not belong to the active workspace.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    // 3. Verify user membership in workspace
    let isMember = false;
    const db = getDb();
    if (db) {
      try {
        const dbMems = await db
          .select()
          .from(schema.workspaceMembers)
          .where(
            and(
              eq(schema.workspaceMembers.workspaceId, workspaceId),
              eq(schema.workspaceMembers.userId, userId)
            )
          )
          .limit(1);
        isMember = dbMems.length > 0;
      } catch {
        isMember = false;
      }
    }
    
    if (!isMember) {
      isMember = Array.from(inMemoryDb.workspaceMembers.values()).some(
        (wm) => wm.workspaceId === workspaceId && wm.userId === userId
      ) || inMemoryDb.workspaces.get(workspaceId)?.ownerId === userId;
    }

    if (!isMember) {
      const error: any = new Error('User is not a member of this workspace.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    // 4. Resolve projectId: if provided, validate; otherwise find or fallback to workspace project
    let projectId = taskData.projectId?.trim();
    if (!projectId) {
      const conv = await ChatRepository.getConversationById(workspaceId, message.conversationId);
      if (conv?.projectId) {
        projectId = conv.projectId;
      } else {
        const { ProjectRepository } = await import('../repositories/project-repository.js');
        const projects = await ProjectRepository.listProjects(workspaceId, userId, 'admin');
        if (projects.length > 0) {
          projectId = projects[0].id;
        } else {
          // Create default workspace initiative
          const defaultProject = await ProjectRepository.createProject({
            workspaceId,
            title: 'General Initiatives',
            description: 'Default project for workspace initiatives and tasks created from chat discussions.',
            createdBy: userId,
            status: 'in_progress',
            startDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
          projectId = defaultProject.id;
        }
      }
    }

    // 5. Derive Title and Description with auto-fill defaults
    const lines = message.content.split('\n').map((l) => l.trim()).filter(Boolean);
    const defaultTitle = lines[0] ? (lines[0].length > 80 ? lines[0].slice(0, 77) + '...' : lines[0]) : 'New Task from Message';
    const title = taskData.title?.trim() || defaultTitle;
    const defaultDescription = `> ${message.content.split('\n').join('\n> ')}\n\n*Created from chat message by ${message.sender?.name || 'team member'}*`;
    const description = taskData.description?.trim() || defaultDescription;

    // RBAC: Interns can only create tasks assigned to themselves
    const normalizedRole = (role || 'employee').toLowerCase();
    const assignedToInput = taskData.assignedTo?.trim();
    if (normalizedRole === 'intern' && assignedToInput && assignedToInput !== userId) {
      const error: any = new Error('Interns can only create tasks assigned to themselves.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const assignedTo = assignedToInput || userId;
    const priority = taskData.priority || 'medium';
    const dueDate = taskData.dueDate ? new Date(taskData.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 6. Create the task via TaskRepository with linkage fields
    const { TaskRepository } = await import('../repositories/task-repository.js');
    const task = await TaskRepository.createTask(workspaceId, userId, {
      title,
      description,
      projectId,
      assignedTo,
      priority,
      dueDate,
      status: 'todo',
      sourceMessageId: messageId,
      sourceConversationId: message.conversationId,
      linkedConversationId: message.conversationId,
      linkedMessageId: messageId,
    });

    // 7. Link message to task
    const messageTask = await ChatRepository.linkMessageToTask({
      workspaceId,
      messageId,
      taskId: task.id,
      createdBy: userId,
    });

    // 8. Realtime: Emit chat.task.created event
    try {
      EventBus.publishWorkspaceEvent(
        workspaceId,
        'chat.task.created',
        {
          workspaceId,
          messageId,
          taskId: task.id,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            assignedTo: task.assignedTo,
            linkedConversationId: message.conversationId,
            linkedMessageId: messageId,
          },
          createdBy: userId,
          createdAt: messageTask.createdAt,
        },
        {
          actorId: userId,
          entityType: 'task',
          entityId: task.id,
          meta: { messageId, taskId: task.id },
        }
      );
    } catch (err: any) {
      console.warn('[ChatService.createMessageTask] EventBus dispatch error:', err?.message);
    }

    return { messageTask, task };
  }

  /**
   * Execute a Slash Command from Chat
   * Supported commands:
   * /task <title> - Create task
   * /project <title> - Create project (Admin only)
   * /sop <title> - Create SOP wiki page (Admin & Employee)
   * /remind <text> - Schedule reminder notification
   * /poll <question> - Create interactive poll in chat
   */
  static async executeSlashCommand(
    workspaceId: string,
    conversationId: string,
    userId: string,
    rawRole: string = 'employee',
    rawInput: string
  ): Promise<{
    command: string;
    args: string;
    result: any;
    message?: MessageEntity;
  }> {
    const role = (rawRole || 'employee').toLowerCase();
    const trimmed = rawInput.trim();
    if (!trimmed.startsWith('/')) {
      const error: any = new Error('Invalid slash command format.');
      error.status = 400;
      throw error;
    }

    // Parse command and argument tokens
    const match = trimmed.match(/^\/([a-zA-Z0-9_-]+)(?:\s+([\s\S]*))?$/);
    if (!match) {
      const error: any = new Error('Invalid slash command syntax.');
      error.status = 400;
      throw error;
    }

    // Verify conversation existence and workspace isolation
    const globalConv = await ChatRepository.getConversationById('', conversationId);
    if (!globalConv) {
      const error: any = new Error('Conversation not found.');
      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }
    if (globalConv.workspaceId !== workspaceId) {
      const error: any = new Error('Forbidden: Conversation does not belong to active workspace.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const rawCommand = match[1].toLowerCase();
    const commandName = `/${rawCommand}`;
    const args = (match[2] || '').trim();

    const senderUser = inMemoryDb.users.get(userId);
    const senderName = senderUser?.name || 'A team member';

    let executionResult: any = null;
    let notificationText = '';
    let chatMessageContent = '';

    switch (rawCommand) {
      case 'task': {
        // Interns cannot create tasks
        if (role === 'intern') {
          const error: any = new Error('Forbidden: Interns are restricted from creating tasks.');
          error.status = 403;
          throw error;
        }

        if (!args) {
          const error: any = new Error('Usage: /task <task title>');
          error.status = 400;
          throw error;
        }

        // Auto-detect or resolve active project for workspace
        let projectId: string | undefined;
        for (const p of inMemoryDb.projects.values()) {
          if (p.workspaceId === workspaceId && !p.isArchived) {
            projectId = p.id;
            break;
          }
        }
        if (!projectId) {
          // Check DB
          const db = getDb();
          if (db) {
            try {
              const rows = await db
                .select({ id: schema.projects.id })
                .from(schema.projects)
                .where(eq(schema.projects.workspaceId, workspaceId))
                .limit(1);
              if (rows.length > 0) projectId = rows[0].id;
            } catch {}
          }
        }
        if (!projectId) {
          // Auto-create default general project if none exists
          const { ProjectRepository } = await import('../repositories/project-repository.js');
          const defaultProj = await ProjectRepository.createProject({
            workspaceId,
            createdBy: userId,
            title: 'General Operations',
            description: 'Workspace Operations & Tasks',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
          projectId = defaultProj.id;
        }

        const { TaskRepository } = await import('../repositories/task-repository.js');
        const task = await TaskRepository.createTask(workspaceId, userId, {
          title: args,
          description: `Created via slash command /task in chat by ${senderName}`,
          projectId,
          assignedTo: userId,
          priority: 'medium',
          status: 'todo',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        executionResult = { task, taskId: task.id, title: task.title };
        chatMessageContent = `📋 **Task Created**: [${task.title}](/tasks) (Assigned to @${senderName})`;
        break;
      }

      case 'project': {
        // Only Admins can create projects
        if (role !== 'admin') {
          const error: any = new Error('Forbidden: Only workspace Administrators can create projects.');
          error.status = 403;
          throw error;
        }

        if (!args) {
          const error: any = new Error('Usage: /project <project title>');
          error.status = 400;
          throw error;
        }

        const { ProjectRepository } = await import('../repositories/project-repository.js');
        const project = await ProjectRepository.createProject({
          workspaceId,
          createdBy: userId,
          title: args,
          description: `Initiative created via /project command by ${senderName}`,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        executionResult = { project, projectId: project.id, title: project.title };
        chatMessageContent = `🚀 **New Project Initiated**: [${project.title}](/projects/${project.id}) by @${senderName}`;
        break;
      }

      case 'sop': {
        // Interns cannot create SOP documents
        if (role === 'intern') {
          const error: any = new Error('Forbidden: Interns cannot create standard operating procedures.');
          error.status = 403;
          throw error;
        }

        if (!args) {
          const error: any = new Error('Usage: /sop <document title>');
          error.status = 400;
          throw error;
        }

        const { WikiRepository } = await import('../repositories/wiki-repository.js');
        const sopPage = await WikiRepository.createPage({
          workspaceId,
          createdBy: userId,
          title: args,
          icon: '📄',
          visibility: 'workspace',
          contentJson: {
            blocks: [
              { id: 'b1', type: 'heading', content: `# ${args}` },
              { id: 'b2', type: 'paragraph', content: `Standard Operating Procedure drafted via chat slash command by ${senderName}.` },
              { id: 'b3', type: 'heading', content: '## 1. Objective' },
              { id: 'b4', type: 'paragraph', content: 'Define purpose and deliverables.' },
            ],
          },
        });

        executionResult = { page: sopPage, pageId: sopPage.id, title: sopPage.title };
        chatMessageContent = `📄 **SOP Created**: [${sopPage.title}](/docs/${sopPage.id}) (Drafted by @${senderName})`;
        break;
      }

      case 'remind': {
        if (!args) {
          const error: any = new Error('Usage: /remind <reminder text>');
          error.status = 400;
          throw error;
        }

        // Dispatch instant notification & reminder
        const notification = await NotificationService.createNotification({
          workspaceId,
          recipientId: userId,
          actorId: userId,
          type: 'mention_received',
          title: 'Chat Reminder',
          message: args,
          priority: 'urgent',
          link: `/chat?conversationId=${conversationId}`,
          entityType: 'chat',
          entityId: conversationId,
          metadata: { conversationId, source: 'slash_command' },
        });

        executionResult = {
          reminder: args,
          notification,
          notificationId: notification?.id || `remind-${Date.now()}`,
        };
        chatMessageContent = `⏰ **Reminder Set**: "${args}" for @${senderName}`;
        break;
      }

      case 'poll': {
        if (!args) {
          const error: any = new Error('Usage: /poll <poll question>');
          error.status = 400;
          throw error;
        }

        const pollId = `poll-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const poll = {
          id: pollId,
          workspaceId,
          conversationId,
          question: args,
          options: [
            { id: 'opt-yes', label: 'Yes / Approve', votes: [] },
            { id: 'opt-no', label: 'No / Reject', votes: [] },
          ],
          createdBy: userId,
          createdAt: new Date().toISOString(),
        };

        inMemoryDb.chatPolls.set(pollId, poll);
        executionResult = {
          poll,
          pollId: poll.id,
          question: poll.question,
          options: poll.options,
        };
        chatMessageContent = `📊 **Poll**: ${args}\n• Option A: Yes / Approve\n• Option B: No / Reject\n*(React with 👍 for Yes, 👎 for No)*`;
        break;
      }

      default: {
        const error: any = new Error(
          `Unknown slash command '${commandName}'. Available commands: /task, /project, /sop, /remind, /poll`
        );
        error.status = 400;
        throw error;
      }
    }

    // Post the result message into the conversation
    const message = await ChatRepository.createMessage({
      conversationId,
      workspaceId,
      senderId: userId,
      content: chatMessageContent,
      parentId: null,
      attachments: [],
      mentions: [],
    });

    // Store execution history in chat_slash_commands
    const executionId = crypto.randomUUID();
    const commandRecord = {
      id: executionId,
      workspaceId,
      conversationId,
      userId,
      command: commandName,
      rawInput: trimmed,
      args,
      result: executionResult,
      createdAt: new Date(),
    };

    inMemoryDb.chatSlashCommands.set(executionId, commandRecord);

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.chatSlashCommands).values({
          id: executionId,
          workspaceId,
          conversationId,
          userId,
          command: commandName,
          rawInput: trimmed,
          args,
          result: executionResult,
          createdAt: commandRecord.createdAt,
        });
      } catch (dbErr: any) {
        console.warn('[ChatService.executeSlashCommand] DB insert warning:', dbErr.message);
      }
    }

    // Realtime broadcast for slash command execution & chat message
    try {
      EventBus.publishWorkspaceEvent(
        workspaceId,
        'chat.slash_command.executed',
        {
          command: commandName,
          rawInput: trimmed,
          args,
          result: executionResult,
          message,
          userId,
        },
        {
          actorId: userId,
          entityType: 'chat',
          entityId: conversationId,
          meta: { command: commandName, messageId: message.id },
        }
      );
      EventBus.publishWorkspaceEvent(
        workspaceId,
        'chat.message.created',
        {
          workspaceId,
          conversationId,
          messageId: message.id,
          senderId: userId,
          createdAt: message.createdAt,
          message,
        },
        {
          actorId: userId,
          entityType: 'chat',
          entityId: conversationId,
        }
      );
    } catch {}

    return {
      command: commandName,
      args,
      result: executionResult,
      message,
    };
  }

  /**
   * Get slash command execution history for conversation or workspace
   */
  static async getSlashCommandHistory(
    workspaceId: string,
    conversationId?: string
  ): Promise<any[]> {
    const list: any[] = [];
    for (const record of inMemoryDb.chatSlashCommands.values()) {
      if (record.workspaceId === workspaceId) {
        if (!conversationId || record.conversationId === conversationId) {
          list.push({ ...record });
        }
      }
    }

    if (list.length > 0) return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const db = getDb();
    if (db) {
      try {
        const query = conversationId
          ? and(eq(schema.chatSlashCommands.workspaceId, workspaceId), eq(schema.chatSlashCommands.conversationId, conversationId))
          : eq(schema.chatSlashCommands.workspaceId, workspaceId);

        const rows = await db
          .select()
          .from(schema.chatSlashCommands)
          .where(query)
          .orderBy(desc(schema.chatSlashCommands.createdAt));
        return rows;
      } catch {}
    }

    return list;
  }

  /**
   * Phase 2D: Get operational context for conversation
   */
  static async getConversationContext(
    workspaceId: string,
    conversationId: string,
    userId: string,
    userRole: string
  ): Promise<any> {
    const conv = await ChatRepository.getConversationById(workspaceId, conversationId);
    if (!conv) {
      const err: any = new Error('Conversation not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Verify membership or access
    const isMember = await ChatRepository.isConversationMember(conversationId, userId);
    if (!isMember && conv.type === 'dm') {
      const err: any = new Error('Access denied to direct message.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Fetch existing context
    let contextEntity = await ChatRepository.getConversationContext(conversationId);

    // Fallback: If no context record exists yet, initialize or infer from conversation
    let projectId = contextEntity?.projectId || conv.projectId || null;
    let departmentId = contextEntity?.departmentId || conv.departmentId || null;
    let teamId = contextEntity?.teamId || null;

    // Load Project details & Open Tasks Count
    let project: any = null;
    let openTasks = 0;
    if (projectId) {
      const memProj = inMemoryDb.projects.get(projectId);
      if (memProj && memProj.workspaceId === workspaceId) {
        project = {
          id: memProj.id,
          title: memProj.title,
          status: memProj.status,
          progress: memProj.progress,
        };
      } else {
        const db = getDb();
        if (db) {
          try {
            const [pRow] = await db
              .select()
              .from(schema.projects)
              .where(and(eq(schema.projects.id, projectId), eq(schema.projects.workspaceId, workspaceId)));
            if (pRow) {
              project = {
                id: pRow.id,
                title: pRow.title,
                status: pRow.status,
                progress: pRow.progress,
              };
            }
          } catch {}
        }
      }

      // Count open tasks for this project
      for (const t of inMemoryDb.tasks.values()) {
        const wsMatch = t.workspaceId === workspaceId || !t.workspaceId;
        if (wsMatch && t.projectId === projectId) {
          if (t.status !== 'done' && t.status !== 'completed') {
            openTasks++;
          }
        }
      }

      if (openTasks === 0) {
        const db = getDb();
        if (db) {
          try {
            const tRows = await db
              .select()
              .from(schema.tasks)
              .where(
                and(
                  eq(schema.tasks.projectId, projectId),
                  eq(schema.tasks.workspaceId, workspaceId)
                )
              );
            openTasks = tRows.filter((t) => t.status !== 'done' && t.status !== 'completed').length;
          } catch {}
        }
      }
    } else {
      // General workspace open tasks count as fallback
      for (const t of inMemoryDb.tasks.values()) {
        if ((t.workspaceId === workspaceId || !t.workspaceId) && t.status !== 'done' && t.status !== 'completed') {
          openTasks++;
        }
      }
    }

    // Members count: count of conversation members (fallback: project members or workspace members)
    const membersList = await ChatRepository.getConversationMembers(conversationId);
    let members = membersList.length;
    if (members === 0 && projectId) {
      for (const pm of inMemoryDb.projectMembers.values()) {
        if (pm.projectId === projectId) members++;
      }
    }
    if (members === 0) {
      for (const wm of inMemoryDb.workspaceMembers.values()) {
        if (wm.workspaceId === workspaceId) members++;
      }
    }

    // Active SOPs count
    let activeSops = 0;
    for (const w of inMemoryDb.wikiPages.values()) {
      if (w.workspaceId === workspaceId) {
        // Count all SOPs / knowledge pages in workspace or department
        if (!departmentId || !w.departmentId || w.departmentId === departmentId) {
          activeSops++;
        }
      }
    }
    if (activeSops === 0) {
      // Check documents
      for (const d of inMemoryDb.documents.values()) {
        if (d.workspaceId === workspaceId) {
          if (d.category?.toLowerCase().includes('sop') || d.title?.toLowerCase().includes('sop')) {
            activeSops++;
          }
        }
      }
    }

    return {
      context: {
        id: contextEntity?.id || null,
        conversationId,
        workspaceId,
        projectId,
        departmentId,
        teamId,
      },
      operational: {
        project: project || (projectId ? { id: projectId, title: 'Project Initiative', status: 'in_progress' } : null),
        openTasks,
        members: Math.max(members, 1),
        activeSops: Math.max(activeSops, 0),
        departmentId,
        teamId,
      },
    };
  }

  /**
   * Phase 2D: Update operational context for conversation
   */
  static async updateConversationContext(
    workspaceId: string,
    conversationId: string,
    userId: string,
    userRole: string,
    data: {
      projectId?: string | null;
      departmentId?: string | null;
      teamId?: string | null;
    }
  ): Promise<any> {
    // RBAC: Admin & Employee allowed; Intern denied (403)
    if (userRole === 'intern') {
      const err: any = new Error('Interns cannot modify conversation context.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const conv = await ChatRepository.getConversationById(workspaceId, conversationId);
    if (!conv) {
      const err: any = new Error('Conversation not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Validate project if provided
    if (data.projectId) {
      const memProj = inMemoryDb.projects.get(data.projectId);
      if (memProj && memProj.workspaceId !== workspaceId) {
        const err: any = new Error('Referenced project does not exist in workspace.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
    }

    const updatedContext = await ChatRepository.upsertConversationContext({
      conversationId,
      workspaceId,
      projectId: data.projectId,
      departmentId: data.departmentId,
      teamId: data.teamId,
    });

    // Also link to conversation entity if projectId or departmentId specified
    if (data.projectId !== undefined || data.departmentId !== undefined) {
      const memConv = inMemoryDb.conversations.get(conversationId);
      if (memConv) {
        if (data.projectId !== undefined) memConv.projectId = data.projectId;
        if (data.departmentId !== undefined) memConv.departmentId = data.departmentId;
      }
    }

    // Realtime notification
    try {
      EventBus.publishWorkspaceEvent(
        workspaceId,
        'chat.context.updated',
        {
          conversationId,
          context: updatedContext,
          updatedBy: userId,
        },
        {
          actorId: userId,
          entityType: 'chat',
          entityId: conversationId,
        }
      );
    } catch {}

    return await this.getConversationContext(workspaceId, conversationId, userId, userRole);
  }

  /**
   * Phase 2E: Get operational activity timeline for conversation
   */
  static async getConversationTimeline(
    workspaceId: string,
    conversationId: string,
    userId: string,
    userRole: string,
    limit = 50
  ) {
    const conv = await ChatRepository.getConversationById(workspaceId, conversationId);
    if (!conv) {
      const err: any = new Error('Conversation not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Authorization check
    if (conv.type === 'dm' || conv.type === 'group') {
      const members = await ChatRepository.getConversationMembers(conversationId);
      const isMember = members.some((m) => m.userId === userId);
      if (!isMember && userRole !== 'admin') {
        const err: any = new Error('Access denied to conversation timeline.');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    // Get linked context
    const context = await ChatRepository.getConversationContext(conversationId);
    const projectId = context?.projectId || conv.projectId || null;

    const { ActivityAggregationService } = await import('./activity-aggregation-service.js');
    const timeline = await ActivityAggregationService.getConversationTimeline(
      workspaceId,
      conversationId,
      projectId,
      limit
    );

    return {
      conversationId,
      projectId,
      timeline,
    };
  }

  // =========================================================================
  // Phase 2F: Saved Messages Methods
  // =========================================================================

  /**
   * Save a message for a user
   */
  static async saveMessage(workspaceId: string, messageId: string, userId: string) {
    const msg = await ChatRepository.getMessageById(messageId);
    if (!msg) {
      const err: any = new Error('Message not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Verify conversation access
    const conv = await ChatRepository.getConversationById(workspaceId, msg.conversationId);
    if (!conv) {
      const err: any = new Error('Conversation not found in workspace.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (conv.type === 'dm' || conv.type === 'group') {
      const members = await ChatRepository.getConversationMembers(msg.conversationId);
      const isMember = members.some((m) => m.userId === userId);
      if (!isMember) {
        const err: any = new Error('Access denied to save message from this conversation.');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    const saved = await ChatRepository.saveMessage(workspaceId, userId, messageId);
    return {
      success: true,
      saved,
    };
  }

  /**
   * Remove a saved message for a user
   */
  static async unsaveMessage(workspaceId: string, messageId: string, userId: string) {
    await ChatRepository.unsaveMessage(workspaceId, userId, messageId);
    return {
      success: true,
      message: 'Message unsaved successfully.',
    };
  }

  /**
   * Get all saved messages for a user
   */
  static async getSavedMessages(workspaceId: string, userId: string) {
    const savedMessages = await ChatRepository.getSavedMessages(workspaceId, userId);
    return {
      savedMessages,
    };
  }

  // =========================================================================
  // Phase 2G: Announcement Acknowledgements Service Methods
  // =========================================================================

  /**
   * Acknowledge an announcement
   */
  static async acknowledgeAnnouncement(workspaceId: string, announcementId: string, userId: string) {
    // 1. Verify message exists
    const message = await ChatRepository.getMessageById(announcementId);
    if (!message || message.workspaceId !== workspaceId) {
      const error: any = new Error('Announcement message not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // 2. Verify conversation is an announcement channel
    const conv = await ChatRepository.getConversationById(workspaceId, message.conversationId);
    if (!conv || conv.type !== 'announcement') {
      const error: any = new Error('Message does not belong to an announcement channel.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // 3. Check if already acknowledged (idempotent handling)
    const alreadyAck = await ChatRepository.hasUserAcknowledged(workspaceId, announcementId, userId);
    let ackRecord: any = null;
    if (!alreadyAck) {
      ackRecord = await ChatRepository.acknowledgeAnnouncement(workspaceId, announcementId, userId);

      // Publish event for real-time delivery
      EventBus.publishWorkspaceEvent(workspaceId, 'chat.announcement.acknowledged', {
        announcementId,
        userId,
        acknowledgedAt: ackRecord.acknowledgedAt,
      });
    }

    // 4. Return acknowledgement and stats
    const stats = await ChatRepository.getAnnouncementStats(workspaceId, announcementId, userId);
    return {
      success: true,
      acknowledged: true,
      ackRecord,
      stats,
    };
  }

  /**
   * Get announcement acknowledgement stats and audit report
   */
  static async getAnnouncementStats(workspaceId: string, announcementId: string, userId: string, role: string) {
    const message = await ChatRepository.getMessageById(announcementId);
    if (!message || message.workspaceId !== workspaceId) {
      const error: any = new Error('Announcement message not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const conv = await ChatRepository.getConversationById(workspaceId, message.conversationId);
    if (!conv || conv.type !== 'announcement') {
      const error: any = new Error('Message does not belong to an announcement channel.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const stats = await ChatRepository.getAnnouncementStats(workspaceId, announcementId, userId);
    return {
      success: true,
      ...stats,
    };
  }
}
