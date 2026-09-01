import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Plus, Search, ChevronRight, FileText, Lock, Globe, 
  Users, Trash2, Edit3, MessageSquare, Clock, ArrowLeft, Send,
  Sparkles, Check, CheckCircle2, History, ChevronDown, Loader2, X
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WikiPageItem, WikiCommentItem } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';

interface WikiViewProps {
  routePageId?: string | null;
  onRouteChange?: (pageId: string | null) => void;
  embedded?: boolean;
  isCreateOpen?: boolean;
  onCloseCreate?: () => void;
}

export const WikiView: React.FC<WikiViewProps> = ({ 
  routePageId, 
  onRouteChange, 
  embedded = false,
  isCreateOpen = false,
  onCloseCreate,
}) => {
  console.log("ACTIVE WIKI VIEW");

  const { currentRole, currentUser, currentWorkspace, addToast } = useWorkspace();
  const [pages, setPages] = useState<WikiPageItem[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPageId, setSelectedPageId] = useState<string>(routePageId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContentText, setEditContentText] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'comments' | 'versions'>('content');
  
  // Create Wiki Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createVisibility, setCreateVisibility] = useState<string>('workspace');
  const [createDepartmentId, setCreateDepartmentId] = useState<string>('');
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  // Sync external isCreateOpen prop
  useEffect(() => {
    if (isCreateOpen) {
      openCreateModal(null);
      onCloseCreate?.();
    }
  }, [isCreateOpen]);

  // Comments state
  const [comments, setComments] = useState<WikiCommentItem[]>([]);
  const [newComment, setNewComment] = useState('');

  // Fetch departments for department-scoped wiki page creation
  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await api.getDepartments();
        if (res?.departments) setDepartments(res.departments);
      } catch {}
    }
    loadDepts();
  }, []);

  // Sync routePageId prop changes into state
  useEffect(() => {
    if (routePageId && routePageId !== selectedPageId) {
      setSelectedPageId(routePageId);
      setIsEditing(false);
    }
  }, [routePageId]);

  const loadPages = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getWikiPages();
      if (res && Array.isArray(res.pages)) {
        setPages(res.pages);
        
        // If routePageId is provided in URL, prioritize finding that page (or matching by slug or id)
        if (routePageId) {
          const match = res.pages.find((p) => p.id === routePageId || p.slug === routePageId);
          if (match) {
            setSelectedPageId(match.id);
          } else {
            // Invalid or missing page ID
            setSelectedPageId(routePageId); // Let selectedPage resolve to undefined for 404 UI
          }
        } else if (res.pages.length > 0) {
          setSelectedPageId(res.pages[0].id);
          onRouteChange?.(res.pages[0].id);
        }
      }
    } catch (err: any) {
      console.error('[WikiView] Failed to load wiki pages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [routePageId, onRouteChange]);

  useEffect(() => {
    loadPages();
  }, [currentWorkspace?.id]);

  const selectPage = (pageId: string) => {
    setSelectedPageId(pageId);
    setIsEditing(false);
    onRouteChange?.(pageId);
  };

  // Resolve selected page by exact ID or slug match
  const selectedPage = pages.find((p) => p.id === selectedPageId || p.slug === selectedPageId);

  const loadComments = useCallback(async (pageId: string) => {
    if (!pageId) return;
    try {
      const res = await api.getWikiComments(pageId);
      if (res && Array.isArray(res.comments)) {
        setComments(res.comments);
      }
    } catch (err) {
      console.error('[WikiView] Failed to load comments:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedPage?.id) {
      loadComments(selectedPage.id);
    }
  }, [selectedPage?.id, loadComments]);

  const openCreateModal = (parentId: string | null = null) => {
    setCreateParentId(parentId);
    setCreateTitle('');
    setCreateVisibility('workspace');
    setCreateDepartmentId('');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      title: createTitle.trim() || 'Untitled Document',
      visibility: createVisibility,
      departmentId: createVisibility === 'department' ? createDepartmentId : undefined,
    };
    console.log("WIKI CREATE PAYLOAD", payload);

    try {
      const res = await api.createWikiPage({
        parentId: createParentId,
        title: createTitle.trim() || 'Untitled Document',
        icon: '📄',
        visibility: createVisibility,
        departmentId: createVisibility === 'department' ? createDepartmentId : undefined,
        department_id: createVisibility === 'department' ? createDepartmentId : undefined,
        contentJson: {
          blocks: [
            { type: 'header', text: createTitle.trim() || 'Untitled Document' },
            { type: 'paragraph', text: 'Type your documentation content here or insert bullet checklists.' }
          ]
        },
      } as any);

      if (res?.page) {
        setPages((prev) => [res.page, ...prev]);
        selectPage(res.page.id);
        setEditTitle(res.page.title);
        setEditContentText('Type your documentation content here or insert bullet checklists.');
        setIsCreateModalOpen(false);
        addToast({
          type: 'success',
          title: 'Wiki Created',
          message: `"${res.page.title}" created successfully.`,
        });
      }
    } catch (err: any) {
      console.error('[WikiView] Failed to create page:', err);
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.message || 'Could not create wiki page.',
      });
    }
  };

  const getVisibilityBadge = (v: string, deptId?: string | null) => {
    switch (v) {
      case 'private':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Lock className="w-2.5 h-2.5" /> Private
          </span>
        );
      case 'department':
        const deptName = departments.find((d) => d.id === deptId)?.name || 'Department';
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            <Users className="w-2.5 h-2.5" /> {deptName}
          </span>
        );
      case 'admin_only':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            <Lock className="w-2.5 h-2.5" /> Admin Only
          </span>
        );
      case 'workspace':
      case 'public':
      case 'team':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            <Globe className="w-2.5 h-2.5" /> Workspace
          </span>
        );
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedPage) return;
    try {
      const res = await api.updateWikiPage(selectedPage.id, {
        title: editTitle || selectedPage.title,
        contentJson: {
          blocks: [
            { type: 'header', text: editTitle || selectedPage.title },
            { type: 'paragraph', text: editContentText }
          ]
        }
      });

      if (res?.page) {
        setPages((prev) => prev.map((p) => (p.id === selectedPage.id ? res.page : p)));
        setIsEditing(false);
        addToast({
          type: 'success',
          title: 'Wiki Updated',
          message: 'Your revisions were saved to the cloud.',
        });
      }
    } catch (err: any) {
      console.error('[WikiView] Failed to update page:', err);
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save page changes.',
      });
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!window.confirm('Are you sure you want to delete this wiki document?')) return;
    try {
      await api.deleteWikiPage(pageId);
      const remaining = pages.filter((p) => p.id !== pageId);
      setPages(remaining);
      if (selectedPageId === pageId) {
        const nextId = remaining[0]?.id || null;
        setSelectedPageId(nextId || '');
        onRouteChange?.(nextId);
      }
      addToast({
        type: 'success',
        title: 'Page Deleted',
        message: 'Wiki document removed successfully.',
      });
    } catch (err: any) {
      console.error('[WikiView] Delete failed:', err);
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete page.',
      });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPage) return;
    try {
      const res = await api.addWikiComment(selectedPage.id, {
        comment: newComment.trim(),
      });
      if (res?.comment) {
        setComments((prev) => [...prev, res.comment]);
        setNewComment('');
      }
    } catch (err: any) {
      console.error('[WikiView] Comment failed:', err);
    }
  };

  // Build breadcrumbs
  const getBreadcrumbs = () => {
    if (!selectedPage) return [];
    const crumbs = [selectedPage];
    let curr = selectedPage;
    while (curr.parentId) {
      const parent = pages.find((p) => p.id === curr.parentId);
      if (parent) {
        crumbs.unshift(parent);
        curr = parent;
      } else {
        break;
      }
    }
    return crumbs;
  };

  const visiblePages = pages.filter((p) => {
    if (currentRole === 'intern' && p.visibility !== 'learning' && p.visibility !== 'public') {
      return false;
    }
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Workspace Wiki & Knowledge Base"
          description="Notion-lite interactive documentation engine with nested pages, live revisions, and team comments."
          actions={
            currentRole !== 'intern' ? (
              <button
                onClick={() => openCreateModal(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Wiki Page</span>
              </button>
            ) : undefined
          }
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
        {/* LEFT SIDEBAR: Page Navigation Tree */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-4 flex flex-col h-full shadow-xl">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Pages</h3>
            {currentRole !== 'intern' && (
              <button
                onClick={() => openCreateModal(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[11px] font-semibold border border-blue-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Page</span>
              </button>
            )}
          </div>
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search knowledge wiki..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0F172A] border border-white/[0.06] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {visiblePages.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No pages created yet.
              </div>
            ) : (
              visiblePages.map((page) => {
                const isSelected = page.id === selectedPage?.id;
                const isSubpage = !!page.parentId;
                const displayTitle = page.title.charAt(0).toUpperCase() + page.title.slice(1);
                return (
                  <div
                    key={page.id}
                    onClick={() => selectPage(page.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                      isSubpage ? 'ml-3' : ''
                    } ${
                      isSelected
                        ? 'bg-blue-600/15 border border-blue-500/30 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{page.icon}</span>
                      <span className="truncate">{displayTitle}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {currentRole !== 'intern' && selectedPage && (
            <button
              onClick={() => openCreateModal(selectedPage.id)}
              className="mt-3 w-full py-2 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/[0.06] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Add Sub-Page</span>
            </button>
          )}
        </div>

        {/* MAIN CANVAS: Document Viewer / Editor */}
        <div className="lg:col-span-3 bg-[#111827] border border-white/[0.08] rounded-2xl p-6 sm:p-8 flex flex-col shadow-xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Loading documentation...</p>
            </div>
          ) : selectedPage ? (
            <div>
              {/* Clean Header Title & Actions */}
              <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2 rounded-2xl bg-[#0F172A] border border-white/[0.08] shadow-inner">
                    {selectedPage.icon}
                  </span>
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="text-2xl font-bold text-white bg-[#0F172A] border border-blue-500 rounded-xl px-3 py-1 outline-none"
                      />
                    ) : (
                      <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        {selectedPage.title.charAt(0).toUpperCase() + selectedPage.title.slice(1)}
                      </h1>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>Updated {new Date(selectedPage.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {currentRole !== 'intern' && (currentRole === 'admin' || selectedPage.createdBy === currentUser?.id || (selectedPage as any).created_by === currentUser?.id) && (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <button
                        onClick={handleSaveEdit}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Page</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditTitle(selectedPage.title);
                            setEditContentText(
                              selectedPage.contentJson.blocks?.find((b: any) => b.type === 'paragraph')?.text || ''
                            );
                            setIsEditing(true);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/[0.08] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeletePage(selectedPage.id)}
                          className="p-1.5 rounded-xl bg-[#1E293B] hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 border border-white/[0.08] cursor-pointer transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Direct Document Content Rendering */}
              <div className="space-y-4 text-slate-300 leading-relaxed text-sm mb-8">
                {isEditing ? (
                  <textarea
                    rows={10}
                    value={editContentText}
                    onChange={(e) => setEditContentText(e.target.value)}
                    placeholder="Write your markdown and documentation..."
                    className="w-full p-4 rounded-xl bg-[#0F172A] border border-blue-500/50 text-slate-200 text-sm focus:outline-none"
                  />
                ) : (
                  selectedPage.contentJson.blocks?.map((block: any, idx: number) => {
                    if (block.type === 'header') {
                      return (
                        <h3 key={idx} className="text-lg font-bold text-white mt-4 first:mt-0">
                          {block.text}
                        </h3>
                      );
                    }
                    if (block.type === 'paragraph') {
                      return <p key={idx}>{block.text}</p>;
                    }
                    if (block.type === 'checklist') {
                      return (
                        <div key={idx} className="space-y-2 my-3 p-4 rounded-xl bg-[#0F172A] border border-white/[0.04]">
                          {block.items?.map((item: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })
                )}
              </div>

              {/* Render Team Comments ONLY when comments exist */}
              {comments.filter((c) => c.pageId === selectedPage.id).length > 0 && (
                <div className="pt-6 border-t border-white/[0.06] space-y-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Comments ({comments.filter((c) => c.pageId === selectedPage.id).length})
                  </h4>
                  <div className="space-y-3">
                    {comments
                      .filter((c) => c.pageId === selectedPage.id)
                      .map((c) => (
                        <div key={c.id} className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.06] text-xs">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-white">{c.userName}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300">{c.comment}</p>
                        </div>
                      ))}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[#0F172A] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/[0.08] flex items-center justify-center mb-4 text-slate-400">
                <BookOpen className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                {pages.length === 0 ? "No pages yet" : "Page Not Found"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                {pages.length === 0
                  ? "Create your first SOP, process document, or company policy."
                  : routePageId
                  ? `The requested document ID "${routePageId}" could not be found.`
                  : "Select a wiki page from the sidebar navigation or create a new page."}
              </p>
              <div className="flex items-center gap-3">
                {pages.length > 0 && (
                  <button
                    onClick={() => selectPage(pages[0].id)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
                  >
                    Go to {pages[0].title}
                  </button>
                )}
                {currentRole !== 'intern' && (
                  <button
                    onClick={() => openCreateModal(null)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Page</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Wiki Page Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-[#0F172A] border border-white/[0.12] rounded-2xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-semibold text-white">Create Wiki Document</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Backend SOP / System Architecture Protocol"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Visibility Scope</label>
                  <select
                    value={createVisibility}
                    onChange={(e) => setCreateVisibility(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="workspace">Workspace (All Organization)</option>
                    <option value="department">Department</option>
                    <option value="private">Private (Only Me)</option>
                    {currentRole === 'admin' && <option value="admin_only">Admin Only</option>}
                  </select>
                </div>

                {createVisibility === 'department' && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Target Department</label>
                    <select
                      value={createDepartmentId}
                      onChange={(e) => setCreateDepartmentId(e.target.value)}
                      required
                      className="w-full bg-[#111827] border border-purple-500/30 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select Department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 cursor-pointer"
                  >
                    Create Wiki Page
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
