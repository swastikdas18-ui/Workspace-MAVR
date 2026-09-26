import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Send, RotateCcw, X } from 'lucide-react';
import { Project } from '../../types';

interface ProjectWorkflowModalsProps {
  progressModalProject: Project | null;
  setProgressModalProject: (p: Project | null) => void;
  progressValue: number;
  setProgressValue: (v: number) => void;
  progressNote: string;
  setProgressNote: (v: string) => void;
  onSaveProgress: () => void;

  submitReviewModalProject: Project | null;
  setSubmitReviewModalProject: (p: Project | null) => void;
  onConfirmSubmitReview: () => void;

  changesModalProject: Project | null;
  setChangesModalProject: (p: Project | null) => void;
  reviewFeedback: string;
  setReviewFeedback: (v: string) => void;
  onSaveRequestChanges: () => void;
}

export const ProjectWorkflowModals: React.FC<ProjectWorkflowModalsProps> = ({
  progressModalProject,
  setProgressModalProject,
  progressValue,
  setProgressValue,
  progressNote,
  setProgressNote,
  onSaveProgress,
  submitReviewModalProject,
  setSubmitReviewModalProject,
  onConfirmSubmitReview,
  changesModalProject,
  setChangesModalProject,
  reviewFeedback,
  setReviewFeedback,
  onSaveRequestChanges,
}) => {
  return (
    <AnimatePresence>
      {/* UPDATE PROGRESS MODAL */}
      {progressModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setProgressModalProject(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Log Progress Update
              </h3>
              <button
                onClick={() => setProgressModalProject(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Initiative</span>
                <p className="font-semibold text-white text-sm">{progressModalProject.title}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-medium">Completion Percentage</label>
                  <span className="text-sm font-bold font-mono text-emerald-400">{progressValue}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressValue}
                  onChange={(e) => setProgressValue(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0% (Started)</span>
                  <span>50% (Halfway)</span>
                  <span>100% (Complete)</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Progress Note / Milestone Summary (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Completed API endpoint integrations and database migrations..."
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setProgressModalProject(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onSaveProgress}
                className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 cursor-pointer"
              >
                Save Progress Update
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* SUBMIT FOR REVIEW CONFIRMATION */}
      {submitReviewModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSubmitReviewModalProject(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                Submit Initiative for Review
              </h3>
              <button
                onClick={() => setSubmitReviewModalProject(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you ready to submit <strong className="text-white">"{submitReviewModalProject.title}"</strong> for Lead/Admin review?
              This will transition the initiative into the <span className="text-amber-400 font-medium">Review</span> stage.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setSubmitReviewModalProject(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmSubmitReview}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/25 cursor-pointer"
              >
                Confirm & Submit
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* REQUEST CHANGES MODAL */}
      {changesModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChangesModalProject(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                Request Review Changes
              </h3>
              <button
                onClick={() => setChangesModalProject(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Provide detailed feedback for <strong className="text-white">"{changesModalProject.title}"</strong>.
                The project will be moved back to <span className="text-purple-400 font-medium">In Progress</span>.
              </p>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Feedback & Required Fixes</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Unit tests need higher coverage on payment edge cases. Please fix before resubmitting..."
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setChangesModalProject(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onSaveRequestChanges}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/25 cursor-pointer"
              >
                Send Feedback
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
