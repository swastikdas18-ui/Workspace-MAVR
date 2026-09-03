import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useRealtime } from '../../lib/realtime';
import { api } from '../../lib/api';
import { Conversation, ChatMessage, ConversationMember, User } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import {
  MessageSquare, Hash, Megaphone, Users, FolderKanban, Building2,
  Search, Send, Smile, MoreVertical, Edit3, Trash2, Plus,
  Shield, Check, Clock, AlertCircle, X, ChevronRight, Info, CheckCheck,
  ChevronDown, ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '👀', '🎉'];

export const ChatView: React.FC = () => {
  const { currentUser, currentRole, users, addToast } = useWorkspace();
  const isAdmin = currentRole === 'admin';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState<boolean>(true);
  const [loadingMsgs, setLoadingMsgs] = useState<boolean>(false);
  const [loadingOlder, setLoadingOlder] = useState<boolean>(false);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean>(false);

  // Search & Filter Tabs
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'unread' | 'mentions'>('all');

  // Typing Indicator State
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Composer
  const [messageInput, setMessageInput] = useState<string>('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);

  // Mention Suggestion
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  // Modals & Panels
  const [isNewDmOpen, setIsNewDmOpen] = useState<boolean>(false);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 1. Fetch conversations with optional filter
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

        // Mark conversation as read on server with last message id
        const lastMsg = res.messages.length > 0 ? res.messages[res.messages.length - 1] : undefined;
        await api.markChatConversationRead(convId, lastMsg?.id);

        // Update unread count & mention locally
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0, hasUnreadMention: false } : c))
        );
      }
    } catch (err: any) {
      console.warn('[ChatView] Failed to load messages:', err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    }
  }, [activeConvId]);

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

  // Scroll to bottom when messages update (unless loading older)
  useEffect(() => {
    if (!loadingOlder) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, loadingOlder]);

  // Real-time: Listen for new messages (chat.message.created contract)
  useRealtime('chat.message.created', (payload: any) => {
    const msg = payload?.message || payload;
    if (!msg || !msg.conversationId) return;

    if (msg.conversationId === activeConvId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Instantly mark as read
      api.markChatConversationRead(msg.conversationId, msg.id).catch(() => {});

      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt, unreadCount: 0, hasUnreadMention: false }
            : c
        )
      );
    } else {
      // Inactive conversation: increment unread badge & check mention
      const myName = (currentUser.name || '').toLowerCase();
      const myFirstName = (myName.split(' ')[0] || '').toLowerCase();
      const myEmailPrefix = ((currentUser.email || '').split('@')[0] || '').toLowerCase();
      const isMentioned =
        (msg.mentions || []).some((m: string) => {
          const ml = m.toLowerCase();
          return ml.includes(myName) || ml.includes(myFirstName) || ml.includes(myEmailPrefix);
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
  }, [activeConvId, currentUser]);

  // Real-time: Listen for typing indicators (chat.user.typing)
  useRealtime('chat.user.typing', (payload: any) => {
    if (payload?.conversationId === activeConvId && payload?.userId !== currentUser.id) {
      setTypingUser(payload.name || 'Someone');
    }
  }, [activeConvId, currentUser]);

  // Typing indicator 3s auto-expiry
  useEffect(() => {
    if (!typingUser) return;
    const timer = setTimeout(() => {
      setTypingUser(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [typingUser]);

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Helper to format conversation title
  const getConversationTitle = (conv: Conversation): string => {
    if (conv.type === 'dm') {
      const otherMember = conv.members?.find((m) => m.userId !== currentUser.id);
      return otherMember?.user?.name || 'Direct Message';
    }
    if (conv.type === 'announcement') {
      return 'Announcements';
    }
    return conv.title || 'Channel';
  };

  // Helper to format conversation subtitle
  const getConversationSubtitle = (conv: Conversation): string => {
    if (conv.type === 'dm') {
      const otherMember = conv.members?.find((m) => m.userId !== currentUser.id);
      return otherMember?.user?.role ? `Direct Message • ${otherMember.user.role.toUpperCase()}` : 'Direct Message';
    }
    if (conv.type === 'announcement') return 'Official Company Broadcast';
    if (conv.type === 'department') return 'Department Channel';
    if (conv.type === 'project') return 'Initiative Discussion';
    return '';
  };

  // Helper icon for conversation type
  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-rose-400" />;
      case 'department':
        return <Building2 className="w-4 h-4 text-purple-400" />;
      case 'project':
        return <FolderKanban className="w-4 h-4 text-blue-400" />;
      case 'dm':
      default:
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
    }
  };

  // Check if current user can write to active conversation
  const isAnnouncement = activeConversation?.type === 'announcement';
  const canWrite = !isAnnouncement || isAdmin;

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeConvId || !canWrite) return;

    const content = messageInput.trim();
    setMessageInput('');
    setMentionQuery(null);

    try {
      const res = await api.sendChatMessage(activeConvId, content);
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

  // Filter conversations
  const filteredConvs = conversations.filter((c) => {
    // 1. Filter Tab
    if (activeFilterTab === 'unread' && (!c.unreadCount || c.unreadCount <= 0)) {
      return false;
    }
    if (activeFilterTab === 'mentions' && !c.hasUnreadMention) {
      return false;
    }

    // 2. Search Query
    if (searchQuery) {
      const title = getConversationTitle(c).toLowerCase();
      return title.includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const announcementConvs = filteredConvs.filter((c) => c.type === 'announcement');
  const dmConvs = filteredConvs.filter((c) => c.type === 'dm');
  const departmentConvs = filteredConvs.filter((c) => c.type === 'department');
  const projectConvs = filteredConvs.filter((c) => c.type === 'project');

  // Input change for @mentions & typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageInput(val);

    // Throttle typing indicator
    const now = Date.now();
    if (activeConvId && now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      api.sendChatTyping(activeConvId).catch(() => {});
    }

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    if (lastAt !== -1 && cursor - lastAt <= 15) {
      const query = textBeforeCursor.slice(lastAt + 1);
      setMentionQuery(query);
    } else {
      setMentionQuery(null);
    }
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

    return (
      <button
        key={c.id}
        onClick={() => setActiveConvId(c.id)}
        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
          isActive
            ? 'bg-purple-600/20 border border-purple-500/40 text-white'
            : 'text-slate-300 hover:bg-white/[0.04] border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
          {isDM ? (
            other?.user ? (
              <UserAvatar user={other.user as any} size="sm" />
            ) : (
              <MessageSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )
          ) : (
            getConversationIcon(c.type)
          )}
          <div className="truncate flex-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold truncate">
                {isDM ? getConversationTitle(c) : `#${getConversationTitle(c)}`}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {c.lastMessage?.content || 'No messages yet'}
            </p>
          </div>
        </div>

        {/* Badges container */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          {c.hasUnreadMention && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.2 rounded-full font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Mentioned You
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
      {/* 1. LEFT SIDEBAR: CONVERSATIONS DIRECTORY */}
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
                <h2 className="text-sm font-bold text-white tracking-tight">Communication Hub</h2>
                <p className="text-[10px] text-slate-400 font-mono">Workspace Discussions</p>
              </div>
            </div>

            <button
              onClick={() => setIsNewDmOpen(true)}
              className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
              title="New Direct Message"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar */}
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

          {/* Filter Tabs: All, Unread, Mentions */}
          <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-white/[0.04]">
            {(['all', 'unread', 'mentions'] as const).map((tab) => {
              const isActive = activeFilterTab === tab;
              const label = tab === 'all' ? 'All' : tab === 'unread' ? 'Unread' : 'Mentions';
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilterTab(tab)}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
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
              {/* SECTION: ANNOUNCEMENTS */}
              {announcementConvs.length > 0 && (
                <div>
                  <span className="px-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-rose-400/80">
                    Announcements
                  </span>
                  <div className="mt-1 space-y-1">
                    {announcementConvs.map(renderConversationItem)}
                  </div>
                </div>
              )}

              {/* SECTION: DIRECT MESSAGES */}
              <div>
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                    Direct Messages ({dmConvs.length})
                  </span>
                  <button
                    onClick={() => setIsNewDmOpen(true)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 cursor-pointer"
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

              {/* SECTION: DEPARTMENTS */}
              <div>
                <span className="px-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-purple-400/80">
                  Departments ({departmentConvs.length})
                </span>
                <div className="mt-1 space-y-1">
                  {departmentConvs.map(renderConversationItem)}
                  {departmentConvs.length === 0 && (
                    <p className="px-3 py-1 text-[11px] text-slate-500 italic">No department channels.</p>
                  )}
                </div>
              </div>

              {/* SECTION: PROJECTS */}
              <div>
                <span className="px-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-400/80">
                  Projects & Initiatives ({projectConvs.length})
                </span>
                <div className="mt-1 space-y-1">
                  {projectConvs.map(renderConversationItem)}
                  {projectConvs.length === 0 && (
                    <p className="px-3 py-1 text-[11px] text-slate-500 italic">No project channels.</p>
                  )}
                </div>
              </div>

              {filteredConvs.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                  <p>No conversations match the current filter.</p>
                  {activeFilterTab !== 'all' && (
                    <button
                      onClick={() => setActiveFilterTab('all')}
                      className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
                    >
                      Reset filter
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CENTER PANE: MESSAGES & COMPOSER */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-[#0B0F17] overflow-hidden">
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-white/[0.08] bg-[#0F172A]/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  {getConversationIcon(activeConversation.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {getConversationTitle(activeConversation)}
                    </h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                      {activeConversation.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate max-w-md">
                    {activeConversation.description || getConversationSubtitle(activeConversation)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRightSidebar(!showRightSidebar)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  showRightSidebar
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                }`}
                title="Toggle Members Panel"
              >
                <Users className="w-4 h-4" />
              </button>
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

            {/* Announcement Banner (if announcement) */}
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
              {/* Load older messages button */}
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

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative flex items-start gap-3 hover:bg-white/[0.02] -mx-4 px-4 py-2 rounded-xl transition-colors"
                    >
                      <UserAvatar
                        user={{ id: msg.senderId, name: senderName, avatar: senderAvatar } as any}
                        size="md"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
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
                            {msg.content}
                          </p>
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
                      </div>

                      {/* Action Menu on Hover */}
                      {!msg.isDeleted && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-2 flex items-center gap-1 bg-[#1E293B] border border-white/[0.08] rounded-xl p-1 shadow-lg">
                          {/* Quick Reactions */}
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
                    .filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                    .slice(0, 4)
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => insertMention(u.name.split(' ')[0])}
                        className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-purple-600/30 text-xs text-slate-200 cursor-pointer"
                      >
                        @{u.name}
                      </button>
                    ))}
                  <button
                    onClick={() => insertMention('Engineering')}
                    className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-600/30 text-xs text-purple-300 cursor-pointer"
                  >
                    @Engineering (Dept)
                  </button>
                </div>
              </div>
            )}

            {/* Message Composer */}
            <div className="p-4 border-t border-white/[0.08] bg-[#0F172A]/40">
              {canWrite ? (
                <form onSubmit={handleSendMessage} className="relative">
                  <textarea
                    ref={inputRef}
                    rows={2}
                    placeholder={`Message ${getConversationTitle(activeConversation)} (type @ to mention)...`}
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full bg-[#111827] border border-white/[0.08] focus:border-purple-500/50 rounded-2xl p-3 pr-24 text-xs text-white placeholder-slate-500 focus:outline-none resize-none transition-colors"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!messageInput.trim()}
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
            <p className="text-xs">Choose a channel or direct message from the left sidebar.</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. RIGHT SIDEBAR: MEMBERS & CONVERSATION DETAILS */}
      {/* ========================================================================= */}
      {showRightSidebar && activeConversation && (
        <div className="w-72 border-l border-white/[0.08] bg-[#0F172A]/70 backdrop-blur-xl flex flex-col flex-shrink-0 p-4 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Channel Details
            </h4>
            <button
              onClick={() => setShowRightSidebar(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* About */}
          <div className="space-y-2 text-xs">
            <span className="text-[10px] text-slate-500 font-mono uppercase">About</span>
            <p className="text-slate-300 leading-relaxed bg-[#111827] p-3 rounded-xl border border-white/[0.04]">
              {activeConversation.description || 'Workspace-native communication channel.'}
            </p>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono uppercase">
                Members ({activeConversation.members?.length || 0})
              </span>
            </div>

            <div className="space-y-2">
              {activeConversation.members?.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <UserAvatar user={m.user as any} size="sm" />
                    <div className="truncate text-xs">
                      <p className="font-semibold text-slate-200 truncate">{m.user?.name || 'User'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{m.user?.email}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400">
                    {m.user?.role || m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NEW DIRECT MESSAGE MODAL */}
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
                <MessageSquare className="w-4 h-4 text-purple-400" />
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
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartDm(u.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#111827] border border-white/[0.06] hover:border-purple-500/40 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={u} size="md" />
                      <div>
                        <p className="text-xs font-semibold text-white">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {u.role}
                    </span>
                  </button>
                ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
