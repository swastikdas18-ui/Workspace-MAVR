import { eq, and, desc, asc, inArray, gt } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';
import { ChatSearchParser } from '../services/chat-search-parser.js';

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
    assignedTo?: string;
    assigneeName?: string | null;
    assigneeAvatar?: string | null;
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

export interface ConversationContextEntity {
  id: string;
  workspaceId: string;
  conversationId: string;
  projectId: string | null;
  departmentId: string | null;
  teamId: string | null;
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
  /**
   * Global Search across messages, files, tasks, people, and accessible conversations (Phase 2H)
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
      hasTask?: boolean;
      hasMention?: boolean;
      before?: string;
      after?: string;
      in?: string;
    }
  ): Promise<{
    messages: MessageEntity[];
    conversations: ConversationEntity[];
    files: Array<{
      id: string;
      name: string;
      url: string;
      mimeType: string;
      size: number;
      messageId: string;
      conversationId: string;
      conversationTitle: string;
      senderId: string;
      senderName: string;
      createdAt: Date;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      messageId?: string;
      conversationId?: string;
      createdAt: Date;
    }>;
    people: Array<{
      id: string;
      name: string;
      email: string;
      avatar?: string | null;
      role: string;
    }>;
    summary: {
      totalMessages: number;
      totalFiles: number;
      totalTasks: number;
      totalPeople: number;
      tookMs: number;
    };
  }> {
    const startTime = Date.now();

    // 1. Parse tokens from raw query string
    const parsed = ChatSearchParser.parse(queryText || '');
    const q = (parsed.cleanText || '').toLowerCase().trim();

    // Combine explicit filters with parsed token filters (explicit takes precedence if provided)
    const filterFrom = (filters?.fromUserId || parsed.from || '').toLowerCase().trim();
    const filterHasFile = filters?.hasFile !== undefined ? filters.hasFile : parsed.hasFile;
    const filterHasTask = filters?.hasTask !== undefined ? filters.hasTask : parsed.hasTask;
    const filterHasMention = filters?.hasMention !== undefined ? filters.hasMention : parsed.hasMention;
    const filterBefore = filters?.before || parsed.before;
    const filterAfter = filters?.after || parsed.after;
    const filterChannel = (filters?.conversationId || filters?.in || parsed.channel || '').toLowerCase().trim();

    // 2. Fetch accessible conversations for user with RBAC
    const accessibleConvs = await this.listUserConversations(workspaceId, userId, role);
    const accessibleConvIds = new Set(accessibleConvs.map((c) => c.id));
    const convMap = new Map(accessibleConvs.map((c) => [c.id, c]));

    // 3. Resolve sender filter (match userId, email, or name substring)
    let allowedSenderIds: Set<string> | null = null;
    if (filterFrom) {
      allowedSenderIds = new Set<string>();
      for (const u of inMemoryDb.users.values()) {
        const matchId = u.id.toLowerCase() === filterFrom;
        const matchEmail = u.email && u.email.toLowerCase().includes(filterFrom);
        const matchName = u.name && u.name.toLowerCase().includes(filterFrom);
        if (matchId || matchEmail || matchName) {
          allowedSenderIds.add(u.id);
        }
      }
    }

    // 4. Resolve channel / conversation filter (match convId, or title substring)
    let targetConvIds: Set<string> | null = null;
    if (filterChannel) {
      targetConvIds = new Set<string>();
      for (const conv of accessibleConvs) {
        const matchId = conv.id.toLowerCase() === filterChannel;
        const matchTitle = conv.title && conv.title.toLowerCase().includes(filterChannel);
        if (matchId || matchTitle) {
          targetConvIds.add(conv.id);
        }
      }
    }

    // 5. Pre-index message tasks for has:task filter
    const msgsWithTasks = new Set<string>();
    const taskByMsgMap = new Map<string, any[]>();
    for (const mt of inMemoryDb.messageTasks.values()) {
      if (mt.workspaceId === workspaceId) {
        msgsWithTasks.add(mt.messageId);
        const existing = taskByMsgMap.get(mt.messageId) || [];
        const taskObj = inMemoryDb.tasks.get(mt.taskId);
        if (taskObj) {
          existing.push({
            id: taskObj.id,
            title: taskObj.title,
            status: taskObj.status,
            priority: taskObj.priority,
            messageId: mt.messageId,
            createdAt: taskObj.createdAt || mt.createdAt,
          });
        }
        taskByMsgMap.set(mt.messageId, existing);
      }
    }

    // 6. Search matching conversations
    const matchedConvs = accessibleConvs.filter(
      (c) =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    );

    // 7. Search and filter messages
    const matchedMsgs = Array.from(inMemoryDb.messages.values()).filter((m: any) => {
      if (!accessibleConvIds.has(m.conversationId)) return false;
      if (m.isDeleted) return false;

      // Channel filter
      if (targetConvIds && !targetConvIds.has(m.conversationId)) return false;

      // Sender filter
      if (allowedSenderIds && !allowedSenderIds.has(m.senderId)) return false;

      // File attachment filter
      if (filterHasFile && (!m.attachments || m.attachments.length === 0)) return false;

      // Task link filter
      if (filterHasTask && !msgsWithTasks.has(m.id)) return false;

      // Mention filter (has:mention checks if message has mentions array or @ in content)
      if (filterHasMention) {
        const hasMentionsList = Array.isArray(m.mentions) && m.mentions.length > 0;
        const hasAtInContent = typeof m.content === 'string' && m.content.includes('@');
        if (!hasMentionsList && !hasAtInContent) return false;
      }

      // Date filters
      if (filterBefore) {
        const bDate = new Date(filterBefore);
        if (!isNaN(bDate.getTime()) && new Date(m.createdAt) > bDate) return false;
      }
      if (filterAfter) {
        const aDate = new Date(filterAfter);
        if (!isNaN(aDate.getTime()) && new Date(m.createdAt) < aDate) return false;
      }

      // Free text search
      if (q) {
        const contentMatch = (m.content || '').toLowerCase().includes(q);
        const attachmentMatch = (m.attachments || []).some(
          (a: any) => a.name && a.name.toLowerCase().includes(q)
        );
        if (!contentMatch && !attachmentMatch) return false;
      }

      return true;
    });

    matchedMsgs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 8. Enrich messages
    const enrichedMsgs: MessageEntity[] = [];
    const extractedFiles: Array<{
      id: string;
      name: string;
      url: string;
      mimeType: string;
      size: number;
      messageId: string;
      conversationId: string;
      conversationTitle: string;
      senderId: string;
      senderName: string;
      createdAt: Date;
    }> = [];
    const extractedTasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      messageId?: string;
      conversationId?: string;
      createdAt: Date;
    }> = [];

    const seenTaskIds = new Set<string>();

    for (const m of matchedMsgs.slice(0, 50)) {
      const reactions = await this.getMessageReactions(m.id);
      const replyCount = await this.getReplyCount(m.id);
      const sender = this.getUserDetails(m.senderId);
      const conv = convMap.get(m.conversationId);

      enrichedMsgs.push({
        ...m,
        replyCount,
        sender,
        reactions,
      });

      // Extract files
      if (m.attachments && Array.isArray(m.attachments)) {
        for (const att of m.attachments) {
          extractedFiles.push({
            id: att.id || `${m.id}-${att.name}`,
            name: att.name,
            url: att.url,
            mimeType: att.mimeType,
            size: att.size,
            messageId: m.id,
            conversationId: m.conversationId,
            conversationTitle: conv?.title || 'Direct Message',
            senderId: m.senderId,
            senderName: sender?.name || 'User',
            createdAt: m.createdAt,
          });
        }
      }

      // Extract linked tasks
      const linked = taskByMsgMap.get(m.id);
      if (linked) {
        for (const t of linked) {
          if (!seenTaskIds.has(t.id)) {
            seenTaskIds.add(t.id);
            extractedTasks.push({
              ...t,
              conversationId: m.conversationId,
            });
          }
        }
      }
    }

    // 9. Also search workspace tasks matching free text if q is provided and under task limit
    if (q) {
      for (const t of inMemoryDb.tasks.values()) {
        if (t.workspaceId === workspaceId && !seenTaskIds.has(t.id)) {
          if (t.title && t.title.toLowerCase().includes(q)) {
            seenTaskIds.add(t.id);
            extractedTasks.push({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              createdAt: t.createdAt || new Date(),
            });
            if (extractedTasks.length >= 20) break;
          }
        }
      }
    }

    // 10. Search People in the Workspace
    const matchedPeople: Array<{
      id: string;
      name: string;
      email: string;
      avatar?: string | null;
      role: string;
    }> = [];

    const wsMembers = Array.from(inMemoryDb.workspaceMembers.values()).filter(
      (wm: any) => wm.workspaceId === workspaceId
    );
    const wsMemberUserIds = new Set(wsMembers.map((wm: any) => wm.userId));

    for (const u of inMemoryDb.users.values()) {
      if (wsMemberUserIds.has(u.id)) {
        const matchName = u.name && u.name.toLowerCase().includes(q || filterFrom);
        const matchEmail = u.email && u.email.toLowerCase().includes(q || filterFrom);
        if (!q && !filterFrom) {
          // If no query or from filter, include recent members up to 10
          if (matchedPeople.length < 10) {
            matchedPeople.push({
              id: u.id,
              name: u.name,
              email: u.email,
              avatar: u.avatar || null,
              role: u.role,
            });
          }
        } else if (matchName || matchEmail) {
          matchedPeople.push({
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar || null,
            role: u.role,
          });
          if (matchedPeople.length >= 20) break;
        }
      }
    }

    const tookMs = Date.now() - startTime;

    return {
      messages: enrichedMsgs,
      conversations: matchedConvs,
      files: extractedFiles,
      tasks: extractedTasks,
      people: matchedPeople,
      summary: {
        totalMessages: enrichedMsgs.length,
        totalFiles: extractedFiles.length,
        totalTasks: extractedTasks.length,
        totalPeople: matchedPeople.length,
        tookMs,
      },
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
        let assigneeName: string | null = null;
        let assigneeAvatar: string | null = null;
        if (task?.assignedTo) {
          const u = inMemoryDb.users.get(task.assignedTo);
          if (u) {
            assigneeName = u.name;
            assigneeAvatar = (u as any).avatar || null;
          }
        }
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
            assignedTo: task.assignedTo,
            assigneeName,
            assigneeAvatar,
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
            taskAssignedTo: schema.tasks.assignedTo,
            assigneeName: schema.users.name,
            assigneeAvatar: schema.users.avatar,
          })
          .from(schema.messageTasks)
          .leftJoin(schema.tasks, eq(schema.messageTasks.taskId, schema.tasks.id))
          .leftJoin(schema.users, eq(schema.tasks.assignedTo, schema.users.id))
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
            assignedTo: r.taskAssignedTo || undefined,
            assigneeName: r.assigneeName || null,
            assigneeAvatar: r.assigneeAvatar || null,
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

  /**
   * Get conversation context record
   */
  static async getConversationContext(conversationId: string): Promise<ConversationContextEntity | null> {
    // In-memory lookup
    for (const ctx of inMemoryDb.conversationContext.values()) {
      if (ctx.conversationId === conversationId) {
        return { ...ctx };
      }
    }

    try {
      const db = getDb();
      if (db) {
        const [row] = await db
          .select()
          .from(schema.conversationContext)
          .where(eq(schema.conversationContext.conversationId, conversationId));
        if (row) {
          return {
            id: row.id,
            workspaceId: row.workspaceId,
            conversationId: row.conversationId,
            projectId: row.projectId,
            departmentId: row.departmentId,
            teamId: row.teamId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          };
        }
      }
    } catch (err: any) {
      console.warn('[ChatRepository.getConversationContext] DB error:', err.message);
    }

    return null;
  }

  /**
   * Upsert conversation context
   */
  static async upsertConversationContext(data: {
    conversationId: string;
    workspaceId: string;
    projectId?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
  }): Promise<ConversationContextEntity> {
    const now = new Date();

    // Check existing
    let existing: any = null;
    for (const ctx of inMemoryDb.conversationContext.values()) {
      if (ctx.conversationId === data.conversationId) {
        existing = ctx;
        break;
      }
    }

    if (existing) {
      existing.projectId = data.projectId !== undefined ? data.projectId : existing.projectId;
      existing.departmentId = data.departmentId !== undefined ? data.departmentId : existing.departmentId;
      existing.teamId = data.teamId !== undefined ? data.teamId : existing.teamId;
      existing.updatedAt = now;

      try {
        const db = getDb();
        if (db) {
          await db
            .update(schema.conversationContext)
            .set({
              projectId: existing.projectId,
              departmentId: existing.departmentId,
              teamId: existing.teamId,
              updatedAt: now,
            })
            .where(eq(schema.conversationContext.id, existing.id));
        }
      } catch (err: any) {
        console.warn('[ChatRepository.upsertConversationContext] DB update error:', err.message);
      }

      return { ...existing };
    }

    const id = crypto.randomUUID();
    const entity: ConversationContextEntity = {
      id,
      workspaceId: data.workspaceId,
      conversationId: data.conversationId,
      projectId: data.projectId || null,
      departmentId: data.departmentId || null,
      teamId: data.teamId || null,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryDb.conversationContext.set(id, entity);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.conversationContext).values({
          id,
          workspaceId: entity.workspaceId,
          conversationId: entity.conversationId,
          projectId: entity.projectId,
          departmentId: entity.departmentId,
          teamId: entity.teamId,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (err: any) {
      console.warn('[ChatRepository.upsertConversationContext] DB insert error:', err.message);
    }

    return entity;
  }

  // =========================================================================
  // Phase 2F: Saved Messages Repository Methods
  // =========================================================================

  /**
   * Save a message for a user in a workspace
   */
  static async saveMessage(workspaceId: string, userId: string, messageId: string) {
    const existing = await this.isMessageSaved(workspaceId, userId, messageId);
    if (existing) return existing;

    const id = crypto.randomUUID();
    const now = new Date();
    const record = {
      id,
      userId,
      workspaceId,
      messageId,
      createdAt: now,
    };

    inMemoryDb.savedMessages.set(id, record);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.savedMessages).values(record);
      }
    } catch (err: any) {
      console.warn('[ChatRepository.saveMessage] DB insert error:', err.message);
    }

    return record;
  }

  /**
   * Remove a saved message for a user
   */
  static async unsaveMessage(workspaceId: string, userId: string, messageId: string) {
    // Remove from in-memory
    for (const [key, item] of inMemoryDb.savedMessages.entries()) {
      if (item.workspaceId === workspaceId && item.userId === userId && item.messageId === messageId) {
        inMemoryDb.savedMessages.delete(key);
      }
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .delete(schema.savedMessages)
          .where(
            and(
              eq(schema.savedMessages.workspaceId, workspaceId),
              eq(schema.savedMessages.userId, userId),
              eq(schema.savedMessages.messageId, messageId)
            )
          );
      }
    } catch (err: any) {
      console.warn('[ChatRepository.unsaveMessage] DB delete error:', err.message);
    }

    return true;
  }

  /**
   * Check if a message is saved by a user
   */
  static async isMessageSaved(workspaceId: string, userId: string, messageId: string) {
    for (const item of inMemoryDb.savedMessages.values()) {
      if (item.workspaceId === workspaceId && item.userId === userId && item.messageId === messageId) {
        return item;
      }
    }

    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.savedMessages)
          .where(
            and(
              eq(schema.savedMessages.workspaceId, workspaceId),
              eq(schema.savedMessages.userId, userId),
              eq(schema.savedMessages.messageId, messageId)
            )
          )
          .limit(1);
        if (rows.length > 0) return rows[0];
      }
    } catch {}

    return null;
  }

  /**
   * Get all saved messages for a user in a workspace
   */
  static async getSavedMessages(workspaceId: string, userId: string) {
    const list: any[] = [];

    // Check DB first
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select({
            id: schema.savedMessages.id,
            userId: schema.savedMessages.userId,
            workspaceId: schema.savedMessages.workspaceId,
            messageId: schema.savedMessages.messageId,
            createdAt: schema.savedMessages.createdAt,
            message: schema.messages,
            sender: schema.users,
            conversation: schema.conversations,
          })
          .from(schema.savedMessages)
          .innerJoin(schema.messages, eq(schema.savedMessages.messageId, schema.messages.id))
          .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
          .leftJoin(schema.conversations, eq(schema.messages.conversationId, schema.conversations.id))
          .where(
            and(
              eq(schema.savedMessages.workspaceId, workspaceId),
              eq(schema.savedMessages.userId, userId)
            )
          )
          .orderBy(desc(schema.savedMessages.createdAt));

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            messageId: r.messageId,
            workspaceId: r.workspaceId,
            userId: r.userId,
            createdAt: r.createdAt,
            message: {
              ...r.message,
              sender: r.sender
                ? {
                    id: r.sender.id,
                    name: r.sender.name,
                    email: r.sender.email,
                    avatar: r.sender.avatar,
                    role: r.sender.role,
                  }
                : null,
            },
            conversation: r.conversation
              ? {
                  id: r.conversation.id,
                  title: r.conversation.title,
                  type: r.conversation.type,
                }
              : null,
          }));
        }
      }
    } catch {}

    // Fallback in-memory
    const memSaved = Array.from(inMemoryDb.savedMessages.values())
      .filter((s) => s.workspaceId === workspaceId && s.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (const item of memSaved) {
      const msg = inMemoryDb.messages.get(item.messageId);
      if (msg) {
        const sender = inMemoryDb.users.get(msg.senderId);
        const conv = inMemoryDb.conversations.get(msg.conversationId);
        list.push({
          id: item.id,
          messageId: item.messageId,
          workspaceId: item.workspaceId,
          userId: item.userId,
          createdAt: item.createdAt,
          message: {
            ...msg,
            sender: sender
              ? {
                  id: sender.id,
                  name: sender.name,
                  email: sender.email,
                  avatar: sender.avatar,
                  role: sender.role,
                }
              : null,
          },
          conversation: conv
            ? {
                id: conv.id,
                title: conv.title,
                type: conv.type,
              }
            : null,
        });
      }
    }

    return list;
  }

  // =========================================================================
  // Phase 2G: Announcement Acknowledgements
  // =========================================================================

  /**
   * Record acknowledgement of an announcement by a user
   */
  static async acknowledgeAnnouncement(workspaceId: string, announcementId: string, userId: string): Promise<any> {
    const id = crypto.randomUUID();
    const acknowledgedAt = new Date();
    const record = {
      id,
      announcementId,
      userId,
      workspaceId,
      acknowledgedAt,
    };

    // In-memory update
    inMemoryDb.announcementAcknowledgements.set(id, record);

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.announcementAcknowledgements).values(record).onConflictDoNothing();
      } catch (err: any) {
        console.warn('[ChatRepository.acknowledgeAnnouncement] DB error:', err.message);
      }
    }

    return record;
  }

  /**
   * Check if user has acknowledged an announcement
   */
  static async hasUserAcknowledged(workspaceId: string, announcementId: string, userId: string): Promise<boolean> {
    for (const ack of inMemoryDb.announcementAcknowledgements.values()) {
      if (ack.announcementId === announcementId && ack.userId === userId && ack.workspaceId === workspaceId) {
        return true;
      }
    }

    const db = getDb();
    if (db) {
      try {
        const rows = await db
          .select({ id: schema.announcementAcknowledgements.id })
          .from(schema.announcementAcknowledgements)
          .where(
            and(
              eq(schema.announcementAcknowledgements.workspaceId, workspaceId),
              eq(schema.announcementAcknowledgements.announcementId, announcementId),
              eq(schema.announcementAcknowledgements.userId, userId)
            )
          )
          .limit(1);
        if (rows.length > 0) return true;
      } catch (err: any) {
        console.warn('[ChatRepository.hasUserAcknowledged] DB error:', err.message);
      }
    }

    return false;
  }

  /**
   * Get announcement acknowledgement statistics and audit list
   */
  static async getAnnouncementStats(workspaceId: string, announcementId: string, currentUserId?: string): Promise<{
    announcementId: string;
    acknowledgedCount: number;
    totalMembers: number;
    percentage: number;
    userAcknowledged: boolean;
    acknowledgements: Array<{
      id: string;
      userId: string;
      name: string;
      email: string;
      role: string;
      avatar?: string | null;
      acknowledgedAt: Date;
    }>;
  }> {
    // 1. Resolve total workspace members
    let totalMembers = 0;
    const db = getDb();
    if (db) {
      try {
        const memberRows = await db
          .select({ count: schema.workspaceMembers.id })
          .from(schema.workspaceMembers)
          .where(eq(schema.workspaceMembers.workspaceId, workspaceId));
        totalMembers = memberRows.length;
      } catch {
        totalMembers = 0;
      }
    }
    if (totalMembers === 0) {
      for (const wm of inMemoryDb.workspaceMembers.values()) {
        if (wm.workspaceId === workspaceId) {
          totalMembers++;
        }
      }
    }
    if (totalMembers === 0) totalMembers = 1;

    // 2. Fetch acknowledgements
    const acksList: Array<{
      id: string;
      userId: string;
      name: string;
      email: string;
      role: string;
      avatar?: string | null;
      acknowledgedAt: Date;
    }> = [];

    const ackUserIds = new Set<string>();

    // Check DB
    if (db) {
      try {
        const rows = await db
          .select({
            id: schema.announcementAcknowledgements.id,
            userId: schema.announcementAcknowledgements.userId,
            acknowledgedAt: schema.announcementAcknowledgements.acknowledgedAt,
            user: {
              id: schema.users.id,
              name: schema.users.name,
              email: schema.users.email,
              role: schema.users.role,
              avatar: schema.users.avatar,
            },
          })
          .from(schema.announcementAcknowledgements)
          .innerJoin(schema.users, eq(schema.announcementAcknowledgements.userId, schema.users.id))
          .where(
            and(
              eq(schema.announcementAcknowledgements.workspaceId, workspaceId),
              eq(schema.announcementAcknowledgements.announcementId, announcementId)
            )
          )
          .orderBy(desc(schema.announcementAcknowledgements.acknowledgedAt));

        for (const r of rows) {
          ackUserIds.add(r.userId);
          acksList.push({
            id: r.id,
            userId: r.userId,
            name: r.user.name,
            email: r.user.email,
            role: r.user.role,
            avatar: r.user.avatar,
            acknowledgedAt: r.acknowledgedAt,
          });
        }
      } catch (err: any) {
        console.warn('[ChatRepository.getAnnouncementStats] DB error:', err.message);
      }
    }

    // In-memory fallback/merge
    for (const ack of inMemoryDb.announcementAcknowledgements.values()) {
      if (ack.workspaceId === workspaceId && ack.announcementId === announcementId) {
        if (!ackUserIds.has(ack.userId)) {
          ackUserIds.add(ack.userId);
          const user = inMemoryDb.users.get(ack.userId);
          acksList.push({
            id: ack.id,
            userId: ack.userId,
            name: user?.name || 'Unknown User',
            email: user?.email || '',
            role: user?.role || 'employee',
            avatar: user?.avatar || null,
            acknowledgedAt: ack.acknowledgedAt,
          });
        }
      }
    }

    const acknowledgedCount = acksList.length;
    const percentage = totalMembers > 0 ? Math.round((acknowledgedCount / totalMembers) * 100) : 0;
    const userAcknowledged = currentUserId ? ackUserIds.has(currentUserId) : false;

    return {
      announcementId,
      acknowledgedCount,
      totalMembers,
      percentage,
      userAcknowledged,
      acknowledgements: acksList,
    };
  }
}
