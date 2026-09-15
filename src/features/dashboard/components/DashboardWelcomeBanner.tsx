import React from 'react';
import { Sparkles, Plus, UserPlus, FileUp } from 'lucide-react';

export interface DashboardWelcomeBannerProps {
  userName: string;
  onOpenCommandPalette?: () => void;
  onNavigate: (tab: string) => void;
}

export const DashboardWelcomeBanner: React.FC<DashboardWelcomeBannerProps> = React.memo(({
  userName,
  onOpenCommandPalette,
  onNavigate,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      <div>
        <h1 className="ui-h1 tracking-tight text-white flex items-center gap-2">
          <span>Good day, {userName?.split(' ')[0] || 'Admin'}</span>
          <span className="text-purple-400">⚡</span>
        </h1>
        <p className="ui-caption text-slate-400 mt-1">
          High-level operational overview and resource allocation telemetry.
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        <button
          onClick={() => onNavigate('projects')}
          className="ui-btn ui-btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>

        <button
          onClick={() => onNavigate('tasks')}
          className="ui-btn ui-btn-secondary"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>

        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="ui-btn ui-btn-secondary hidden md:inline-flex"
            title="Command Palette (Cmd+K)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Actions</span>
            <kbd className="ui-mono text-[9px] px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">⌘K</kbd>
          </button>
        )}
      </div>
    </div>
  );
});
DashboardWelcomeBanner.displayName = 'DashboardWelcomeBanner';
