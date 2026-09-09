import { eq, and, desc, asc, inArray, gt } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';

export interface ConversationEntity {
  id: string;
  workspaceId: string;
  type: 'dm' | 'channel' | 'group' | 'department' | 'project' | 'announcement';
  title: string | null;
  description: string | null;
  departmentId: string | null;
  projectId: string | null;
  createdById: string;
  isArchived: boolean;
  lastMessageAt: Date | null;
  unreadCount?: number;
  hasUnreadMention?: boolean;
  members?: ConversationMemberEntity[];
  lastMessage?: MessageEntity | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationReadEntity {
  id: string;
  conversationId: string;
  userId: string;
  lastReadMessageId: string | null;
  lastReadAt: Date;
}

export interface ConversationMemberEntity {
  id: string;
  conversationId: string;
  workspaceId: string;
  userId: string;
  role: 'admin' | 'member';
  lastReadAt: Date | null;
  joinedAt: Date;
  user?: { id: string; name: string; email: string; avatar?: string | null; role: string } | null;
}

export interface MessageReactionEntity {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface MessageTaskEntity {
  id: string;
  workspaceId: string;
  messageId: string;
  taskId: string;
  createdBy: string;
  createdAt: Date;
  task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  } | null;
}

export interface MessageMentionEntity {
  id: string;
  workspaceId: string;
  messageId: string;
  mentionedUserId: string;
  mentionType: string;
  createdAt: Date;
  mentionedUser?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role: string;
  } | null;
}

export interface MessageEntity {
  id: string;
  conversationId: string;
  workspaceId: string;
  senderId: string;
  content: string;
  parentId?: string | null;
  isPinned: boolean;
  attachments?: ChatAttachment[];
  mentions: string[];
  isEdited: boolean;
  isDeleted: boolean;
  reactions?: MessageReactionEntity[];
  replyCount?: number;
  linkedTasks?: MessageTaskEntity[];
  sender?: { id: string; name: string; email: string; avatar?: string | null; role: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ChatRepository {
  /**
   * Helper to resolve user details
   */
  private static getUserDetails(userId: string) {
    const memUser = inMemoryDb.users.get(userId);
    if (memUser) {
      return {
        id: memUser.id,
        name: memUser.name,
        email: memUser.email,
        avatar: memUser.avatar || null,
        role: memUser.role,
      };
    }
    return null;
  }

  /**
   * Create a conversation
   */
  static async createConversation(data: {
    workspaceId: string;
    type: 'dm' | 'channel' | 'group' | 'department' | 'project' | 'announcement';
    title?: string | null;
    description?: string | null;
    departmentId?: string | null;
    projectId?: string | null;
    createdById: string;
  }): Promise<ConversationEntity> {
    const id = crypto.randomUUID();
    const now = new Date();

    const record: ConversationEntity = {
      id,
      workspaceId: data.workspaceId,
      type: data.type,
      title: data.title || null,
      description: data.description || null,
      departmentId: data.departmentId || null,
      projectId: data.projectId || null,
      createdById: data.createdById,
      isArchived: false,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryDb.conversations.set(id, record);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.conversations).values({
          id,
          workspaceId: record.workspaceId,
          type: record.type,
          title: record.title,
          description: record.description,
          departmentId: record.departmentId,
          projectId: record.projectId,
          createdById: record.createdById,
          isArchived: record.isArchived,
          lastMessageAt: record.lastMessageAt,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      }
    } catch (err: any) {
      console.warn('[ChatRepository.createConversation] DB insert error:', err.message);
    }

    return record;
  }

  /**
   * Get conversation by ID
   */
  static async getConversationById(
    workspaceId: string,
    conversationId: string
  ): Promise<ConversationEntity | null> {
    // In-memory lookup
    const inMem = inMemoryDb.conversations.get(conversationId);
    if (inMem && (!workspaceId || inMem.workspaceId === workspaceId)) {
      return { ...inMem };
    }

    try {
      const db = getDb();
      if (db) {
        const query = workspaceId
          ? and(eq(schema.conversations.id, conversationId), eq(schema.conversations.workspaceId, workspaceId))
          : eq(schema.conversations.id, conversationId);
        const [row] = await db.select().from(schema.conversations).where(query);
        if (row) {
          return {
            id: row.id,
            workspaceId: row.workspaceId,
            type: row.type as any,
            title: row.title,
            description: row.description,
            departmentId: row.departmentId,
            projectId: row.projectId,
            createdById: row.createdById,
            isArchived: row.isArchived,
            lastMessageAt: row.lastMessageAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          };
        }
      }
    } catch (err: any) {
      console.warn('[ChatRepository.getConversationById] DB error:', err.message);
    }

    return null;
  }

  /**
   * Find existing DM conversation between two users
   */
  static async findDmConversation(
    workspaceId: string,
    userAId: string,
    userBId: string
  ): Promise<ConversationEntity | null> {
    // In-memory lookup
    for (const conv of inMemoryDb.conversations.values()) {
      if (conv.workspaceId === workspaceId && conv.type === 'dm' && !conv.isArchived) {
        const members = Array.from(inMemoryDb.conversationMembers.values()).filter(
          (m: any) => m.conversationId === conv.id
        );
        const memberIds = members.map((m: any) => m.userId);
        if (memberIds.includes(userAId) && memberIds.includes(userBId)) {
          return { ...conv };
        }
      }
    }

    try {
      const db = getDb();
      if (db) {
        const dms = await db
          .select()
          .from(schema.conversations)
          .where(and(eq(schema.conversations.workspaceId, workspaceId), eq(schema.conversations.type, 'dm')));

        for (const conv of dms) {
          const members = await db
            .select()
            .from(schema.conversationMembers)
            .where(eq(schema.conversationMembers.conversationId, conv.id));
          const mIds = members.map((m) => m.userId);
          if (mIds.includes(userAId) && mIds.includes(userBId)) {
            return conv as any;
          }
        }
      }
    } catch (err: any) {
      console.warn('[ChatRepository.findDmConversation] DB error:', err.message);
    }

    return null;
  }

  /**
   * Find department conversation
   */
  static async findDepartmentConversation(
    workspaceId: string,
    departmentId: string
  ): Promise<ConversationEntity | null> {
    for (const conv of inMemoryDb.conversations.values()) {
      if (conv.workspaceId === workspaceId && conv.type === 'department' && conv.departmentId === departmentId) {
        return { ...conv };
      }
    }

    try {
      const db = getDb();
      if (db) {
        const [row] = await db
          .select()
          .from(schema.conversations)
          .where(
            and(
              eq(schema.conversations.workspaceId, workspaceId),
              eq(schema.conversations.type, 'department'),
              eq(schema.conversations.departmentId, departmentId)
            )
          );
        if (row) return row as any;
      }
    } catch (err: any) {
      console.warn('[ChatRepository.findDepartmentConversation] DB error:', err.message);
    }

    return null;
  }

  /**
   * Find project conversation
   */
  static async findProjectConversation(
    workspaceId: string,
    projectId: string
  ): Promise<ConversationEntity | null> {
    for (const conv of inMemoryDb.conversations.values()) {
      if (conv.workspaceId === workspaceId && conv.type === 'project' && conv.projectId === projectId) {
        return { ...conv };
      }
    }

    try {
      const db = getDb();
      if (db) {
        const [row] = await db
          .select()
          .from(schema.conversations)
          .where(
            and(
              eq(schema.conversations.workspaceId, workspaceId),
              eq(schema.conversations.type, 'project'),
              eq(schema.conversations.projectId, projectId)
            )
          );
        if (row) return row as any;
      }
    } catch (err: any) {
      console.warn('[ChatRepository.findProjectConversation] DB error:', err.message);
    }

    return null;
  }

  /**
   * Find default announcement conversation
   */
  static async findAnnouncementConversation(workspaceId: string): Promise<ConversationEntity | null> {
    for (const conv of inMemoryDb.conversations.values()) {
      if (conv.workspaceId === workspaceId && conv.type === 'announcement') {
        return { ...conv };
      }
    }

    try {
      const db = getDb();
      if (db) {
        const [row] = await db
          .select()
          .from(schema.conversations)
          .where(
            and(eq(schema.conversations.workspaceId, workspaceId), eq(schema.conversations.type, 'announcement'))
          );
        if (row) return row as any;
      }
    } catch (err: any) {
      console.warn('[ChatRepository.findAnnouncementConversation] DB error:', err.message);
    }

    return null;
  }

  /**
   * Add member to conversation
   */
  static async addConversationMember(data: {
    conversationId: string;
    workspaceId: string;
    userId: string;
    role?: 'admin' | 'member';
  }): Promise<ConversationMemberEntity> {
    // Check if already member
    for (const m of inMemoryDb.conversationMembers.values()) {
      if (m.conversationId === data.conversationId && m.userId === data.userId) {
        return m;
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const member: ConversationMemberEntity = {
      id,
      conversationId: data.conversationId,
      workspaceId: data.workspaceId,
      userId: data.userId,
      role: data.role || 'member',
      lastReadAt: now,
      joinedAt: now,
      user: this.getUserDetails(data.userId),
    };

    inMemoryDb.conversationMembers.set(id, member);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.conversationMembers).values({
          id,
          conversationId: member.conversationId,
          workspaceId: member.workspaceId,
          userId: member.userId,
          role: member.role,
          lastReadAt: member.lastReadAt,
          joinedAt: member.joinedAt,
        });
      }
    } catch (err: any) {
      // Ignored if duplicate
    }

    return member;
  }

  /**
   * Batch add conversation members
   */
  static async addConversationMembers(
    conversationId: string,
    workspaceId: string,
    userIds: string[],
    role: 'admin' | 'member' = 'member'
  ): Promise<void> {
    const uniqueIds = Array.from(new Set(userIds));
    for (const userId of uniqueIds) {
      await this.addConversationMember({ conversationId, workspaceId, userId, role });
    }
  }

  /**
   * Get members of a conversation
   */
  static async getConversationMembers(conversationId: string): Promise<ConversationMemberEntity[]> {
    const inMem = Array.from(inMemoryDb.conversationMembers.values()).filter(
      (m: any) => m.conversationId === conversationId
    );

    if (inMem.length > 0) {
      return inMem.map((m) => ({
        ...m,
        user: this.getUserDetails(m.userId),
      }));
    }

    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.conversationMembers)
          .where(eq(schema.conversationMembers.conversationId, conversationId));

        if (rows.length > 0) {
          const userIds = rows.map((r) => r.userId);
          const users = await db.select().from(schema.users).where(inArray(schema.users.id, userIds));
          const userMap = new Map(users.map((u) => [u.id, u]));

          return rows.map((r) => {
            const u = userMap.get(r.userId);
            return {
              id: r.id,
              conversationId: r.conversationId,
              workspaceId: r.workspaceId,
              userId: r.userId,
              role: r.role as any,
              lastReadAt: r.lastReadAt,
              joinedAt: r.joinedAt,
              user: u
                ? {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    avatar: u.avatar || null,
                    role: u.role,
                  }
                : null,
            };
          });
        }
      }
    } catch (err: any) {
      console.warn('[ChatRepository.getConversationMembers] DB error:', err.message);
    }

    return [];
  }

  /**
   * Check if user is a member of conversation
   */
  static async isConversationMember(conversationId: string, userId: string): Promise<boolean> {
    for (const m of inMemoryDb.conversationMembers.values()) {
      if (m.conversationId === conversationId && m.userId === userId) {
        return true;
      }
    }

    try {
      const db = getDb();
      if (db) {
        const [row] = await db
          .select({ id: schema.conversationMembers.id })
          .from(schema.conversationMembers)
          .where(
            and(
              eq(schema.conversationMembers.conversationId, conversationId),
              eq(schema.conversationMembers.userId, userId)
            )
          )
          .limit(1);
        if (row) return true;
      }
    } catch (err: any) {
      console.warn('[ChatRepository.isConversationMember] DB error:', err.message);
    }

    return false;
  }

  /**
   * Check if conversation contains unread mentions for a specific user
   */
  static async hasUnreadMention(conversationId: string, userId: string): Promise<boolean> {
    const memUser = inMemoryDb.users.get(userId);
    if (!memUser) return false;
    const userName = (memUser.name || '').toLowerCase();
    const firstName = ((memUser.name || '').split(' ')[0] || '').toLowerCase();
    const emailPrefix = ((memUser.email || '').split('@')[0] || '').toLowerCase();

    let userDeptName = '';
    for (const p of inMemoryDb.employeeProfiles.values()) {
      if (p.userId === userId && p.departmentId) {
        const dept = inMemoryDb.departments.get(p.departmentId);
        if (dept) userDeptName = (dept.name || '').toLowerCase();
        break;
      }
    }

    let lastRead: Date = new Date(0);
    for (const r of inMemoryDb.conversationReads.values()) {
      if (r.conversationId === conversationId && r.userId === userId) {
        if (r.lastReadAt) lastRead = new Date(r.lastReadAt);
        break;
      }
    }
    if (lastRead.getTime() === 0) {
      for (const m of inMemoryDb.conversationMembers.values()) {
        if (m.conversationId === conversationId && m.userId === userId) {
          if (m.lastReadAt) lastRead = new Date(m.lastReadAt);
          break;
        }
      }
    }

    const unreadMsgs = Array.from(inMemoryDb.messages.values()).filter(
      (m: any) =>
        m.conversationId === conversationId &&
        m.senderId !== userId &&
        !m.isDeleted &&
        new Date(m.createdAt) > lastRead
    );

    for (const msg of unreadMsgs) {
      const content = (msg.content || '').toLowerCase();
      const mentions = ((msg.mentions as string[]) || []).map((m: string) => m.toLowerCase());
      if (
        mentions.some(
          (m) =>
            m.includes(userName) ||
            m.includes(firstName) ||
            m.includes(emailPrefix) ||
            (userDeptName && m.includes(userDeptName))
        ) ||
        (userName && content.includes(`@${userName}`)) ||
        (firstName && content.includes(`@${firstName}`)) ||
        (emailPrefix && content.includes(`@${emailPrefix}`)) ||
        (userDeptName && content.includes(`@${userDeptName}`))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * List all conversations accessible by a user in workspace
   */
  static async listUserConversations(
    workspaceId: string,
    userId: string,
    userRole: string = 'employee',
    filter?: 'all' | 'unread' | 'mentions'
  ): Promise<ConversationEntity[]> {
    const isAdmin = userRole === 'admin';
    let accessibleConversations: ConversationEntity[] = [];

    // Collect all in-memory conversations in workspace
    const allConvs = Array.from(inMemoryDb.conversations.values()).filter(
      (c: any) => c.workspaceId === workspaceId && !c.isArchived
    );

    for (const conv of allConvs) {
      const isMember = await this.isConversationMember(conv.id, userId);

      // Visibility Rules:
      // 1. Announcements: visible to all workspace members
      // 2. Department & Project: visible to members OR admin
      // 3. DM: visible strictly to DM members
      let canAccess = false;
      if (conv.type === 'announcement') {
        canAccess = true;
      } else if (conv.type === 'dm') {
        canAccess = isMember;
      } else {
        canAccess = isMember || isAdmin;
      }

      if (canAccess) {
        const members = await this.getConversationMembers(conv.id);
        const lastMsg = await this.getLatestMessage(conv.id);
        const unreadCount = await this.getUnreadCountForConversation(conv.id, userId);
        const hasUnread = await this.hasUnreadMention(conv.id, userId);

        accessibleConversations.push({
          ...conv,
          members,
          lastMessage: lastMsg,
          unreadCount,
          hasUnreadMention: hasUnread,
        });
      }
    }

    // Apply Filter Tab if specified
    if (filter === 'unread') {
      accessibleConversations = accessibleConversations.filter((c) => (c.unreadCount || 0) > 0);
    } else if (filter === 'mentions') {
      accessibleConversations = accessibleConversations.filter((c) => !!c.hasUnreadMention);
    }

    // Sort by lastMessageAt desc
    accessibleConversations.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return accessibleConversations;
  }

  /**
   * Create message in conversation
   */
  static async createMessage(data: {
    conversationId: string;
    workspaceId: string;
    senderId: string;
    content: string;
    parentId?: string | null;
    isPinned?: boolean;
    attachments?: ChatAttachment[];
    mentions?: string[];
  }): Promise<MessageEntity> {
    const id = crypto.randomUUID();
    let msgDate = new Date();

    // Monotonic timestamp progression: ensure strictly greater than latest message and read records
    for (const m of inMemoryDb.messages.values()) {
      if (m.conversationId === data.conversationId) {
        const t = new Date(m.createdAt).getTime();
        if (t >= msgDate.getTime()) {
          msgDate = new Date(t + 1);
        }
      }
    }
    for (const r of inMemoryDb.conversationReads.values()) {
      if (r.conversationId === data.conversationId) {
        const t = new Date(r.lastReadAt).getTime();
        if (t >= msgDate.getTime()) {
          msgDate = new Date(t + 1);
        }
      }
    }
    for (const cm of inMemoryDb.conversationMembers.values()) {
      if (cm.conversationId === data.conversationId && cm.lastReadAt) {
        const t = new Date(cm.lastReadAt).getTime();
        if (t >= msgDate.getTime()) {
          msgDate = new Date(t + 1);
        }
      }
    }

    const now = msgDate;

    const record: MessageEntity = {
      id,
      conversationId: data.conversationId,
      workspaceId: data.workspaceId,
      senderId: data.senderId,
      content: data.content,
      parentId: data.parentId || null,
      isPinned: data.isPinned || false,
      attachments: data.attachments || [],
      mentions: data.mentions || [],
      isEdited: false,
      isDeleted: false,
      reactions: [],
      replyCount: 0,
      sender: this.getUserDetails(data.senderId),
      createdAt: msgDate,
      updatedAt: msgDate,
    };

    inMemoryDb.messages.set(id, record);

    // Update conversation lastMessageAt
    const conv = inMemoryDb.conversations.get(data.conversationId);
    if (conv) {
      conv.lastMessageAt = now;
      conv.updatedAt = now;
      inMemoryDb.conversations.set(data.conversationId, conv);
    }

    // Auto mark read for sender
    await this.updateLastRead(data.conversationId, data.senderId);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.messages).values({
          id,
          conversationId: record.conversationId,
          workspaceId: record.workspaceId,
          senderId: record.senderId,
          content: record.content,
          parentId: record.parentId,
          isPinned: record.isPinned,
          attachments: record.attachments,
          mentions: record.mentions,
          isEdited: record.isEdited,
          isDeleted: record.isDeleted,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });

        await db
          .update(schema.conversations)
          .set({ lastMessageAt: now, updatedAt: now })
          .where(eq(schema.conversations.id, data.conversationId));
      }
    } catch (err: any) {
      console.warn('[ChatRepository.createMessage] DB insert error:', err.message);
    }

    return record;
  }

  /**
   * Get reply count for a parent message
   */
  static async getReplyCount(messageId: string): Promise<number> {
    let count = 0;
    for (const m of inMemoryDb.messages.values()) {
      if (m.parentId === messageId && !m.isDeleted) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get message by ID
   */
  static async getMessageById(messageId: string): Promise<MessageEntity | null> {
    const inMem = inMemoryDb.messages.get(messageId);
    if (inMem) {
      const reactions = await this.getMessageReactions(messageId);
      const replyCount = await this.getReplyCount(messageId);
      const linkedTasks = await this.getMessageLinkedTasks(messageId);
      return {
        ...inMem,
        sender: this.getUserDetails(inMem.senderId),
        reactions,
        replyCount,
        linkedTasks,
      };
    }

    try {
      const db = getDb();
      if (db) {
        const [row] = await db.select().from(schema.messages).where(eq(schema.messages.id, messageId));
        if (row) {
          const reactions = await this.getMessageReactions(messageId);
          const replyCount = await this.getReplyCount(messageId);
          const linkedTasks = await this.getMessageLinkedTasks(messageId);
          return {
            id: row.id,
            conversationId: row.conversationId,
            workspaceId: row.workspaceId,
            senderId: row.senderId,
            content: row.content,
            parentId: row.parentId,
            isPinned: row.isPinned,
            attachments: (row.attachments as any[]) || [],
            mentions: (row.mentions as string[]) || [],
            isEdited: row.isEdited,
            isDeleted: row.isDeleted,
            reactions,
            replyCount,
            linkedTasks,
            sender: this.getUserDetails(row.senderId),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          };
        }
      }
    } catch (err: any) {
      console.warn('[ChatRepository.getMessageById] DB error:', err.message);
    }

    return null;
  }

  /**
   * List messages in a conversation with performance guardrails (50 max limit)
   */
  static async listMessages(
    conversationId: string,
    limit: number = 50,
    before?: string,
    offset: number = 0
  ): Promise<MessageEntity[]> {
    const maxLimit = Math.min(Math.max(1, limit || 50), 50);

    let msgList = Array.from(inMemoryDb.messages.values()).filter(
      (m: any) => m.conversationId === conversationId
    );

    if (before) {
      const beforeDate = new Date(before);
      msgList = msgList.filter((m: any) => new Date(m.createdAt) < beforeDate);
    }

    // Sort ascending by createdAt
    msgList.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Apply offset and limit
    if (offset > 0) {
      msgList = msgList.slice(0, Math.max(0, msgList.length - offset));
    }

    if (msgList.length > maxLimit) {
      msgList = msgList.slice(msgList.length - maxLimit);
    }

    const enriched: MessageEntity[] = [];
    for (const m of msgList) {
      const reactions = await this.getMessageReactions(m.id);
      const replyCount = await this.getReplyCount(m.id);
      const linkedTasks = await this.getMessageLinkedTasks(m.id);
      enriched.push({
        ...m,
        replyCount,
        sender: this.getUserDetails(m.senderId),
        reactions,
        linkedTasks,
      });
    }

    return enriched;
  }

  /**
   * List replies in a thread (messages where parentId = :parentId)
   */
  static async listThreadReplies(parentId: string): Promise<MessageEntity[]> {
    let replies = Array.from(inMemoryDb.messages.values()).filter(
      (m: any) => m.parentId === parentId && !m.isDeleted
    );

    replies.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const enriched: MessageEntity[] = [];
    for (const r of replies) {
      const reactions = await this.getMessageReactions(r.id);
      const linkedTasks = await this.getMessageLinkedTasks(r.id);
      enriched.push({
        ...r,
        sender: this.getUserDetails(r.senderId),
        reactions,
        linkedTasks,
      });
    }

    return enriched;
  }

  /**
   * Toggle pinned state for a message
   */
  static async togglePinMessage(messageId: string): Promise<MessageEntity | null> {
    const msg = inMemoryDb.messages.get(messageId);
    if (!msg) return null;

    msg.isPinned = !msg.isPinned;
    msg.updatedAt = new Date();
    inMemoryDb.messages.set(messageId, msg);

    try {
      const db = getDb();
      if (db) {
        await db
          .update(schema.messages)
          .set({ isPinned: msg.isPinned, updatedAt: msg.updatedAt })
          .where(eq(schema.messages.id, messageId));
      }
    } catch (err: any) {
      console.warn('[ChatRepository.togglePinMessage] DB error:', err.message);
    }

    return await this.getMessageById(messageId);
  }

  /**
   * List pinned messages in a conversation
   */
  static async listPinnedMessages(conversationId: string): Promise<MessageEntity[]> {
    const list = Array.from(inMemoryDb.messages.values()).filter(
      (m: any) => m.conversationId === conversationId && m.isPinned && !m.isDeleted
    );

    list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const enriched: MessageEntity[] = [];
    for (const m of list) {
      const reactions = await this.getMessageReactions(m.id);
      const replyCount = await this.getReplyCount(m.id);
      enriched.push({
        ...m,
        replyCount,
        sender: this.getUserDetails(m.senderId),
        reactions,
      });
    }

    return enriched;
  }

  /**
   * List all attachments across a conversation
   */
  static async listConversationAttachments(conversationId: string): Promise<ChatAttachment[]> {
    const attachments: ChatAttachment[] = [];
    for (const m of inMemoryDb.messages.values()) {
      if (m.conversationId === conversationId && !m.isDeleted && Array.isArray(m.attachments)) {
        for (const att of m.attachments) {
          attachments.push(att);
        }
      }
    }
    return attachments;
  }

  /**
   * Get readers who have read a specific message or conversation
   */
  static async getReaders(conversationId: string, messageId?: string): Promise<any[]> {
    const readers: any[] = [];
    const members = await this.getConversationMembers(conversationId);

    for (const m of members) {
      const r = inMemoryDb.conversationReads.get(`${conversationId}:${m.userId}`);
      let readAt: Date | null = null;
      let lastMsgId: string | null = null;

      if (r) {
        readAt = r.lastReadAt ? new Date(r.lastReadAt) : null;
        lastMsgId = r.lastReadMessageId || null;
      } else if (m.lastReadAt) {
        readAt = new Date(m.lastReadAt);
      }

      if (readAt) {
        readers.push({
          id: m.userId,
          userId: m.userId,
          name: m.user?.name || 'User',
          avatar: m.user?.avatar,
          role: m.user?.role,
          user: m.user,
          lastReadAt: readAt,
          lastReadMessageId: lastMsgId,
        });
      }
    }

    return readers;
  }

  /**
   * Global Search across messages and accessible conversations
   */
  static async searchChat(
    workspaceId: string,
    userId: string,
    role: string,
    queryText: string,
    filters?: {
      conversationId?: string;
      fromUserId?: string;
      hasFile?: boolean;
      before?: string;
      after?: string;
    }
  ): Promise<{ messages: MessageEntity[]; conversations: ConversationEntity[] }> {
    const accessibleConvs = await this.listUserConversations(workspaceId, userId, role);
    const accessibleConvIds = new Set(accessibleConvs.map((c) => c.id));

    const q = (queryText || '').toLowerCase().trim();

    // 1. Search matching conversations
    const matchedConvs = accessibleConvs.filter(
      (c) => (c.title && c.title.toLowerCase().includes(q)) || (c.description && c.description.toLowerCase().includes(q))
    );

    // 2. Search matching messages
    let matchedMsgs = Array.from(inMemoryDb.messages.values()).filter((m: any) => {
      if (!accessibleConvIds.has(m.conversationId)) return false;
      if (m.isDeleted) return false;

      if (filters?.conversationId && m.conversationId !== filters.conversationId) return false;
      if (filters?.fromUserId && m.senderId !== filters.fromUserId) return false;
      if (filters?.hasFile && (!m.attachments || m.attachments.length === 0)) return false;

      if (filters?.before && new Date(m.createdAt) >= new Date(filters.before)) return false;
      if (filters?.after && new Date(m.createdAt) <= new Date(filters.after)) return false;

      if (q && !m.content.toLowerCase().includes(q)) return false;

      return true;
    });

    matchedMsgs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const enrichedMsgs: MessageEntity[] = [];
    for (const m of matchedMsgs.slice(0, 50)) {
      const reactions = await this.getMessageReactions(m.id);
      const replyCount = await this.getReplyCount(m.id);
      enrichedMsgs.push({
        ...m,
        replyCount,
        sender: this.getUserDetails(m.senderId),
        reactions,
      });
    }

    return {
      messages: enrichedMsgs,
      conversations: matchedConvs,
    };
  }

  /**
   * Get latest message in a conversation
   */
  static async getLatestMessage(conversationId: string): Promise<MessageEntity | null> {
    const list = Array.from(inMemoryDb.messages.values()).filter(
      (m: any) => m.conversationId === conversationId
    );
    if (list.length === 0) return null;

    list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const top = list[0];
    return {
      ...top,
      sender: this.getUserDetails(top.senderId),
    };
  }

  /**
   * Update message content (Edit)
   */
  static async updateMessage(messageId: string, newContent: string): Promise<MessageEntity | null> {
    const now = new Date();
    const inMem = inMemoryDb.messages.get(messageId);
    if (inMem) {
      inMem.content = newContent;
      inMem.isEdited = true;
      inMem.updatedAt = now;
      inMemoryDb.messages.set(messageId, inMem);
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .update(schema.messages)
          .set({ content: newContent, isEdited: true, updatedAt: now })
          .where(eq(schema.messages.id, messageId));
      }
    } catch (err: any) {
      console.warn('[ChatRepository.updateMessage] DB error:', err.message);
    }

    return this.getMessageById(messageId);
  }

  /**
   * Delete message (Soft delete)
   */
  static async deleteMessage(messageId: string): Promise<boolean> {
    const now = new Date();
    const inMem = inMemoryDb.messages.get(messageId);
    if (inMem) {
      inMem.isDeleted = true;
      inMem.content = 'This message was deleted';
      inMem.updatedAt = now;
      inMemoryDb.messages.set(messageId, inMem);
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .update(schema.messages)
          .set({ isDeleted: true, content: 'This message was deleted', updatedAt: now })
          .where(eq(schema.messages.id, messageId));
      }
    } catch (err: any) {
      console.warn('[ChatRepository.deleteMessage] DB error:', err.message);
    }

    return true;
  }

  /**
   * Toggle emoji reaction on message
   */
  static async toggleReaction(
    messageId: string,
    conversationId: string,
    userId: string,
    emoji: string
  ): Promise<{ added: boolean; reaction?: MessageReactionEntity }> {
    // Check if reaction already exists
    let existingKey: string | null = null;
    for (const [key, r] of inMemoryDb.messageReactions.entries()) {
      if (r.messageId === messageId && r.userId === userId && r.emoji === emoji) {
        existingKey = key;
        break;
      }
    }

    if (existingKey) {
      // Remove reaction
      inMemoryDb.messageReactions.delete(existingKey);
      try {
        const db = getDb();
        if (db) {
          await db
            .delete(schema.messageReactions)
            .where(
              and(
                eq(schema.messageReactions.messageId, messageId),
                eq(schema.messageReactions.userId, userId),
                eq(schema.messageReactions.emoji, emoji)
              )
            );
        }
      } catch (err: any) {
        console.warn('[ChatRepository.toggleReaction] DB delete error:', err.message);
      }
      return { added: false };
    } else {
      // Add reaction
      const id = crypto.randomUUID();
      const reaction: MessageReactionEntity = {
        id,
        messageId,
        conversationId,
        userId,
        emoji,
        createdAt: new Date(),
      };
      inMemoryDb.messageReactions.set(id, reaction);

      try {
        const db = getDb();
        if (db) {
          await db.insert(schema.messageReactions).values({
            id,
            messageId,
            conversationId,
            userId,
            emoji,
            createdAt: reaction.createdAt,
          });
        }
      } catch (err: any) {
        console.warn('[ChatRepository.toggleReaction] DB insert error:', err.message);
      }
      return { added: true, reaction };
    }
  }

  /**
   * Get reactions for a message
   */
  static async getMessageReactions(messageId: string): Promise<MessageReactionEntity[]> {
    const inMem = Array.from(inMemoryDb.messageReactions.values()).filter(
      (r: any) => r.messageId === messageId
    );
    if (inMem.length > 0) return inMem;

    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.messageReactions)
          .where(eq(schema.messageReactions.messageId, messageId));
        return rows as any;
      }
    } catch (err: any) {
      console.warn('[ChatRepository.getMessageReactions] DB error:', err.message);
    }

    return [];
  }

  /**
   * Mark conversation as read with exact user read position in conversation_reads
   */
  static async markConversationRead(
    conversationId: string,
    userId: string,
    lastReadMessageId?: string | null
  ): Promise<void> {
    let maxMsgTime = 0;
    for (const m of inMemoryDb.messages.values()) {
      if (m.conversationId === conversationId) {
        const t = new Date(m.createdAt).getTime();
        if (t > maxMsgTime) maxMsgTime = t;
      }
    }
    const now = maxMsgTime >= Date.now() ? new Date(maxMsgTime) : new Date();

    // 1. Update/Insert in conversationReads
    let existingReadId: string | null = null;
    for (const [id, r] of inMemoryDb.conversationReads.entries()) {
      if (r.conversationId === conversationId && r.userId === userId) {
        existingReadId = id;
        break;
      }
    }

    if (existingReadId) {
      const rec = inMemoryDb.conversationReads.get(existingReadId);
      rec.lastReadAt = now;
      if (lastReadMessageId) rec.lastReadMessageId = lastReadMessageId;
      inMemoryDb.conversationReads.set(existingReadId, rec);
    } else {
      const newId = crypto.randomUUID();
      inMemoryDb.conversationReads.set(newId, {
        id: newId,
        conversationId,
        userId,
        lastReadMessageId: lastReadMessageId || null,
        lastReadAt: now,
      });
    }

    // 2. Also update in conversationMembers for backward compatibility
    for (const m of inMemoryDb.conversationMembers.values()) {
      if (m.conversationId === conversationId && m.userId === userId) {
        m.lastReadAt = now;
        break;
      }
    }

    // 3. PostgreSQL persistence
    try {
      const db = getDb();
      if (db) {
        await db
          .insert(schema.conversationReads)
          .values({
            id: existingReadId || crypto.randomUUID(),
            conversationId,
            userId,
            lastReadMessageId: lastReadMessageId || null,
            lastReadAt: now,
          })
          .onConflictDoUpdate({
            target: [schema.conversationReads.conversationId, schema.conversationReads.userId],
            set: {
              lastReadAt: now,
              ...(lastReadMessageId ? { lastReadMessageId } : {}),
            },
          });

        await db
          .update(schema.conversationMembers)
          .set({ lastReadAt: now })
          .where(
            and(
              eq(schema.conversationMembers.conversationId, conversationId),
              eq(schema.conversationMembers.userId, userId)
            )
          );
      }
    } catch (err: any) {
      console.warn('[ChatRepository.markConversationRead] DB error:', err.message);
    }
  }

  /**
   * Alias for backward compatibility
   */
  static async updateLastRead(conversationId: string, userId: string): Promise<void> {
    await this.markConversationRead(conversationId, userId);
  }

  /**
   * Get unread messages count for a conversation
   * Sender NEVER receives unread count for own messages.
   * Only messages created strictly after lastReadAt are counted.
   */
  static async getUnreadCountForConversation(conversationId: string, userId: string): Promise<number> {
    let lastRead: Date = new Date(0);

    // 1. Check conversationReads
    for (const r of inMemoryDb.conversationReads.values()) {
      if (r.conversationId === conversationId && r.userId === userId) {
        if (r.lastReadAt) lastRead = new Date(r.lastReadAt);
        break;
      }
    }

    // 2. Fallback to conversationMembers
    if (lastRead.getTime() === 0) {
      for (const m of inMemoryDb.conversationMembers.values()) {
        if (m.conversationId === conversationId && m.userId === userId) {
          if (m.lastReadAt) lastRead = new Date(m.lastReadAt);
          break;
        }
      }
    }

    // 3. Count messages where senderId !== userId and createdAt > lastRead and !isDeleted
    const unreadMessages = Array.from(inMemoryDb.messages.values()).filter(
      (m: any) =>
        m.conversationId === conversationId &&
        m.senderId !== userId &&
        !m.isDeleted &&
        new Date(m.createdAt) > lastRead
    );

    return unreadMessages.length;
  }

  /**
   * Get unread counts mapped by conversation ID
   */
  static async getUnreadCountsByConversation(
    workspaceId: string,
    userId: string,
    role: string = 'employee'
  ): Promise<Record<string, number>> {
    const conversations = await this.listUserConversations(workspaceId, userId, role);
    const result: Record<string, number> = {};
    for (const c of conversations) {
      result[c.id] = c.unreadCount || 0;
    }
    return result;
  }

  /**
   * Get total unread count across all accessible conversations for a user
   */
  static async getGlobalUnreadCount(workspaceId: string, userId: string, role: string = 'employee'): Promise<number> {
    const counts = await this.getUnreadCountsByConversation(workspaceId, userId, role);
    let total = 0;
    for (const count of Object.values(counts)) {
      total += count;
    }
    return total;
  }

  /**
   * Get all tasks linked to a message
   */
  static async getMessageLinkedTasks(messageId: string): Promise<MessageTaskEntity[]> {
    const linked: MessageTaskEntity[] = [];

    // Check in-memory first
    for (const mt of inMemoryDb.messageTasks.values()) {
      if (mt.messageId === messageId) {
        const task = inMemoryDb.tasks.get(mt.taskId);
        linked.push({
          id: mt.id,
          workspaceId: mt.workspaceId,
          messageId: mt.messageId,
          taskId: mt.taskId,
          createdBy: mt.createdBy,
          createdAt: mt.createdAt,
          task: task ? {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
          } : null,
        });
      }
    }

    if (linked.length > 0) return linked;

    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select({
            id: schema.messageTasks.id,
            workspaceId: schema.messageTasks.workspaceId,
            messageId: schema.messageTasks.messageId,
            taskId: schema.messageTasks.taskId,
            createdBy: schema.messageTasks.createdBy,
            createdAt: schema.messageTasks.createdAt,
            taskTitle: schema.tasks.title,
            taskStatus: schema.tasks.status,
            taskPriority: schema.tasks.priority,
          })
          .from(schema.messageTasks)
          .leftJoin(schema.tasks, eq(schema.messageTasks.taskId, schema.tasks.id))
          .where(eq(schema.messageTasks.messageId, messageId));

        return rows.map((r) => ({
          id: r.id,
          workspaceId: r.workspaceId,
          messageId: r.messageId,
          taskId: r.taskId,
          createdBy: r.createdBy,
          createdAt: r.createdAt,
          task: r.taskId ? {
            id: r.taskId,
            title: r.taskTitle || 'Task',
            status: r.taskStatus || 'todo',
            priority: r.taskPriority || 'medium',
          } : null,
        }));
      }
    } catch (err: any) {
      console.warn('[ChatRepository.getMessageLinkedTasks] DB query error:', err.message);
    }

    return linked;
  }

  /**
   * Link a message to a task
   */
  static async linkMessageToTask(data: {
    workspaceId: string;
    messageId: string;
    taskId: string;
    createdBy: string;
  }): Promise<MessageTaskEntity> {
    const id = crypto.randomUUID();
    const now = new Date();

    const record: MessageTaskEntity = {
      id,
      workspaceId: data.workspaceId,
      messageId: data.messageId,
      taskId: data.taskId,
      createdBy: data.createdBy,
      createdAt: now,
    };

    inMemoryDb.messageTasks.set(id, record);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.messageTasks).values({
          id,
          workspaceId: data.workspaceId,
          messageId: data.messageId,
          taskId: data.taskId,
          createdBy: data.createdBy,
          createdAt: now,
        });
      }
    } catch (err: any) {
      console.warn('[ChatRepository.linkMessageToTask] DB error:', err.message);
    }

    // Resolve task details
    const task = inMemoryDb.tasks.get(data.taskId);
    if (task) {
      record.task = {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
      };
    }

    return record;
  }

  /**
   * Record message mentions
   */
  static async recordMentions(
    mentions: Array<{
      workspaceId: string;
      messageId: string;
      mentionedUserId: string;
      mentionType: 'user' | 'team' | 'admins' | 'everyone';
    }>
  ): Promise<MessageMentionEntity[]> {
    if (mentions.length === 0) return [];
    const created: MessageMentionEntity[] = [];
    const now = new Date();

    for (const m of mentions) {
      const id = crypto.randomUUID();
      const entity: MessageMentionEntity = {
        id,
        workspaceId: m.workspaceId,
        messageId: m.messageId,
        mentionedUserId: m.mentionedUserId,
        mentionType: m.mentionType,
        createdAt: now,
        mentionedUser: this.getUserDetails(m.mentionedUserId),
      };

      inMemoryDb.messageMentions.set(id, entity);
      created.push(entity);

      try {
        const db = getDb();
        if (db) {
          await db.insert(schema.messageMentions).values({
            id,
            workspaceId: m.workspaceId,
            messageId: m.messageId,
            mentionedUserId: m.mentionedUserId,
            mentionType: m.mentionType,
            createdAt: now,
          });
        }
      } catch (err: any) {
        console.warn('[ChatRepository.recordMentions] DB insert error:', err.message);
      }
    }

    return created;
  }

  /**
   * Get mentions for a specific message
   */
  static async getMessageMentions(messageId: string): Promise<MessageMentionEntity[]> {
    const list: MessageMentionEntity[] = [];
    for (const mm of inMemoryDb.messageMentions.values()) {
      if (mm.messageId === messageId) {
        list.push({
          ...mm,
          mentionedUser: this.getUserDetails(mm.mentionedUserId),
        });
      }
    }

    if (list.length > 0) return list;

    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.messageMentions)
          .where(eq(schema.messageMentions.messageId, messageId));
        return rows.map((r) => ({
          id: r.id,
          workspaceId: r.workspaceId,
          messageId: r.messageId,
          mentionedUserId: r.mentionedUserId,
          mentionType: r.mentionType,
          createdAt: r.createdAt,
          mentionedUser: this.getUserDetails(r.mentionedUserId),
        }));
      }
    } catch (err: any) {
      console.warn('[ChatRepository.getMessageMentions] DB error:', err.message);
    }

    return list;
  }
}
