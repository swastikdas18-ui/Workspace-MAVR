import React, { useEffect, useState } from 'react';
import { Project, ProjectUpdate, User } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  Clock, Play, CheckCircle, AlertCircle, FileText,
  Activity, ArrowRight, User as UserIcon
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

interface ProjectActivityTimelineProps {
  project: Project;
}

export const ProjectActivityTimeline: React.FC<ProjectActivityTimelineProps> = ({ project }) => {
  const { getProjectUpdates, users } = useWorkspace();
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchUpdates = async () => {
      setLoading(true);
      const res = await getProjectUpdates(project.id);
      if (isMounted) {
        setUpdates(res);
        setLoading(false);
      }
    };

    fetchUpdates();
    return () => {
      isMounted = false;
    };
  }, [project.id, project.progress, project.status]);

  const getUser = (userId?: string): User | undefined => {
    if (!userId) return undefined;
    return users.find((u) => u.id === userId);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <h4 className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-accent-cyan" />
          Initiative Timeline & History
        </h4>
        <span className="text-[11px] text-text-muted font-mono">{updates.length} updates logged</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-text-muted text-xs">
          <Clock className="w-4 h-4 mr-2 animate-spin text-accent-cyan" />
          Loading activity timeline...
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-[2px] before:bg-border/60">
          {/* Milestone: Created */}
          <div className="relative group">
            <div className="absolute -left-[23px] top-0.5 w-5 h-5 rounded-full bg-surface-card border border-border flex items-center justify-center text-text-muted group-hover:border-accent-cyan transition-colors">
              <FileText className="w-2.5 h-2.5 text-text-muted" />
            </div>
            <div className="bg-surface-elevated/40 border border-border/40 rounded-lg p-3 hover:border-border/80 transition-colors">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-text">Initiative Created</span>
                <span className="text-[11px] text-text-muted font-mono">
                  {formatDate(project.created_at || project.start_date)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                {project.created_by && (
                  <div className="flex items-center gap-1.5">
                    <UserAvatar user={getUser(project.created_by)} size="sm" />
                    <span>Created by <strong className="text-text">{getUser(project.created_by)?.name || 'Admin'}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Milestone: Started Work */}
          {project.started_at && (
            <div className="relative group">
              <div className="absolute -left-[23px] top-0.5 w-5 h-5 rounded-full bg-accent-blue/10 border border-accent-blue/40 flex items-center justify-center text-accent-blue">
                <Play className="w-2.5 h-2.5 fill-current" />
              </div>
              <div className="bg-surface-elevated/40 border border-accent-blue/20 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-accent-blue">Work Started</span>
                  <span className="text-[11px] text-text-muted font-mono">{formatDate(project.started_at)}</span>
                </div>
                <p className="text-xs text-text-muted">Transitioned from Planning into active execution.</p>
              </div>
            </div>
          )}

          {/* Logged Progress Updates */}
          {updates.map((update) => {
            const author = getUser(update.user_id);
            return (
              <div key={update.id} className="relative group">
                <div className="absolute -left-[23px] top-0.5 w-5 h-5 rounded-full bg-surface-card border border-accent-cyan/40 flex items-center justify-center text-accent-cyan">
                  <span className="text-[9px] font-bold font-mono">{update.progress}%</span>
                </div>
                <div className="bg-surface-elevated/60 border border-border/60 rounded-lg p-3 hover:border-accent-cyan/40 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={author} size="sm" />
                      <span className="font-medium text-text">{update.user_name || author?.name || 'Contributor'}</span>
                    </div>
                    <span className="text-[11px] text-text-muted font-mono">{formatDate(update.created_at)}</span>
                  </div>
                  {update.note && (
                    <div className="mt-2 text-xs text-text-muted bg-surface-base/80 p-2.5 rounded border border-border/40 font-mono leading-relaxed">
                      "{update.note}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Milestone: Submitted for Review */}
          {project.submitted_for_review_at && (
            <div className="relative group">
              <div className="absolute -left-[23px] top-0.5 w-5 h-5 rounded-full bg-accent-amber/10 border border-accent-amber/40 flex items-center justify-center text-accent-amber">
                <Clock className="w-2.5 h-2.5" />
              </div>
              <div className="bg-surface-elevated/40 border border-accent-amber/20 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-accent-amber">Submitted for Review</span>
                  <span className="text-[11px] text-text-muted font-mono">{formatDate(project.submitted_for_review_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  {project.submitted_by && (
                    <div className="flex items-center gap-1.5">
                      <UserAvatar user={getUser(project.submitted_by)} size="sm" />
                      <span>Submitted by <strong className="text-text">{getUser(project.submitted_by)?.name || 'Contributor'}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Feedback on Review */}
          {project.review_feedback && (
            <div className="relative group">
              <div className="absolute -left-[23px] top-0.5 w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-2.5 h-2.5" />
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-amber-400">Review Feedback / Changes Requested</span>
                </div>
                <p className="text-xs text-text-muted mt-1 bg-surface-base/80 p-2.5 rounded border border-amber-500/20 font-mono">
                  "{project.review_feedback}"
                </p>
              </div>
            </div>
          )}

          {/* Milestone: Completed */}
          {project.completed_at && (
            <div className="relative group">
              <div className="absolute -left-[23px] top-0.5 w-5 h-5 rounded-full bg-accent-emerald/10 border border-accent-emerald/40 flex items-center justify-center text-accent-emerald">
                <CheckCircle className="w-2.5 h-2.5" />
              </div>
              <div className="bg-accent-emerald/5 border border-accent-emerald/20 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-accent-emerald">Initiative Completed & Approved</span>
                  <span className="text-[11px] text-text-muted font-mono">{formatDate(project.completed_at)}</span>
                </div>
                {project.approved_by && (
                  <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
                    <UserAvatar user={getUser(project.approved_by)} size="sm" />
                    <span>Approved by <strong className="text-text">{getUser(project.approved_by)?.name || 'Admin'}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
