import React, { useState } from 'react';
import { 
  BookOpen, Plus, Search, ChevronRight, FileText, Lock, Globe, 
  Users, Trash2, Edit3, MessageSquare, Clock, ArrowLeft, Send,
  Sparkles, Check, CheckCircle2, History, ChevronDown
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WikiPageItem, WikiCommentItem } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';
import { motion, AnimatePresence } from 'motion/react';

export const WikiView: React.FC = () => {
  const { currentRole, currentUser } = useWorkspace();
  const [pages, setPages] = useState<WikiPageItem[]>([
    {
      id: 'wiki-1',
      workspaceId: 'ws-default',
      parentId: null,
      title: 'Company Knowledge Base & Culture',
      icon: '🏢',
      slug: 'company-knowledge-base',
      contentJson: {
        blocks: [
          { type: 'header', text: 'Welcome to Workspace OS Company Handbook' },
          { type: 'paragraph', text: 'Our mission is to help growing MSMEs execute at elite speed with zero friction.' },
          { type: 'checklist', items: ['Zero-Trust RBAC security', '100% On-time deliverable velocity', 'Direct client transparency'] }
        ]
      },
      visibility: 'team',
      createdBy: 'usr-admin',
      createdAt: '2026-08-20T10:00:00Z',
      updatedAt: '2026-08-24T18:30:00Z'
    },
    {
      id: 'wiki-2',
      workspaceId: 'ws-default',
      parentId: 'wiki-1',
      title: 'Engineering Deployment Checklist',
      icon: '🚀',
      slug: 'engineering-deployment-checklist',
      contentJson: {
        blocks: [
          { type: 'header', text: 'Production Release Protocol' },
          { type: 'paragraph', text: 'Always run automated test suites before merging PRs.' },
          { type: 'checklist', items: ['Run `npm run lint`', 'Run `npx tsx backend/tests/phase13-validation.ts`', 'Verify B2 Object Storage health'] }
        ]
      },
      visibility: 'team',
      createdBy: 'usr-admin',
      createdAt: '2026-08-21T12:00:00Z',
      updatedAt: '2026-08-25T01:15:00Z'
    },
    {
      id: 'wiki-3',
      workspaceId: 'ws-default',
      parentId: null,
      title: 'Intern Onboarding & Learning Curriculum',
      icon: '🎓',
      slug: 'intern-onboarding-curriculum',
      contentJson: {
        blocks: [
          { type: 'header', text: 'Trainee Learning Path' },
          { type: 'paragraph', text: 'Review all public and learning SOPs during your first week.' },
          { type: 'checklist', items: ['Read Architecture Guide', 'Complete 3 learning tasks', 'Submit deliverable for peer review'] }
        ]
      },
      visibility: 'learning',
      createdBy: 'usr-admin',
      createdAt: '2026-08-22T09:00:00Z',
      updatedAt: '2026-08-24T14:20:00Z'
    }
  ]);

  const [selectedPageId, setSelectedPageId] = useState<string>(pages[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContentText, setEditContentText] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'comments' | 'versions'>('content');
  
  // Comments state
  const [comments, setComments] = useState<WikiCommentItem[]>([
    {
      id: 'c1',
      pageId: 'wiki-2',
      userId: 'usr-emp-1',
      userName: 'Senior Engineer',
      comment: 'Verified the Backblaze B2 bucket health checks. All systems green.',
      resolved: false,
      createdAt: '2026-08-24T19:00:00Z'
    }
  ]);
  const [newComment, setNewComment] = useState('');

  const selectedPage = pages.find((p) => p.id === selectedPageId) || pages[0];

  const handleCreatePage = (parentId: string | null = null) => {
    const newPage: WikiPageItem = {
      id: `wiki-${Date.now()}`,
      workspaceId: 'ws-default',
      parentId,
      title: 'Untitled Document',
      icon: '📄',
      slug: `untitled-document-${Date.now()}`,
      contentJson: {
        blocks: [
          { type: 'header', text: 'Untitled Document' },
          { type: 'paragraph', text: 'Type your documentation content here or insert bullet checklists.' }
        ]
      },
      visibility: 'team',
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPages((prev) => [newPage, ...prev]);
    setSelectedPageId(newPage.id);
    setEditTitle(newPage.title);
    setEditContentText('Type your documentation content here or insert bullet checklists.');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedPage) return;
    const updated = pages.map((p) => {
      if (p.id === selectedPage.id) {
        return {
          ...p,
          title: editTitle || p.title,
          contentJson: {
            blocks: [
              { type: 'header', text: editTitle || p.title },
              { type: 'paragraph', text: editContentText }
            ]
          },
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    setPages(updated);
    setIsEditing(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPage) return;
    const commentItem: WikiCommentItem = {
      id: `c-${Date.now()}`,
      pageId: selectedPage.id,
      userId: currentUser.id,
      userName: currentUser.name,
      comment: newComment.trim(),
      resolved: false,
      createdAt: new Date().toISOString()
    };
    setComments((prev) => [...prev, commentItem]);
    setNewComment('');
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
      <PageHeader
        title="Workspace Wiki & Knowledge Base"
        description="Notion-lite interactive documentation engine with nested pages, live revisions, and team comments."
        actions={
          currentRole !== 'intern' ? (
            <button
              onClick={() => handleCreatePage(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Wiki Page</span>
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
        {/* LEFT SIDEBAR: Page Navigation Tree */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-4 flex flex-col h-full shadow-xl">
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
            {visiblePages.map((page) => {
              const isSelected = page.id === selectedPage?.id;
              const isSubpage = !!page.parentId;
              return (
                <div
                  key={page.id}
                  onClick={() => {
                    setSelectedPageId(page.id);
                    setIsEditing(false);
                  }}
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
                    <span className="truncate">{page.title}</span>
                  </div>
                  {page.visibility === 'learning' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Learn
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {currentRole !== 'intern' && selectedPage && (
            <button
              onClick={() => handleCreatePage(selectedPage.id)}
              className="mt-3 w-full py-2 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/[0.06] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Add Sub-Page</span>
            </button>
          )}
        </div>

        {/* MAIN CANVAS: Document Viewer / Editor */}
        <div className="lg:col-span-3 bg-[#111827] border border-white/[0.08] rounded-2xl p-6 sm:p-8 flex flex-col shadow-xl">
          {selectedPage ? (
            <div>
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4 pb-3 border-b border-white/[0.06]">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Wiki</span>
                {getBreadcrumbs().map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span
                      onClick={() => setSelectedPageId(crumb.id)}
                      className={`cursor-pointer hover:text-white ${
                        idx === getBreadcrumbs().length - 1 ? 'text-white font-semibold' : ''
                      }`}
                    >
                      {crumb.title}
                    </span>
                  </React.Fragment>
                ))}
              </div>

              {/* Header Title & Actions */}
              <div className="flex items-start justify-between gap-4 mb-6">
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
                        {selectedPage.title}
                      </h1>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>Updated {new Date(selectedPage.updatedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="capitalize text-blue-400 font-medium">
                        {selectedPage.visibility} Access
                      </span>
                    </div>
                  </div>
                </div>

                {currentRole !== 'intern' && (
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
                    )}
                  </div>
                )}
              </div>

              {/* View Tabs */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] mb-6 text-xs">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`pb-2.5 px-2 font-semibold transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'content'
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Document Content
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`pb-2.5 px-2 font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'comments'
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Team Comments</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-blue-400 font-bold">
                    {comments.filter((c) => c.pageId === selectedPage.id).length}
                  </span>
                </button>
              </div>

              {/* TAB 1: Document Blocks */}
              {activeTab === 'content' && (
                <div className="space-y-4 text-slate-300 leading-relaxed text-sm">
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
              )}

              {/* TAB 2: Inline & Page Comments */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
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

                  <form onSubmit={handleAddComment} className="flex items-center gap-2 mt-4">
                    <input
                      type="text"
                      placeholder="Add an inline or page comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#0F172A] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="No Page Selected"
              description="Select a wiki page from the sidebar or create a new one."
              icon={BookOpen}
            />
          )}
        </div>
      </div>
    </div>
  );
};
