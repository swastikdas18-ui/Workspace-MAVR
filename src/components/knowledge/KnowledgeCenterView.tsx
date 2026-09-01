import React, { useState, useEffect } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { WikiView } from '../wiki/WikiView';
import { DocumentsView } from '../documents/DocumentsView';

export type KnowledgeTab = 'wiki' | 'documents';

interface KnowledgeCenterViewProps {
  initialTab?: KnowledgeTab | string;
  routePageId?: string | null;
  routeDocumentId?: string | null;
  onRouteChange?: (id: string | null) => void;
}

export const KnowledgeCenterView: React.FC<KnowledgeCenterViewProps> = ({
  initialTab = 'wiki',
  routePageId,
  routeDocumentId,
  onRouteChange,
}) => {
  const normalizedTab: KnowledgeTab = initialTab === 'documents' ? 'documents' : 'wiki';
  const [activeTab, setActiveTab] = useState<KnowledgeTab>(normalizedTab);

  // Sync initialTab when route changes
  useEffect(() => {
    const nextTab: KnowledgeTab = initialTab === 'documents' ? 'documents' : 'wiki';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-6">
      {/* Clean Header */}
      <PageHeader
        title="Knowledge Center"
        description="Central workspace knowledge hub for SOPs, documentation, policies, processes, and shared files."
      />

      {/* 2-Tab Switcher */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-1 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('wiki')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'wiki'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Wiki & SOPs</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documents Vault</span>
          </button>
        </div>
      </div>

      {/* Tab Renderers */}
      {activeTab === 'wiki' && (
        <WikiView embedded routePageId={routePageId} onRouteChange={onRouteChange} />
      )}

      {activeTab === 'documents' && (
        <DocumentsView embedded routeDocumentId={routeDocumentId} onRouteChange={onRouteChange} />
      )}
    </div>
  );
};
