import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { ChatService } from '../services/chat-service.js';
import { ChatRepository } from '../repositories/chat-repository.js';

export const chatRouter = new Hono();

chatRouter.use('*', authMiddleware);

/**
 * GET /api/chat/unread-count - Fast total unread messages count
 */
chatRouter.get('/unread-count', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const role = workspace.roleInWorkspace || user.role || 'employee';
    const count = await ChatService.getUnreadCount(workspace.id, user.id, role);
    return c.json({ unreadCount: count }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/chat/unread-counts - Unread counts mapped by conversation ID
 */
chatRouter.get('/unread-counts', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const role = workspace.roleInWorkspace || user.role || 'employee';
    const counts = await ChatService.getUnreadCountsByConversation(workspace.id, user.id, role);
    return c.json({ unreadCounts: counts }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/chat/conversations - List accessible conversations for user with optional filter tab
 */
chatRouter.get('/conversations', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const role = workspace.roleInWorkspace || user.role || 'employee';
    const filter = c.req.query('filter') as 'all' | 'unread' | 'mentions' | undefined;
    const conversations = await ChatService.getConversations(workspace.id, user.id, role, filter);
    return c.json({ conversations }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

/**
 * POST /api/chat/conversations/dm - Start or get existing DM with a user
 */
chatRouter.post('/conversations/dm', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const { targetUserId } = body;
    if (!targetUserId) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'targetUserId is required.' } }, 400);
    }

    const dm = await ChatService.getOrCreateDm(workspace.id, user.id, targetUserId);
    const members = await ChatRepository.getConversationMembers(dm.id);
    return c.json({ conversation: { ...dm, members } }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/chat/conversations/channel - Create a public/workspace channel (Admin only)
 */
chatRouter.post('/conversations/channel', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = workspace.roleInWorkspace || user.role || 'employee';
    const body = await c.req.json().catch(() => ({}));
    const { title, description } = body;

    const channel = await ChatService.createChannel(workspace.id, title, description, user.id, role);
    const members = await ChatRepository.getConversationMembers(channel.id);
    return c.json({ conversation: { ...channel, members } }, 201);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/chat/conversations/group - Create a group conversation (Admin/Employee)
 */
chatRouter.post('/conversations/group', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = workspace.roleInWorkspace || user.role || 'employee';
    const body = await c.req.json().catch(() => ({}));
    const { title, memberUserIds } = body;

    const group = await ChatService.createGroup(workspace.id, title, memberUserIds || [], user.id, role);
    const members = await ChatRepository.getConversationMembers(group.id);
    return c.json({ conversation: { ...group, members } }, 201);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * GET /api/chat/conversations/:id - Get conversation details & members
 */
chatRouter.get('/conversations/:id', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const conv = await ChatRepository.getConversationById(workspace.id, conversationId);
    if (!conv) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Conversation not found.' } }, 404);
    }

    const role = workspace.roleInWorkspace || user.role || 'employee';
    const isAdmin = role === 'admin';
    const isMember = await ChatRepository.isConversationMember(conversationId, user.id);

    if (conv.type === 'dm' && !isMember) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } }, 403);
    }
    if ((conv.type === 'department' || conv.type === 'project') && !isMember && !isAdmin) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } }, 403);
    }

    const members = await ChatRepository.getConversationMembers(conversationId);
    const unreadCount = await ChatRepository.getUnreadCountForConversation(conversationId, user.id);

    return c.json({ conversation: { ...conv, members, unreadCount } }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/chat/conversations/:id/messages - Get messages in conversation
 */
chatRouter.get('/conversations/:id/messages', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';
    const limitQuery = c.req.query('limit');
    const before = c.req.query('before');
    const offsetQuery = c.req.query('offset');
    const limit = limitQuery ? parseInt(limitQuery, 10) : 50;
    const offset = offsetQuery ? parseInt(offsetQuery, 10) : 0;

    const messages = await ChatService.getMessages(
      workspace.id,
      conversationId,
      user.id,
      role,
      limit,
      before
    );

    return c.json({ messages }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/chat/conversations/:id/messages - Send a message
 */
chatRouter.post('/conversations/:id/messages', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';
    const body = await c.req.json().catch(() => ({}));
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Content is required.' } }, 400);
    }

    const message = await ChatService.sendMessage(
      workspace.id,
      conversationId,
      user.id,
      role,
      content
    );

    return c.json({ message }, 201);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * PUT /api/chat/messages/:id - Edit own message
 */
chatRouter.put('/messages/:id', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const messageId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Content is required.' } }, 400);
    }

    const updated = await ChatService.editMessage(workspace.id, messageId, user.id, content);
    return c.json({ message: updated }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * DELETE /api/chat/messages/:id - Delete message
 */
chatRouter.delete('/messages/:id', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const messageId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';

    await ChatService.deleteMessage(workspace.id, messageId, user.id, role);
    return c.json({ success: true, message: 'Message deleted successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/chat/messages/:id/reactions - Toggle emoji reaction
 */
chatRouter.post('/messages/:id/reactions', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const messageId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { emoji } = body;

    if (!emoji || typeof emoji !== 'string') {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Emoji is required.' } }, 400);
    }

    const result = await ChatService.toggleReaction(workspace.id, messageId, user.id, emoji);
    return c.json(result, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/chat/conversations/:id/read - Mark conversation as read
 */
chatRouter.post('/conversations/:id/read', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { lastReadMessageId } = body;
    await ChatService.markConversationRead(workspace.id, conversationId, user.id, lastReadMessageId);
    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

/**
 * POST /api/chat/conversations/:id/typing - Broadcast typing indicator
 */
chatRouter.post('/conversations/:id/typing', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    await ChatService.broadcastTyping(workspace.id, conversationId, user.id, user.name);
    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});
