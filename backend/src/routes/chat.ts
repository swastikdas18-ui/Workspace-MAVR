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
 * POST /api/chat/conversations/channel & POST /api/chat/channels - Create a public/workspace channel (Admin only)
 */
const createChannelHandler = async (c: any) => {
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
};
chatRouter.post('/conversations/channel', createChannelHandler);
chatRouter.post('/channels', createChannelHandler);

/**
 * POST /api/chat/conversations/group & POST /api/chat/groups - Create a group conversation (Admin/Employee)
 */
const createGroupHandler = async (c: any) => {
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
};
chatRouter.post('/conversations/group', createGroupHandler);
chatRouter.post('/groups', createGroupHandler);

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
    const { content, parentId, attachments } = body;

    if (!content || typeof content !== 'string') {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Content is required.' } }, 400);
    }

    const message = await ChatService.sendMessage(
      workspace.id,
      conversationId,
      user.id,
      role,
      content,
      { parentId, attachments }
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
 * POST /api/chat/messages/:id/react & POST /api/chat/messages/:id/reactions - Toggle emoji reaction
 */
const reactHandler = async (c: any) => {
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
};
chatRouter.post('/messages/:id/reactions', reactHandler);
chatRouter.post('/messages/:id/react', reactHandler);

/**
 * DELETE /api/chat/messages/:id/react - Remove emoji reaction
 */
chatRouter.delete('/messages/:id/react', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const messageId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const emoji = body?.emoji || c.req.query('emoji');

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
 * POST /api/chat/messages/:id/pin - Toggle message pin (Admin only)
 */
chatRouter.post('/messages/:id/pin', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const messageId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';

    const updated = await ChatService.togglePin(workspace.id, messageId, user.id, role);
    return c.json({ message: updated, isPinned: updated.isPinned }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * GET /api/chat/conversations/:id/pinned - List pinned messages in conversation
 */
chatRouter.get('/conversations/:id/pinned', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const pinned = await ChatRepository.listPinnedMessages(conversationId);
    return c.json({ pinned }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/chat/conversations/:id/files - List files/attachments in conversation
 */
chatRouter.get('/conversations/:id/files', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const files = await ChatRepository.listConversationAttachments(conversationId);
    return c.json({ files }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/chat/messages/:id/thread - Get thread replies
 */
chatRouter.get('/messages/:id/thread', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const parentId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';

    const thread = await ChatService.getThread(workspace.id, parentId, user.id, role);
    return c.json(thread, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/chat/messages/:id/thread - Post reply in thread
 */
chatRouter.post('/messages/:id/thread', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const parentId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';
    const body = await c.req.json().catch(() => ({}));
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Content is required.' } }, 400);
    }

    const reply = await ChatService.replyThread(workspace.id, parentId, user.id, role, content);
    return c.json({ reply }, 201);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * GET /api/chat/readers - Get readers who have read conversation
 */
chatRouter.get('/readers', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.query('conversationId');
    if (!conversationId) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'conversationId is required.' } }, 400);
    }

    const messageId = c.req.query('messageId');
    const readers = await ChatRepository.getReaders(conversationId, messageId);
    return c.json({ readers }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/chat/search - Global chat search
 */
chatRouter.get('/search', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = workspace.roleInWorkspace || user.role || 'employee';
    const q = c.req.query('q') || c.req.query('query') || '';
    const conversationId = c.req.query('conversationId') || c.req.query('channel');
    const fromUserId = c.req.query('from') || c.req.query('fromUserId');
    const hasFile = c.req.query('hasFile') === 'true' || c.req.query('has') === 'file' ? true : undefined;
    const hasTask = c.req.query('hasTask') === 'true' || c.req.query('has') === 'task' ? true : undefined;
    const hasMention = c.req.query('hasMention') === 'true' || c.req.query('has') === 'mention' ? true : undefined;
    const before = c.req.query('before');
    const after = c.req.query('after');
    const inFilter = c.req.query('in');

    const results = await ChatRepository.searchChat(workspace.id, user.id, role, q, {
      conversationId: conversationId || inFilter,
      fromUserId,
      hasFile,
      hasTask,
      hasMention,
      before,
      after,
      in: inFilter,
    });

    return c.json(results, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

/**
 * POST /api/chat/upload - File attachment upload for chat
 * RBAC: Admin & Employee: Allowed. Intern: Forbidden.
 */
chatRouter.post('/upload', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = (workspace.roleInWorkspace || user.role || 'employee').toLowerCase();
    if (role === 'intern') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Forbidden: Interns cannot upload attachments in chat.' } },
        403
      );
    }

    const contentType = c.req.header('content-type') || '';
    let name = 'attachment';
    let mimeType = 'application/octet-stream';
    let size = 0;
    let url = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return c.json({ error: { code: 'VALIDATION_ERROR', message: 'File is required.' } }, 400);
      }
      name = file.name || 'file';
      mimeType = file.type || 'application/octet-stream';
      size = file.size || 0;

      // Object storage upload
      const fileExt = name.split('.').pop() || 'bin';
      const storageKey = `chat/${workspace.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      const ab = await file.arrayBuffer();
      const buffer = Buffer.from(ab);

      const { ObjectStorageService } = await import('../services/object-storage-service.js');
      const uploadResult = await ObjectStorageService.uploadObject({
        workspaceId: workspace.id,
        documentId: `chat-${Date.now()}`,
        filename: `${crypto.randomUUID()}.${fileExt}`,
        body: buffer,
        contentType: mimeType,
      });
      url = uploadResult.url || `/api/documents/vault/${storageKey}`;
    } else {
      const body = await c.req.json().catch(() => ({}));
      name = body.name || 'document';
      mimeType = body.mimeType || 'application/pdf';
      size = body.size || 1024;
      url = body.url || `/api/documents/vault/chat/${Date.now()}-${name}`;
    }

    const attachment: import('../repositories/chat-repository.js').ChatAttachment = {
      id: crypto.randomUUID(),
      name,
      url,
      mimeType,
      size,
    };

    return c.json({ success: true, attachment }, 201);
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
    const body = await c.req.json().catch(() => ({}));
    const isTyping = body?.isTyping !== false;

    await ChatService.broadcastTyping(workspace.id, conversationId, user.id, user.name, isTyping);
    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  }
});

/**
 * POST /api/chat/messages/:id/create-task - Convert message into a task
 */
chatRouter.post('/messages/:id/create-task', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const messageId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';
    const body = await c.req.json().catch(() => ({}));

    const result = await ChatService.createMessageTask(workspace.id, messageId, user.id, role, body);
    return c.json(result, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/chat/conversations/:id/slash-command - Execute slash command in conversation
 */
chatRouter.post('/conversations/:id/slash-command', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';
    const body = await c.req.json().catch(() => ({}));
    const { command } = body;

    if (!command || typeof command !== 'string') {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Command string is required.' } }, 400);
    }

    const result = await ChatService.executeSlashCommand(
      workspace.id,
      conversationId,
      user.id,
      role,
      command
    );

    return c.json({
      slashCommand: {
        command: result.command,
        args: result.args,
        result: result.result,
      },
      command: result.command,
      args: result.args,
      result: result.result,
      message: result.message,
    }, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'NOT_FOUND' ? 404 : 400);
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * GET /api/chat/conversations/:id/slash-commands - Get slash command execution history
 */
chatRouter.get('/conversations/:id/slash-commands', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const history = await ChatService.getSlashCommandHistory(workspace.id, conversationId);
    return c.json({ history }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * GET /api/chat/conversations/:id/context - Get operational context for conversation
 */
chatRouter.get('/conversations/:id/context', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';

    const result = await ChatService.getConversationContext(
      workspace.id,
      conversationId,
      user.id,
      role
    );

    return c.json(result, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'NOT_FOUND' ? 404 : 500);
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * PUT /api/chat/conversations/:id/context - Update operational context for conversation
 */
chatRouter.put('/conversations/:id/context', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';
    const body = await c.req.json().catch(() => ({}));

    const result = await ChatService.updateConversationContext(
      workspace.id,
      conversationId,
      user.id,
      role,
      body
    );

    return c.json(result, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'NOT_FOUND' ? 404 : 400);
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * GET /api/chat/conversations/:id/timeline - Get operational activity timeline for conversation
 */
chatRouter.get('/conversations/:id/timeline', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const conversationId = c.req.param('id');
    const role = workspace.roleInWorkspace || user.role || 'employee';
    const limitQuery = c.req.query('limit');
    const limit = limitQuery ? parseInt(limitQuery, 10) : 50;

    const result = await ChatService.getConversationTimeline(
      workspace.id,
      conversationId,
      user.id,
      role,
      limit
    );

    return c.json(result, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'NOT_FOUND' ? 404 : 500);
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

// =========================================================================
// Phase 2F: Saved Messages Endpoints
// =========================================================================

/**
 * GET /api/chat/saved - List all saved messages for authenticated user in workspace
 */
chatRouter.get('/saved', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const result = await ChatService.getSavedMessages(workspace.id, user.id);
    return c.json(result, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
});

/**
 * POST /api/chat/save & POST /api/chat/messages/:id/save - Save a message
 */
const saveMessageHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const messageId = c.req.param('id') || body.messageId;
    if (!messageId) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'messageId is required.' } }, 400);
    }

    const result = await ChatService.saveMessage(workspace.id, messageId, user.id);
    return c.json(result, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 500);
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
};
chatRouter.post('/save', saveMessageHandler);
chatRouter.post('/messages/:id/save', saveMessageHandler);

/**
 * DELETE /api/chat/save & DELETE /api/chat/messages/:id/save - Unsave a message
 */
const unsaveMessageHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const messageId = c.req.param('id') || body.messageId || c.req.query('messageId');
    if (!messageId) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'messageId is required.' } }, 400);
    }

    const result = await ChatService.unsaveMessage(workspace.id, messageId, user.id);
    return c.json(result, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
};
chatRouter.delete('/save', unsaveMessageHandler);
chatRouter.delete('/messages/:id/save', unsaveMessageHandler);

// =========================================================================
// Phase 2G: Announcement Acknowledgements Endpoints
// =========================================================================

/**
 * POST /api/chat/acknowledge & POST /api/chat/announcements/:id/acknowledge
 */
const acknowledgeAnnouncementHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const announcementId = c.req.param('id') || body.announcementId || body.messageId;
    if (!announcementId) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'announcementId is required.' } }, 400);
    }

    const result = await ChatService.acknowledgeAnnouncement(workspace.id, announcementId, user.id);
    return c.json(result, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 500);
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
};
chatRouter.post('/acknowledge', acknowledgeAnnouncementHandler);
chatRouter.post('/announcements/:id/acknowledge', acknowledgeAnnouncementHandler);

/**
 * GET /api/chat/stats & GET /api/chat/announcements/:id/stats
 */
const getAnnouncementStatsHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    const role = c.get('role') || 'employee';
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const announcementId = c.req.param('id') || c.req.query('announcementId') || c.req.query('messageId');
    if (!announcementId) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'announcementId is required.' } }, 400);
    }

    const result = await ChatService.getAnnouncementStats(workspace.id, announcementId, user.id, role);
    return c.json(result, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 500);
    return c.json({ error: { code: err.code || 'ERROR', message: err.message } }, status);
  }
};
chatRouter.get('/stats', getAnnouncementStatsHandler);
chatRouter.get('/announcements/:id/stats', getAnnouncementStatsHandler);


