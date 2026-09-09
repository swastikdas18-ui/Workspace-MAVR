import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useRealtime, usePresence } from '../../lib/realtime';
import { api, getFrontendUrl } from '../../lib/api';
import { Conversation, ChatMessage, ChatAttachment, User } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import {
  MessageSquare, Hash, Megaphone, Users, FolderKanban, Building2,
  Search, Send, Smile, MoreVertical, Edit3, Trash2, Plus,
  Shield, Check, Clock, AlertCircle, X, ChevronRight, Info, CheckCheck,
  ChevronDown, ArrowUp, CheckSquare, Square, Paperclip, Pin, PinOff,
  Download, FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon,
  CornerDownRight, Eye, MessageCircle, Filter, Sparkles,
  CheckCircle2, ListTodo, Copy, Link2, Terminal, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Phase 2C: Slash Commands definitions
const SLASH_COMMANDS = [
  {
    command: '/task',
    name: '/task <title>',
    description: 'Instantly create a workspace task and link it to this discussion',
    usage: '/task Build landing page',
    role: 'Admin & Employee',
  },
  {
    command: '/project',
    name: '/project <title>',
    description: 'Launch a new organizational project initiative',
    usage: '/project Create Workspace OS v2',
    role: 'Admin only',
  },
  {
    command: '/sop',
    name: '/sop <title>',
    description: 'Draft a new standard operating procedure document in knowledge base',
    usage: '/sop Deployment Protocol',
    role: 'Admin & Employee',
  },
  {
    command: '/remind',
    name: '/remind <text>',
    description: 'Trigger a persistent notification reminder with conversation deep-link',
    usage: '/remind Team sync tomorrow',
    role: 'All Members',
  },
  {
    command: '/poll',
    name: '/poll <question>',
    description: 'Launch an interactive team poll with real-time voting reactions',
    usage: '/poll Approve release?',
    role: 'All Members',
  },
];

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '👀', '🚀'];

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-pink-400" />;
  if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-rose-400" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
  }
  return <FileIcon className="w-4 h-4 text-blue-400" />;
}

export const ChatView: React.FC = () => {
  const { currentUser, currentRole, users, addToast } = useWorkspace();
  const isAdmin = currentRole === 'admin';
  const isIntern = currentRole === 'intern';
  const canCreateGroup = currentRole === 'admin' || currentRole === 'employee';
  const canUpload = !isIntern;

  const { presenceList } = usePresence();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState<boolean>(true);
  const [loadingMsgs, setLoadingMsgs] = useState<boolean>(false);
  const [loadingOlder, setLoadingOlder] = useState<boolean>(false);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean>(false);

  // Search & Filter Tabs
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'unread' | 'mentions' | 'assigned'>('all');

  // Typing Indicator State
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Composer State
  const [messageInput, setMessageInput] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention Suggestion
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  // Phase 2C: Slash Command Palette & Inline Preview State
  const [slashCommandQuery, setSlashCommandQuery] = useState<string | null>(null);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState<number>(0);

  // Thread Sub-Panel State
  const [activeThreadParentId, setActiveThreadParentId] = useState<string | null>(null);
  const [threadParentMessage, setThreadParentMessage] = useState<ChatMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ChatMessage[]>([]);
  const [threadInput, setThreadInput] = useState<string>('');
  const [loadingThread, setLoadingThread] = useState<boolean>(false);

  // Right Sidebar Tabs: 'members' | 'pinned' | 'files'
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);
  const [rightSidebarTab, setRightSidebarTab] = useState<'members' | 'pinned' | 'files'>('members');
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [conversationFiles, setConversationFiles] = useState<ChatAttachment[]>([]);
  const [loadingRightTab, setLoadingRightTab] = useState<boolean>(false);

  // Global Chat Search Modal
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [searchHasFileFilter, setSearchHasFileFilter] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{ messages: ChatMessage[]; conversations: Conversation[] }>({
    messages: [],
    conversations: [],
  });
  const [searchingGlobal, setSearchingGlobal] = useState<boolean>(false);

  // Modals & Creation
  const [isNewDmOpen, setIsNewDmOpen] = useState<boolean>(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState<boolean>(false);
  const [channelTitle, setChannelTitle] = useState<string>('');
  const [channelDescription, setChannelDescription] = useState<string>('');
  const [creatingChannel, setCreatingChannel] = useState<boolean>(false);

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState<boolean>(false);
  const [groupTitle, setGroupTitle] = useState<string>('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState<boolean>(false);

  // Message Readers State (Seen by...)
  const [readersMap, setReadersMap] = useState<Record<string, Array<{ id: string; name: string; avatar?: string }>>>({});

  // Phase 2A: Convert Message to Task Modal State
  const [taskTargetMessage, setTaskTargetMessage] = useState<ChatMessage | null>(null);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [taskAssignee, setTaskAssignee] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskDueDate, setTaskDueDate] = useState<string>('');
  const [creatingTask, setCreatingTask] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Helper for presence: 'online' | 'offline'
  const isUserOnline = (userId: string): boolean => {
    if (userId === currentUser.id) return true;
    const found = presenceList.find((p) => p.userId === userId);
    return found?.status === 'online';
  };

  // 1. Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoadingConvs(true);
      const res = await api.getChatConversations();
      if (res?.conversations) {
        setConversations(res.conversations);
        if (!activeConvId && res.conversations.length > 0) {
          setActiveConvId(res.conversations[0].id);
        }
      }
    } catch (err: any) {
      console.warn('[ChatView] Failed to load conversations:', err);
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Fetch messages when active conversation changes
  const fetchMessages = async (convId: string) => {
    try {
      setLoadingMsgs(true);
      const res = await api.getChatMessages(convId, { limit: 50 });
      if (res?.messages) {
        setMessages(res.messages);
        setHasMoreOlder(res.messages.length === 50);

        // Mark conversation read on server with last message id
        const lastMsg = res.messages.length > 0 ? res.messages[res.messages.length - 1] : undefined;
        await api.markChatConversationRead(convId, lastMsg?.id);

        // Update unread count & mention locally
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0, hasUnreadMention: false } : c))
        );

        // Fetch readers for the active conversation
        fetchConversationReaders(convId, lastMsg?.id);
      }
    } catch (err: any) {
      console.warn('[ChatView] Failed to load messages:', err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const fetchConversationReaders = async (convId: string, messageId?: string) => {
    try {
      const res = await api.getChatReaders(convId, messageId);
      if (res?.readers && messageId) {
        setReadersMap((prev) => ({ ...prev, [messageId]: res.readers }));
      }
    } catch {
      // Best-effort
    }
  };

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      // Reset thread subpanel when switching conversations
      setActiveThreadParentId(null);
      setThreadParentMessage(null);
      setThreadReplies([]);
      // Refresh right sidebar tab content
      if (rightSidebarTab === 'pinned') fetchPinned(activeConvId);
      if (rightSidebarTab === 'files') fetchFiles(activeConvId);
    }
  }, [activeConvId]);

  // Fetch right sidebar tabs
  const fetchPinned = async (convId: string) => {
    try {
      setLoadingRightTab(true);
      const res = await api.getChatPinnedMessages(convId);
      if (res?.pinned) setPinnedMessages(res.pinned);
    } catch (err) {
      console.warn('Failed to load pinned messages:', err);
    } finally {
      setLoadingRightTab(false);
    }
  };

  const fetchFiles = async (convId: string) => {
    try {
      setLoadingRightTab(true);
      const res = await api.getChatConversationFiles(convId);
      if (res?.files) setConversationFiles(res.files);
    } catch (err) {
      console.warn('Failed to load files:', err);
    } finally {
      setLoadingRightTab(false);
    }
  };

  useEffect(() => {
    if (!activeConvId) return;
    if (rightSidebarTab === 'pinned') fetchPinned(activeConvId);
    if (rightSidebarTab === 'files') fetchFiles(activeConvId);
  }, [rightSidebarTab, activeConvId]);

  // Load older 50 messages
  const handleLoadOlderMessages = async () => {
    if (!activeConvId || messages.length === 0 || loadingOlder) return;
    try {
      setLoadingOlder(true);
      const oldest = messages[0];
      const res = await api.getChatMessages(activeConvId, { before: oldest.createdAt, limit: 50 });
      if (res?.messages && res.messages.length > 0) {
        setMessages((prev) => [...res.messages, ...prev]);
        setHasMoreOlder(res.messages.length === 50);
      } else {
        setHasMoreOlder(false);
      }
    } catch (err) {
      console.warn('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    if (!loadingOlder) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, loadingOlder]);

  // Scroll thread replies to bottom
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadReplies.length]);

  // =========================================================================
  // REAL-TIME EVENT HANDLERS
  // =========================================================================
  useRealtime('chat.message.created', (payload: any) => {
    const msg = payload?.message || payload;
    if (!msg || !msg.conversationId) return;

    // 1. Thread reply routing
    if (msg.parentId) {
      if (msg.parentId === activeThreadParentId) {
        setThreadReplies((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      // Update parent message replyCount in main list
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.parentId ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m))
      );
      return;
    }

    // 2. Active conversation root message
    if (msg.conversationId === activeConvId) {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      api.markChatConversationRead(msg.conversationId, msg.id).catch(() => {});
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt, unreadCount: 0, hasUnreadMention: false }
            : c
        )
      );
    } else {
      // Inactive conversation: increment unread count & check mention
      const myName = (currentUser.name || '').toLowerCase();
      const myFirstName = (myName.split(' ')[0] || '').toLowerCase();
      const isMentioned =
        (msg.mentions || []).some((m: string) => {
          const ml = m.toLowerCase();
          return ml.includes(myName) || ml.includes(myFirstName) || ml.includes('everyone');
        }) || (msg.content || '').toLowerCase().includes(`@${myFirstName}`);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessage: msg,
                lastMessageAt: msg.createdAt,
                unreadCount: (c.unreadCount || 0) + (msg.senderId !== currentUser.id ? 1 : 0),
                hasUnreadMention: c.hasUnreadMention || (msg.senderId !== currentUser.id && isMentioned),
              }
            : c
        )
      );
    }
  }, [activeConvId, activeThreadParentId, currentUser]);

  useRealtime('chat.message.updated', (payload: any) => {
    const msg = payload?.message || payload;
    if (!msg) return;
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
    setThreadReplies((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
  }, []);

  useRealtime('chat.message.deleted', (payload: any) => {
    const messageId = payload?.messageId || payload?.id;
    if (!messageId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m))
    );
    setThreadReplies((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m))
    );
  }, []);

  useRealtime('chat.task.created', (payload: any) => {
    const { messageId, taskId, task } = payload || {};
    if (!messageId || !taskId) return;

    const newTaskItem = {
      id: crypto.randomUUID(),
      workspaceId: payload.workspaceId,
      messageId,
      taskId,
      createdBy: payload.createdBy,
      createdAt: payload.createdAt || new Date().toISOString(),
      task: task || { id: taskId, title: 'Task', status: 'todo', priority: 'medium' },
    };

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentTasks = m.linkedTasks || [];
        if (currentTasks.some((t) => t.taskId === taskId)) return m;
        return { ...m, linkedTasks: [...currentTasks, newTaskItem] };
      })
    );

    setThreadReplies((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentTasks = m.linkedTasks || [];
        if (currentTasks.some((t) => t.taskId === taskId)) return m;
        return { ...m, linkedTasks: [...currentTasks, newTaskItem] };
      })
    );
  }, []);

  // Phase 2B: Realtime Mention Alert
  useRealtime('chat.mention.created', (payload: any) => {
    if (!payload || payload.mentionedUserId !== currentUser.id) return;

    addToast({
      type: 'info',
      title: 'New Mention',
      message: `${payload.senderName || 'Someone'} mentioned you: "${payload.content?.slice(0, 60) || ''}"`,
    });

    if (payload.conversationId && payload.conversationId !== activeConvId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId
            ? { ...c, hasUnreadMention: true, unreadCount: (c.unreadCount || 0) + 1 }
            : c
        )
      );
    }
  }, [activeConvId, currentUser.id]);

  useRealtime('chat.channel.created', (payload: any) => {
    const conv = payload?.conversation || payload;
    if (conv?.id) {
      setConversations((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
    }
  }, []);

  useRealtime('chat.group.created', (payload: any) => {
    const conv = payload?.conversation || payload;
    if (conv?.id) {
      setConversations((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
    }
  }, []);

  useRealtime('chat.user.typing', (payload: any) => {
    if (payload?.conversationId === activeConvId && payload?.userId !== currentUser.id) {
      setTypingUser(payload.name || 'Someone');
    }
  }, [activeConvId, currentUser]);

  useRealtime('chat.typing.start', (payload: any) => {
    if (payload?.conversationId === activeConvId && payload?.userId !== currentUser.id) {
      setTypingUser(payload.name || 'Someone');
    }
  }, [activeConvId, currentUser]);

  useRealtime('chat.typing.stop', (payload: any) => {
    if (payload?.conversationId === activeConvId) {
      setTypingUser(null);
    }
  }, [activeConvId]);

  // Typing indicator 3s auto-expiry
  useEffect(() => {
    if (!typingUser) return;
    const timer = setTimeout(() => {
      setTypingUser(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [typingUser]);

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Format titles & icons
  const getConversationTitle = (conv: Conversation): string => {
    if (conv.type === 'dm') {
      const otherMember = conv.members?.find((m) => m.userId !== currentUser.id);
      return otherMember?.user?.name || 'Direct Message';
    }
    if (conv.type === 'announcement') return 'announcements';
    return conv.title || 'channel';
  };

  const getConversationSubtitle = (conv: Conversation): string => {
    if (conv.type === 'dm') {
      const otherMember = conv.members?.find((m) => m.userId !== currentUser.id);
      const online = otherMember ? isUserOnline(otherMember.userId) : false;
      return `${online ? 'Online' : 'Offline'} • Direct Message`;
    }
    if (conv.type === 'announcement') return 'Official Company Broadcast (Admin Only)';
    if (conv.type === 'department') return 'Department Channel';
    if (conv.type === 'project') return 'Initiative Discussion';
    if (conv.type === 'group') return `Group • ${conv.members?.length || 0} members`;
    return 'Channel Discussion';
  };

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-rose-400" />;
      case 'department':
        return <Building2 className="w-4 h-4 text-purple-400" />;
      case 'project':
        return <FolderKanban className="w-4 h-4 text-blue-400" />;
      case 'group':
        return <Users className="w-4 h-4 text-amber-400" />;
      case 'channel':
        return <Hash className="w-4 h-4 text-purple-400" />;
      case 'dm':
      default:
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
    }
  };

  const isAnnouncement = activeConversation?.type === 'announcement';
  const canWrite = !isAnnouncement || isAdmin;

  // =========================================================================
  // ACTIONS: SEND, EDIT, DELETE, ATTACHMENTS, PINNING, THREADS
  // =========================================================================

  // Handle Attachment Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canUpload) {
      addToast({ type: 'error', title: 'Upload Forbidden', message: 'Interns do not have permission to upload files.' });
      return;
    }

    try {
      setUploadingAttachment(true);
      const res = await api.uploadChatAttachment(file);
      if (res?.attachment) {
        setPendingAttachments((prev) => [...prev, res.attachment]);
        addToast({ type: 'success', title: 'File Attached', message: `${file.name} ready to send.` });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Upload Error', message: err.message || 'Failed to upload attachment.' });
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!messageInput.trim() && pendingAttachments.length === 0) || !activeConvId || !canWrite) return;

    const content = messageInput.trim();
    const attachments = pendingAttachments;
    setMessageInput('');
    setPendingAttachments([]);
    setMentionQuery(null);
    setSlashCommandQuery(null);

    // Phase 2C: Intercept Slack-style Slash Commands
    if (content.startsWith('/')) {
      try {
        const res = await api.executeChatSlashCommand(activeConvId, content);
        if (res?.message) {
          setMessages((prev) => [...prev, res.message]);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConvId
                ? { ...c, lastMessage: res.message, lastMessageAt: res.message.createdAt, unreadCount: 0 }
                : c
            )
          );
        }
        addToast({
          type: 'success',
          title: `Command ${res.slashCommand?.command || 'executed'}`,
          message: res.message?.content?.split('\n')[0] || 'Slash command executed successfully.',
        });
        return;
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Command Execution Error',
          message: err.message || 'Failed to execute slash command.',
        });
        return;
      }
    }

    try {
      const res = await api.sendChatMessage(activeConvId, content, {
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if (res?.message) {
        setMessages((prev) => [...prev, res.message]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? { ...c, lastMessage: res.message, lastMessageAt: res.message.createdAt, unreadCount: 0 }
              : c
          )
        );
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Chat Error', message: err.message || 'Failed to send message.' });
    }
  };

  // Edit message
  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await api.editChatMessage(messageId, editContent.trim());
      if (res?.message) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? res.message : m)));
        setEditingMessageId(null);
        setEditContent('');
        addToast({ type: 'success', title: 'Message Updated', message: 'Message updated.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Edit Error', message: err.message || 'Failed to edit message.' });
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.deleteChatMessage(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m))
      );
      addToast({ type: 'info', title: 'Message Deleted', message: 'Message deleted.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Delete Error', message: err.message || 'Failed to delete message.' });
    }
  };

  // Emoji reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await api.toggleChatMessageReaction(messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const currentReactions = m.reactions || [];
          if (res.added && res.reaction) {
            return { ...m, reactions: [...currentReactions, res.reaction] };
          } else {
            return {
              ...m,
              reactions: currentReactions.filter((r) => !(r.userId === currentUser.id && r.emoji === emoji)),
            };
          }
        })
      );
      setShowEmojiPickerFor(null);
    } catch (err: any) {
      console.warn('Failed to toggle reaction:', err);
    }
  };

  // Toggle Pin (Admin Only)
  const handleTogglePin = async (messageId: string) => {
    if (!isAdmin) {
      addToast({ type: 'error', title: 'Permission Denied', message: 'Only workspace Administrators can pin messages.' });
      return;
    }
    try {
      const res = await api.togglePinChatMessage(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned: res.isPinned } : m))
      );
      addToast({
        type: 'success',
        title: res.isPinned ? 'Message Pinned' : 'Message Unpinned',
        message: res.isPinned ? 'Message pinned to conversation.' : 'Message unpinned.',
      });
      if (activeConvId) fetchPinned(activeConvId);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Pin Error', message: err.message || 'Failed to pin message.' });
    }
  };

  // Open Thread Drawer
  const handleOpenThread = async (parentMsg: ChatMessage) => {
    setActiveThreadParentId(parentMsg.id);
    setThreadParentMessage(parentMsg);
    setThreadReplies([]);
    try {
      setLoadingThread(true);
      const res = await api.getChatThread(parentMsg.id);
      if (res?.replies) {
        setThreadReplies(res.replies);
      }
      if (res?.parent) {
        setThreadParentMessage(res.parent);
      }
    } catch (err) {
      console.warn('Failed to fetch thread replies:', err);
    } finally {
      setLoadingThread(false);
    }
  };

  // Send Reply in Thread
  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadInput.trim() || !activeThreadParentId) return;

    const content = threadInput.trim();
    setThreadInput('');

    try {
      const res = await api.sendChatThreadReply(activeThreadParentId, content);
      if (res?.reply) {
        setThreadReplies((prev) => [...prev, res.reply]);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === activeThreadParentId ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m
          )
        );
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reply Error', message: err.message || 'Failed to reply to thread.' });
    }
  };

  // Phase 2A: Open Create Task Modal with auto-fill
  const handleOpenCreateTask = (msg: ChatMessage) => {
    setTaskTargetMessage(msg);

    // Auto-fill Title: message content first line
    const lines = (msg.content || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const autoTitle = lines[0] ? (lines[0].length > 80 ? lines[0].slice(0, 77) + '...' : lines[0]) : 'New Task';
    setTaskTitle(autoTitle);

    // Auto-fill Description: original message quoted
    const autoDescription = `> ${(msg.content || '').split('\n').join('\n> ')}\n\n*Created from message by ${msg.sender?.name || 'team member'}*`;
    setTaskDescription(autoDescription);

    setTaskAssignee(currentUser.id);
    setTaskPriority('medium');
    setTaskDueDate('');
  };

  // Phase 2A: Submit Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTargetMessage || !taskTitle.trim()) return;

    try {
      setCreatingTask(true);
      const res = await api.createChatMessageTask(taskTargetMessage.id, {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        assignedTo: taskAssignee || currentUser.id,
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
      });

      if (res?.task && res?.messageTask) {
        addToast({
          type: 'success',
          title: 'Task Created',
          message: `Task "${res.task.title}" linked to message.`,
        });

        // Optimistically update message linkedTasks
        const newLinkedItem = {
          ...res.messageTask,
          task: res.task,
        };

        setMessages((prev) =>
          prev.map((m) =>
            m.id === taskTargetMessage.id
              ? { ...m, linkedTasks: [...(m.linkedTasks || []), newLinkedItem] }
              : m
          )
        );

        setThreadReplies((prev) =>
          prev.map((m) =>
            m.id === taskTargetMessage.id
              ? { ...m, linkedTasks: [...(m.linkedTasks || []), newLinkedItem] }
              : m
          )
        );

        setTaskTargetMessage(null);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Task Creation Failed',
        message: err.message || 'Failed to create task from message.',
      });
    } finally {
      setCreatingTask(false);
    }
  };

  // Copy Message Link / Content to clipboard
  const handleCopyMessageLink = (msg: ChatMessage) => {
    try {
      const url = getFrontendUrl(`/chat?messageId=${msg.id}`);
      navigator.clipboard.writeText(url);
      addToast({ type: 'info', title: 'Link Copied', message: 'Message link copied to clipboard.' });
    } catch {
      addToast({ type: 'info', title: 'Message Text Copied', message: 'Copied message to clipboard.' });
    }
  };

  // Global Search Handler
  const handleSearchGlobal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!globalSearchQuery.trim()) return;

    try {
      setSearchingGlobal(true);
      const res = await api.searchChat(globalSearchQuery.trim(), {
        hasFile: searchHasFileFilter ? true : undefined,
      });
      setSearchResults({
        messages: res.messages || [],
        conversations: res.conversations || [],
      });
    } catch (err: any) {
      console.warn('Failed to execute chat search:', err);
    } finally {
      setSearchingGlobal(false);
    }
  };

  // Start new DM
  const handleStartDm = async (targetUserId: string) => {
    try {
      const res = await api.createChatDm(targetUserId);
      if (res?.conversation) {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === res.conversation.id);
          return exists ? prev : [res.conversation, ...prev];
        });
        setActiveConvId(res.conversation.id);
        setIsNewDmOpen(false);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'DM Error', message: err.message || 'Failed to start direct message.' });
    }
  };

  // Create Channel (Admin only)
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelTitle.trim()) return;

    try {
      setCreatingChannel(true);
      const res = await api.createChatChannel(channelTitle.trim(), channelDescription.trim() || undefined);
      if (res?.conversation) {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === res.conversation.id);
          return exists ? prev : [res.conversation, ...prev];
        });
        setActiveConvId(res.conversation.id);
        setIsCreateChannelOpen(false);
        setChannelTitle('');
        setChannelDescription('');
        addToast({ type: 'success', title: 'Channel Created', message: `#${res.conversation.title} created successfully.` });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Channel Error', message: err.message || 'Failed to create channel.' });
    } finally {
      setCreatingChannel(false);
    }
  };

  // Create Group (Admin and Employee)
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTitle.trim()) return;

    try {
      setCreatingGroup(true);
      const res = await api.createChatGroup(groupTitle.trim(), selectedGroupMemberIds);
      if (res?.conversation) {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === res.conversation.id);
          return exists ? prev : [res.conversation, ...prev];
        });
        setActiveConvId(res.conversation.id);
        setIsCreateGroupOpen(false);
        setGroupTitle('');
        setSelectedGroupMemberIds([]);
        addToast({ type: 'success', title: 'Group Created', message: `${res.conversation.title} group created successfully.` });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Group Error', message: err.message || 'Failed to create group.' });
    } finally {
      setCreatingGroup(false);
    }
  };

  // Left sidebar filtering
  const filteredConvs = conversations.filter((c) => {
    if (activeFilterTab === 'unread' && (!c.unreadCount || c.unreadCount <= 0)) {
      return false;
    }
    if (activeFilterTab === 'mentions' && !c.hasUnreadMention) {
      return false;
    }
    if (activeFilterTab === 'assigned') {
      const isAssigned = c.members?.some((m) => m.userId === currentUser.id) || c.createdById === currentUser.id;
      if (!isAssigned) return false;
    }
    if (searchQuery) {
      const title = getConversationTitle(c).toLowerCase();
      return title.includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const channelConvs = filteredConvs.filter(
    (c) => c.type === 'channel' || c.type === 'announcement' || c.type === 'department' || c.type === 'project'
  );
  const groupConvs = filteredConvs.filter((c) => c.type === 'group');
  const dmConvs = filteredConvs.filter((c) => c.type === 'dm');

  // Input change for @mentions & typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageInput(val);

    // Throttle typing indicator
    const now = Date.now();
    if (activeConvId && now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      api.sendChatTyping(activeConvId, true).catch(() => {});
    }

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);

    // Detect Slack-style slash command when starting with /
    if (val.startsWith('/')) {
      const slashParts = val.split(' ');
      const cmdPart = slashParts[0].toLowerCase();
      setSlashCommandQuery(cmdPart);
      setSelectedSlashIndex(0);
    } else {
      setSlashCommandQuery(null);
    }

    const lastAt = textBeforeCursor.lastIndexOf('@');
    if (lastAt !== -1 && cursor - lastAt <= 15) {
      const query = textBeforeCursor.slice(lastAt + 1);
      setMentionQuery(query);
    } else {
      setMentionQuery(null);
    }
  };

  const insertSlashCommand = (cmd: string) => {
    setMessageInput(`${cmd} `);
    setSlashCommandQuery(null);
    inputRef.current?.focus();
  };

  const insertMention = (handle: string) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart;
    const textBefore = messageInput.slice(0, cursor);
    const textAfter = messageInput.slice(cursor);
    const lastAt = textBefore.lastIndexOf('@');
    const newText = textBefore.slice(0, lastAt) + `@${handle} ` + textAfter;
    setMessageInput(newText);
    setMentionQuery(null);
    inputRef.current.focus();
  };

  // Helper renderer for conversation item
  const renderConversationItem = (c: Conversation) => {
    const isDM = c.type === 'dm';
    const other = isDM ? c.members?.find((m) => m.userId !== currentUser.id) : null;
    const isActive = activeConvId === c.id;
    const isOnline = isDM && other ? isUserOnline(other.userId) : false;

    return (
      <button
        key={c.id}
        onClick={() => setActiveConvId(c.id)}
        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
          isActive
            ? 'bg-purple-600/20 border border-purple-500/40 text-white font-medium shadow-sm shadow-purple-900/30'
            : 'text-slate-300 hover:bg-white/[0.04] border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
          {isDM ? (
            <div className="relative flex-shrink-0">
              {other?.user ? (
                <UserAvatar user={other.user as any} size="sm" />
              ) : (
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              )}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0F172A] ${
                  isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            </div>
          ) : (
            <div className="flex-shrink-0">{getConversationIcon(c.type)}</div>
          )}
          <div className="truncate flex-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold truncate">
                {isDM ? getConversationTitle(c) : `#${getConversationTitle(c)}`}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {c.lastMessage?.content || (c.lastMessage?.attachments?.length ? 'Shared a file' : 'No messages yet')}
            </p>
          </div>
        </div>

        {/* Badges container */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          {c.hasUnreadMention && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.2 rounded-full font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Mention
            </span>
          )}
          {c.unreadCount && c.unreadCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold font-mono shadow-sm shadow-red-500/30">
              {c.unreadCount}
            </span>
          ) : null}
        </div>
      </button>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0B0F17] text-slate-100 overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl">
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR: CHANNELS, GROUPS & DIRECT MESSAGES */}
      {/* ========================================================================= */}
      <div className="w-80 border-r border-white/[0.08] bg-[#0F172A]/70 backdrop-blur-xl flex flex-col flex-shrink-0">
        {/* Header, Search & Filter Tabs */}
        <div className="p-4 border-b border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Workspace Chat</h2>
                <p className="text-[10px] text-slate-400 font-mono">Slack-Grade Hub</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 transition-colors cursor-pointer"
                title="Global Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              {isAdmin && (
                <button
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
                  title="Create Channel (Admin Only)"
                >
                  <Hash className="w-3.5 h-3.5" />
                </button>
              )}
              {canCreateGroup && (
                <button
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="p-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white transition-colors cursor-pointer"
                  title="Create Group"
                >
                  <Users className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsNewDmOpen(true)}
                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                title="New Direct Message"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick filter search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111827] border border-white/[0.06] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          {/* Filter Tabs: All, Unread, Mentions, Assigned */}
          <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-white/[0.04]">
            {(['all', 'unread', 'mentions', 'assigned'] as const).map((tab) => {
              const isActive = activeFilterTab === tab;
              const label = tab === 'all' ? 'All' : tab === 'unread' ? 'Unread' : tab === 'mentions' ? 'Mentions' : 'Assigned';
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilterTab(tab)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer text-center ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {loadingConvs ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading channels...</div>
          ) : (
            <>
              {/* SECTION 1: CHANNELS */}
              <div>
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-purple-400/80 flex items-center gap-1.5">
                    <Hash className="w-3 h-3" />
                    Channels ({channelConvs.length})
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setIsCreateChannelOpen(true)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-mono font-semibold cursor-pointer"
                      title="Add Channel (Admin only)"
                    >
                      + Add
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {channelConvs.map(renderConversationItem)}
                  {channelConvs.length === 0 && (
                    <p className="px-3 py-1 text-[11px] text-slate-500 italic">No channels available.</p>
                  )}
                </div>
              </div>

              {/* SECTION 2: GROUPS */}
              <div>
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-400/80 flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    Groups ({groupConvs.length})
                  </span>
                  {canCreateGroup && (
                    <button
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-mono font-semibold cursor-pointer"
                      title="Create Group"
                    >
                      + Add
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {groupConvs.map(renderConversationItem)}
                  {groupConvs.length === 0 && (
                    <p className="px-3 py-1 text-[11px] text-slate-500 italic">No group chats yet.</p>
                  )}
                </div>
              </div>

              {/* SECTION 3: DIRECT MESSAGES */}
              <div>
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400/80 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" />
                    Direct Messages ({dmConvs.length})
                  </span>
                  <button
                    onClick={() => setIsNewDmOpen(true)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono font-semibold cursor-pointer"
                    title="New Direct Message"
                  >
                    + New
                  </button>
                </div>
                <div className="space-y-1">
                  {dmConvs.map(renderConversationItem)}
                  {dmConvs.length === 0 && (
                    <p className="px-3 py-1 text-[11px] text-slate-500 italic">No direct messages.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CENTER PANEL: HEADER, MESSAGES FEED & COMPOSER */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-[#0B0F17] overflow-hidden">
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-white/[0.08] bg-[#0F172A]/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  {getConversationIcon(activeConversation.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {activeConversation.type === 'dm'
                        ? getConversationTitle(activeConversation)
                        : `#${getConversationTitle(activeConversation)}`}
                    </h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                      {activeConversation.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* Presence display for DM */}
                    {activeConversation.type === 'dm' && (() => {
                      const other = activeConversation.members?.find((m) => m.userId !== currentUser.id);
                      const online = other ? isUserOnline(other.userId) : false;
                      return (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}
                          />
                          <span className={`text-[11px] font-medium font-mono ${online ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {online ? 'Online' : 'Offline'}
                          </span>
                          <span className="text-slate-600">•</span>
                        </div>
                      );
                    })()}
                    <p className="text-xs text-slate-400 truncate max-w-md">
                      {activeConversation.description || getConversationSubtitle(activeConversation)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="p-2 rounded-xl bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-white transition-colors cursor-pointer"
                  title="Search Chat"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    showRightSidebar
                      ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                      : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                  }`}
                  title="Toggle Conversation Panel"
                >
                  <Users className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Typing Indicator Banner */}
            <AnimatePresence>
              {typingUser && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-1.5 bg-purple-500/10 border-b border-purple-500/20 flex items-center gap-2 text-[11px] text-purple-300 font-medium"
                >
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]" />
                  </span>
                  <span>{typingUser} is typing...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Announcement Banner */}
            {isAnnouncement && (
              <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2 text-xs text-rose-300">
                <Shield className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>
                  {isAdmin
                    ? '📢 You have Administrator write access to post company announcements.'
                    : '📢 Official Announcement Channel: Read-only for employees and interns.'}
                </span>
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {hasMoreOlder && (
                <div className="text-center py-2">
                  <button
                    onClick={handleLoadOlderMessages}
                    disabled={loadingOlder}
                    className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-slate-300 font-mono transition-all cursor-pointer"
                  >
                    {loadingOlder ? 'Loading older messages...' : '↑ Load older messages (50)'}
                  </button>
                </div>
              )}

              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-500">
                  Loading discussion...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500 space-y-2">
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    {getConversationIcon(activeConversation.type)}
                  </div>
                  <p className="text-sm font-medium text-slate-300">No messages in this channel yet.</p>
                  <p className="text-xs max-w-xs">
                    {canWrite
                      ? 'Be the first to post a message or share an update with the team.'
                      : 'Waiting for official announcements from Workspace Administrators.'}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderId === currentUser.id;
                  const senderName = msg.sender?.name || (isOwn ? currentUser.name : 'Team Member');
                  const senderAvatar = msg.sender?.avatar || (isOwn ? currentUser.avatar : undefined);
                  const isEditing = editingMessageId === msg.id;

                  // Group reactions by emoji
                  const reactionCounts: Record<string, { count: number; userReacted: boolean }> = {};
                  (msg.reactions || []).forEach((r) => {
                    if (!reactionCounts[r.emoji]) {
                      reactionCounts[r.emoji] = { count: 0, userReacted: false };
                    }
                    reactionCounts[r.emoji].count++;
                    if (r.userId === currentUser.id) {
                      reactionCounts[r.emoji].userReacted = true;
                    }
                  });

                  // Readers for this message
                  const readers = readersMap[msg.id] || [];

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group relative flex items-start gap-3 -mx-4 px-4 py-2.5 rounded-xl transition-colors ${
                        msg.isPinned ? 'bg-amber-500/[0.04] border-l-2 border-amber-400' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <UserAvatar
                        user={{ id: msg.senderId, name: senderName, avatar: senderAvatar } as any}
                        size="md"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">{senderName}</span>
                          {msg.sender?.role && (
                            <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400">
                              {msg.sender.role}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.isEdited && (
                            <span className="text-[10px] text-slate-500 italic">(edited)</span>
                          )}
                          {msg.isPinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded-md border border-amber-400/20">
                              <Pin className="w-3 h-3 text-amber-400" />
                              Pinned
                            </span>
                          )}
                        </div>

                        {/* Content or Edit Box */}
                        {isEditing ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              rows={2}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full bg-[#111827] border border-purple-500/50 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSaveEdit(msg.id)}
                                className="px-3 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditContent('');
                                }}
                                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className={`text-xs mt-1 leading-relaxed ${
                              msg.isDeleted ? 'text-slate-500 italic' : 'text-slate-200'
                            }`}
                          >
                            {msg.content.split(/(@[a-zA-Z0-9._-]+)/g).map((part, partIdx) => {
                              if (part.startsWith('@')) {
                                const isEveryone = part.toLowerCase() === '@everyone';
                                const isAdminMention = part.toLowerCase() === '@admins';
                                const isTeam = part.toLowerCase() === '@team';
                                return (
                                  <span
                                    key={partIdx}
                                    className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-semibold text-[11px] font-mono transition-all ${
                                      isEveryone
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : isAdminMention
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : isTeam
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        : 'bg-purple-600/25 text-purple-200 border border-purple-500/30 hover:bg-purple-600/40'
                                    }`}
                                  >
                                    {part}
                                  </span>
                                );
                              }
                              return part;
                            })}
                          </p>
                        )}

                        {/* File Attachments Rendering */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {msg.attachments.map((att) => {
                              const isImg = att.mimeType.startsWith('image/');
                              return (
                                <div
                                  key={att.id}
                                  className="group/att flex items-center gap-2 p-2 rounded-xl bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 transition-all max-w-xs"
                                >
                                  {isImg ? (
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 flex items-center justify-center border border-white/[0.06]">
                                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="p-2 rounded-lg bg-white/[0.04]">
                                      {getFileIcon(att.mimeType)}
                                    </div>
                                  )}
                                  <div className="truncate flex-1 text-left">
                                    <p className="text-xs font-semibold text-slate-200 truncate">{att.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{formatFileSize(att.size)}</p>
                                  </div>
                                  <a
                                    href={att.url}
                                    download={att.name}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                                    title="Download File"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Reactions Row */}
                        {Object.keys(reactionCounts).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {Object.entries(reactionCounts).map(([emoji, data]) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-all cursor-pointer ${
                                  data.userReacted
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-mono text-[10px] font-bold">{data.count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Thread Replies Button (Slack style) */}
                        {(msg.replyCount && msg.replyCount > 0) ? (
                          <button
                            onClick={() => handleOpenThread(msg)}
                            className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-[11px] text-purple-300 font-semibold cursor-pointer transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
                            <span>
                              {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-purple-400 font-mono text-[10px]">View Thread →</span>
                          </button>
                        ) : null}

                        {/* Phase 2A: Linked Task Badges */}
                        {msg.linkedTasks && msg.linkedTasks.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {msg.linkedTasks.map((lt) => (
                              <button
                                key={lt.id || lt.taskId}
                                onClick={() => {
                                  window.location.href = `/tasks?id=${lt.taskId}`;
                                }}
                                className="group/task inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-all cursor-pointer"
                                title="Click to open task"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                                      ✓ Linked Task
                                    </span>
                                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                                      {lt.task?.status || 'todo'}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-white group-hover/task:text-emerald-300 truncate max-w-[200px]">
                                    {lt.task?.title || 'Linked Task'}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Read Receipts (Seen by...) */}
                        {readers.length > 0 && isOwn && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-mono">
                            <CheckCheck className="w-3 h-3 text-emerald-400" />
                            <span>Seen by {readers.map((r) => r.name.split(' ')[0]).join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Hover Action Menu */}
                      {!msg.isDeleted && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-2 flex items-center gap-1 bg-[#1E293B] border border-white/[0.08] rounded-xl p-1 shadow-lg z-10">
                          {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="p-1 hover:bg-white/[0.08] rounded-lg text-xs cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}

                          <button
                            onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                            className="p-1 hover:bg-white/[0.08] rounded-lg text-slate-400 hover:text-white cursor-pointer"
                            title="Add Reaction"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenThread(msg)}
                            className="p-1 hover:bg-white/[0.08] rounded-lg text-slate-400 hover:text-purple-400 cursor-pointer"
                            title="Reply in Thread"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Phase 2A: Create Task from Message */}
                          <button
                            onClick={() => handleOpenCreateTask(msg)}
                            className="p-1 hover:bg-emerald-500/20 rounded-lg text-slate-400 hover:text-emerald-400 cursor-pointer"
                            title="Create Task from Message"
                          >
                            <ListTodo className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy Link to Message */}
                          <button
                            onClick={() => handleCopyMessageLink(msg)}
                            className="p-1 hover:bg-white/[0.08] rounded-lg text-slate-400 hover:text-blue-400 cursor-pointer"
                            title="Copy Link"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleTogglePin(msg.id)}
                              className={`p-1 rounded-lg cursor-pointer transition-colors ${
                                msg.isPinned
                                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                  : 'hover:bg-white/[0.08] text-slate-400 hover:text-amber-400'
                              }`}
                              title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                            >
                              {msg.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {isOwn && (
                            <button
                              onClick={() => {
                                setEditingMessageId(msg.id);
                                setEditContent(msg.content);
                              }}
                              className="p-1 hover:bg-white/[0.08] rounded-lg text-slate-400 hover:text-white cursor-pointer"
                              title="Edit Message"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(isOwn || isAdmin) && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                              title="Delete Message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Mention Suggestions Popover */}
            {mentionQuery !== null && (
              <div className="mx-4 p-2 bg-[#1E293B] border border-purple-500/30 rounded-xl shadow-xl space-y-1">
                <span className="text-[10px] font-mono text-purple-300 font-semibold px-2">
                  Mention suggestions:
                </span>
                <div className="flex flex-wrap gap-1">
                  {users
                    .filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()) || u.email.toLowerCase().includes(mentionQuery.toLowerCase()))
                    .slice(0, 5)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => insertMention(u.name.split(' ')[0])}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-purple-600/30 text-xs text-slate-200 cursor-pointer"
                      >
                        <span className="text-purple-400 font-bold">@</span>
                        <span>{u.name}</span>
                        {u.role && (
                          <span className="text-[9px] uppercase font-mono px-1 rounded bg-white/[0.06] text-slate-400">
                            {u.role}
                          </span>
                        )}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => insertMention('everyone')}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-600/30 text-xs text-purple-300 cursor-pointer font-bold border border-purple-500/20"
                  >
                    @everyone
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMention('team')}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-600/30 text-xs text-blue-300 cursor-pointer font-bold border border-blue-500/20"
                  >
                    @team
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMention('admins')}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-600/30 text-xs text-rose-300 cursor-pointer font-bold border border-rose-500/20"
                  >
                    @admins
                  </button>
                </div>
              </div>
            )}

            {/* Pending Attachments Bar */}
            {pendingAttachments.length > 0 && (
              <div className="px-4 py-2 bg-[#111827] border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Attached files:</span>
                {pendingAttachments.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200"
                  >
                    {getFileIcon(att.mimeType)}
                    <span className="truncate max-w-[150px]">{att.name}</span>
                    <button
                      onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-400 ml-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Phase 2C: Slack-Style Slash Command Palette Popup */}
            {slashCommandQuery !== null && (
              <div className="mx-4 mb-2 p-3 bg-[#0F172A]/95 border border-purple-500/40 rounded-2xl shadow-2xl backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-purple-500/20 text-purple-400">
                      <Terminal className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">Slash Commands</span>
                    <span className="text-[10px] text-slate-400 font-mono">Use ↑↓ to navigate, Tab/Enter to choose</span>
                  </div>
                  <span className="text-[10px] text-purple-400 font-mono font-medium">
                    {SLASH_COMMANDS.filter((cmd) => cmd.command.toLowerCase().startsWith(slashCommandQuery.toLowerCase())).length} available
                  </span>
                </div>

                {/* Commands list */}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {SLASH_COMMANDS
                    .filter((cmd) => cmd.command.toLowerCase().startsWith(slashCommandQuery.toLowerCase()))
                    .map((cmd, idx) => {
                      const isSelected = idx === selectedSlashIndex;
                      return (
                        <div
                          key={cmd.command}
                          onClick={() => insertSlashCommand(cmd.command)}
                          className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600/25 border border-purple-500/50 text-white shadow-sm shadow-purple-900/40'
                              : 'text-slate-300 hover:bg-white/[0.04] border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-purple-300">{cmd.name}</span>
                            <span className="text-[11px] text-slate-400 truncate max-w-xs">{cmd.description}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] font-mono text-slate-500">{cmd.role}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-purple-300 font-mono">
                              Tab ↹
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Inline Preview Banner */}
                {(() => {
                  const filtered = SLASH_COMMANDS.filter((cmd) => cmd.command.toLowerCase().startsWith(slashCommandQuery.toLowerCase()));
                  const activeCmd = filtered[selectedSlashIndex] || filtered[0];
                  if (!activeCmd) return null;
                  return (
                    <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5 font-mono text-purple-300 truncate">
                        <span className="text-slate-400 font-sans">Example:</span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">
                          {activeCmd.usage}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Hit Enter to run directly</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Message Composer */}
            <div className="p-4 border-t border-white/[0.08] bg-[#0F172A]/40">
              {canWrite ? (
                <form onSubmit={handleSendMessage} className="relative">
                  <textarea
                    ref={inputRef}
                    rows={2}
                    placeholder={`Message #${getConversationTitle(activeConversation)} (type '/' for commands, Enter to send)...`}
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      const filtered = SLASH_COMMANDS.filter((cmd) =>
                        slashCommandQuery ? cmd.command.toLowerCase().startsWith(slashCommandQuery.toLowerCase()) : false
                      );

                      if (slashCommandQuery !== null && filtered.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedSlashIndex((prev) => (prev + 1) % filtered.length);
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedSlashIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
                          return;
                        }
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const target = filtered[selectedSlashIndex] || filtered[0];
                          if (target) insertSlashCommand(target.command);
                          return;
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setSlashCommandQuery(null);
                          return;
                        }
                      }

                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full bg-[#111827] border border-white/[0.08] focus:border-purple-500/50 rounded-2xl p-3 pr-32 text-xs text-white placeholder-slate-500 focus:outline-none resize-none transition-colors"
                  />

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                    {/* Attachment upload button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canUpload || uploadingAttachment}
                      className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                        canUpload
                          ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-300 hover:text-white'
                          : 'opacity-40 bg-white/[0.02] border-transparent text-slate-600 cursor-not-allowed'
                      }`}
                      title={canUpload ? 'Upload Attachment (PDF, Image, Doc)' : 'Interns cannot upload files'}
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <button
                      type="submit"
                      disabled={(!messageInput.trim() && pendingAttachments.length === 0) || uploadingAttachment}
                      className="px-3 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:hover:bg-[#7C3AED] text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span>This channel is read-only. Only workspace Administrators can post announcements.</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">Select a conversation to begin</p>
            <p className="text-xs">Choose a channel, group, or direct message from the left sidebar.</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. THREAD SUB-PANEL (SLACK STYLE DRAWER) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeThreadParentId && threadParentMessage && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 340 }}
            exit={{ opacity: 0, width: 0 }}
            className="border-l border-white/[0.08] bg-[#0F172A]/90 backdrop-blur-xl flex flex-col flex-shrink-0 overflow-hidden"
          >
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CornerDownRight className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Thread Discussion
                </h4>
              </div>
              <button
                onClick={() => {
                  setActiveThreadParentId(null);
                  setThreadParentMessage(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Parent Message Header */}
            <div className="p-3.5 bg-[#111827] border-b border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2">
                <UserAvatar user={threadParentMessage.sender as any} size="sm" />
                <div>
                  <p className="text-xs font-bold text-white">{threadParentMessage.sender?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {new Date(threadParentMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{threadParentMessage.content}</p>
            </div>

            {/* Thread Replies List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {loadingThread ? (
                <div className="p-4 text-center text-xs text-slate-500">Loading thread replies...</div>
              ) : threadReplies.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No replies yet. Start the thread!</p>
              ) : (
                threadReplies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02]">
                    <UserAvatar user={reply.sender as any} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white">{reply.sender?.name || 'User'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{reply.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Thread Reply Composer */}
            <form onSubmit={handleSendThreadReply} className="p-3 border-t border-white/[0.08] bg-[#0B0F17]/50 flex gap-2">
              <input
                type="text"
                placeholder="Reply to thread..."
                value={threadInput}
                onChange={(e) => setThreadInput(e.target.value)}
                className="flex-1 bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
              />
              <button
                type="submit"
                disabled={!threadInput.trim()}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. RIGHT SIDEBAR: MEMBERS, PINNED & FILES TABS */}
      {/* ========================================================================= */}
      {showRightSidebar && activeConversation && (
        <div className="w-72 border-l border-white/[0.08] bg-[#0F172A]/70 backdrop-blur-xl flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Details & Tools
            </h4>
            <button
              onClick={() => setShowRightSidebar(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Right Panel Navigation Tabs */}
          <div className="flex border-b border-white/[0.06] bg-[#111827]/40">
            {(['members', 'pinned', 'files'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightSidebarTab(tab)}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider font-mono border-b-2 transition-all cursor-pointer ${
                  rightSidebarTab === tab
                    ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: MEMBERS */}
            {rightSidebarTab === 'members' && (
              <div className="space-y-3">
                <span className="text-[10px] text-slate-500 font-mono uppercase">
                  Members ({activeConversation.members?.length || 0})
                </span>
                <div className="space-y-2">
                  {activeConversation.members?.map((m) => {
                    const online = isUserOnline(m.userId);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="relative flex-shrink-0">
                            <UserAvatar user={m.user as any} size="sm" />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0F172A] ${
                                online ? 'bg-emerald-500' : 'bg-slate-500'
                              }`}
                              title={online ? 'Online' : 'Offline'}
                            />
                          </div>
                          <div className="truncate text-xs">
                            <p className="font-semibold text-slate-200 truncate">{m.user?.name || 'User'}</p>
                            <p className={`text-[10px] font-mono capitalize ${online ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {online ? 'Online' : 'Offline'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 flex-shrink-0">
                          {m.user?.role || m.role}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: PINNED */}
            {rightSidebarTab === 'pinned' && (
              <div className="space-y-3">
                <span className="text-[10px] text-slate-500 font-mono uppercase">
                  Pinned Messages ({pinnedMessages.length})
                </span>
                {loadingRightTab ? (
                  <div className="p-4 text-center text-xs text-slate-500">Loading pinned items...</div>
                ) : pinnedMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6 italic">No pinned messages yet.</p>
                ) : (
                  <div className="space-y-2">
                    {pinnedMessages.map((pinned) => (
                      <div
                        key={pinned.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-amber-500/20 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{pinned.sender?.name || 'User'}</span>
                          {isAdmin && (
                            <button
                              onClick={() => handleTogglePin(pinned.id)}
                              className="text-slate-400 hover:text-amber-400 cursor-pointer"
                              title="Unpin"
                            >
                              <PinOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-slate-300 text-[11px] line-clamp-3">{pinned.content}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {new Date(pinned.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FILES */}
            {rightSidebarTab === 'files' && (
              <div className="space-y-3">
                <span className="text-[10px] text-slate-500 font-mono uppercase">
                  Shared Files ({conversationFiles.length})
                </span>
                {loadingRightTab ? (
                  <div className="p-4 text-center text-xs text-slate-500">Loading files...</div>
                ) : conversationFiles.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6 italic">No files shared yet.</p>
                ) : (
                  <div className="space-y-2">
                    {conversationFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs hover:border-purple-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {getFileIcon(file.mimeType)}
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <a
                          href={file.url}
                          download={file.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GLOBAL CHAT SEARCH */}
      {/* ========================================================================= */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsSearchModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Global Workspace Chat Search</h3>
              </div>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearchGlobal} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search messages, channels, or keywords..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] focus:border-purple-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setSearchHasFileFilter(!searchHasFileFilter)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  searchHasFileFilter
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>has:file</span>
              </button>
              <button
                type="submit"
                disabled={searchingGlobal || !globalSearchQuery.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
              >
                {searchingGlobal ? 'Searching...' : 'Search'}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[200px]">
              {searchingGlobal ? (
                <div className="p-8 text-center text-xs text-slate-500">Searching workspace discussions...</div>
              ) : searchResults.messages.length === 0 && searchResults.conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  {globalSearchQuery ? 'No results found matching your query.' : 'Enter a search term to find messages, files, and channels.'}
                </div>
              ) : (
                <>
                  {searchResults.messages.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => {
                        setActiveConvId(result.conversationId);
                        setIsSearchModalOpen(false);
                      }}
                      className="p-3 rounded-xl bg-[#111827] border border-white/[0.06] hover:border-purple-500/40 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{result.sender?.name || 'User'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(result.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2">{result.content}</p>
                      {result.attachments && result.attachments.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-purple-400 font-mono">
                          <Paperclip className="w-3 h-3" />
                          <span>{result.attachments.length} attachment(s)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE CHANNEL (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {isCreateChannelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsCreateChannelOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-purple-400" />
                Create Channel
              </h3>
              <button
                onClick={() => setIsCreateChannelOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Channel Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">#</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. engineering, hr, operations"
                    value={channelTitle}
                    onChange={(e) => setChannelTitle(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] focus:border-purple-500/50 rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="What is this channel about?"
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateChannelOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingChannel || !channelTitle.trim()}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 cursor-pointer"
                >
                  {creatingChannel ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE GROUP (ADMIN & EMPLOYEE) */}
      {/* ========================================================================= */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsCreateGroupOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Create Group Chat
              </h3>
              <button
                onClick={() => setIsCreateGroupOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Group Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Sync, Sprint Squad"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] focus:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Members ({selectedGroupMemberIds.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-[#111827] rounded-xl border border-white/[0.06]">
                  {users
                    .filter((u) => u.id !== currentUser.id)
                    .map((u) => {
                      const isSelected = selectedGroupMemberIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedGroupMemberIds((prev) =>
                              isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <UserAvatar user={u} size="sm" />
                            <div>
                              <p className="text-xs font-medium text-white">{u.name}</p>
                              <p className="text-[10px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !groupTitle.trim()}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 cursor-pointer"
                >
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: START DIRECT MESSAGE */}
      {/* ========================================================================= */}
      {isNewDmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsNewDmOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Start Direct Message
              </h3>
              <button
                onClick={() => setIsNewDmOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">Select a colleague to open a direct conversation:</p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {users
                .filter((u) => u.id !== currentUser.id)
                .map((u) => {
                  const online = isUserOnline(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleStartDm(u.id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#111827] border border-white/[0.06] hover:border-emerald-500/40 text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex-shrink-0">
                          <UserAvatar user={u} size="md" />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111827] ${
                              online ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                            title={online ? 'Online' : 'Offline'}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {online ? (
                              <span className="text-emerald-400">Online</span>
                            ) : (
                              <span>{u.email}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {u.role}
                      </span>
                    </button>
                  );
                })}
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PHASE 2A CREATE TASK FROM MESSAGE */}
      {/* ========================================================================= */}
      {taskTargetMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setTaskTargetMessage(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-emerald-400" />
                Convert Message to Task
              </h3>
              <button
                onClick={() => setTaskTargetMessage(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Task Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Task title (first line of message)..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Quoted original message..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none font-mono"
                />
              </div>

              {/* Assignee & Priority Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Assignee
                  </label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-[#111827] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setTaskTargetMessage(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask || !taskTitle.trim()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{creatingTask ? 'Creating...' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
