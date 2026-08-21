import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { DocumentItem, DocumentVisibility } from '../../types';
import { 
  FileText, Plus, Download, Trash2, Eye, Search, Filter, 
  FileCode, FileSpreadsheet, Presentation, BookOpen, Lock, Globe, Users, X
} from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { 
    documents, currentUser, currentRole, permissions, uploadDocument, 
    deleteDocument, incrementDocDownload, searchQuery 
  } = useWorkspace();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Upload State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentItem['category']>('General');
  const [visibility, setVisibility] = useState<DocumentVisibility>('team');
  const [fileType, setFileType] = useState<DocumentItem['file_type']>('pdf');
  const [fileSize, setFileSize] = useState('1.4 MB');

  // Role visibility filter
  const visibleDocs = documents.filter((doc) => {
    // Intern: only learning or public docs
    if (currentRole === 'intern' && doc.visibility !== 'learning' && doc.visibility !== 'public') {
      return false;
    }
    // Employee: private docs must be owned by current user
    if (currentRole === 'employee' && doc.visibility === 'private' && doc.owner_id !== currentUser.id) {
      return false;
    }
    // Category filter
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
      return false;
    }
    // Search query
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = uploadDocument({
      title,
      category,
      visibility,
      file_type: fileType,
      file_size: fileSize,
      file_url: 'https://docs.workspaceos.dev/' + title.toLowerCase().replace(/\s+/g, '-') + '.' + fileType
    });
    if (success) {
      setIsUploadModalOpen(false);
      setTitle('');
    }
  };

  const getDocIcon = (type: DocumentItem['file_type']) => {
    switch (type) {
      case 'code':
        return <FileCode className="w-5 h-5 text-blue-400" />;
      case 'sheet':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case 'slide':
        return <Presentation className="w-5 h-5 text-amber-400" />;
      case 'guide':
        return <BookOpen className="w-5 h-5 text-purple-400" />;
      default:
        return <FileText className="w-5 h-5 text-rose-400" />;
    }
  };

  const getVisibilityBadge = (v: DocumentVisibility) => {
    switch (v) {
      case 'public':
        return <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"><Globe className="w-3 h-3" /> Public</span>;
      case 'team':
        return <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"><Users className="w-3 h-3" /> Team</span>;
      case 'learning':
        return <span className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20"><BookOpen className="w-3 h-3" /> Learning</span>;
      case 'private':
        return <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"><Lock className="w-3 h-3" /> Private</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {currentRole === 'admin' ? 'Organization Document Vault' : currentRole === 'employee' ? 'Shared & Personal Documents' : 'Learning Resources & Handbooks'}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {visibleDocs.length} Files
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {currentRole === 'intern'
              ? 'Access architecture blueprints, onboarding guides, and engineering standards.'
              : 'Secure document management with granular visibility rules and download analytics.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="Technical">Technical</option>
            <option value="Policy">Policy</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Marketing">Marketing</option>
            <option value="General">General</option>
          </select>

          {(permissions.documents.createOrgDoc || permissions.documents.createPersonalDoc) && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleDocs.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Documents Found</p>
            <p className="text-xs text-slate-500 mt-1">Upload a document or adjust filters to view files.</p>
          </div>
        ) : (
          visibleDocs.map((doc) => {
            const isOwner = doc.owner_id === currentUser.id;
            const canDelete = permissions.documents.delete || (currentRole === 'employee' && isOwner);

            return (
              <div
                key={doc.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      {getDocIcon(doc.file_type)}
                    </div>
                    {getVisibilityBadge(doc.visibility)}
                  </div>

                  <h3 className="text-xs font-bold text-slate-100 mb-1 leading-snug line-clamp-2">
                    {doc.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-3">
                    {doc.category} • {doc.file_size}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[10px] text-slate-500">
                    {doc.download_count} Downloads
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => incrementDocDownload(doc.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 transition-colors"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {canDelete && (
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Upload New Document</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Workspace Engineering Standards"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Policy">Policy</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Marketing">Marketing</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">File Type</label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="guide">Guide</option>
                    <option value="code">Code / Script</option>
                    <option value="sheet">Spreadsheet</option>
                    <option value="slide">Slides</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Visibility Scope</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {permissions.documents.createOrgDoc && <option value="public">Public (All Organization)</option>}
                  <option value="team">Team Shared</option>
                  <option value="learning">Intern & Learning Onboarding</option>
                  <option value="private">Private (Only Me)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                >
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
