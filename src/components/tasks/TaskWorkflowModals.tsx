import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface BlockTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockReason: string;
  setBlockReason: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export const BlockTaskModal: React.FC<BlockTaskModalProps> = ({
  isOpen,
  onClose,
  blockReason,
  setBlockReason,
  onSubmit,
  loading,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-[#0F172A] border border-rose-500/30 rounded-2xl shadow-2xl p-6 z-10 space-y-4"
          >
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Log Task Impediment (Block)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Explain the blocker or dependency preventing this task from moving forward.
            </p>
            <textarea
              rows={3}
              required
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g. Waiting on third-party OAuth client credentials..."
              className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!blockReason.trim() || loading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                Block Task
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface ReviewFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewFeedback: string;
  setReviewFeedback: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export const ReviewFeedbackModal: React.FC<ReviewFeedbackModalProps> = ({
  isOpen,
  onClose,
  reviewFeedback,
  setReviewFeedback,
  onSubmit,
  loading,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-[#0F172A] border border-amber-500/30 rounded-2xl shadow-2xl p-6 z-10 space-y-4"
          >
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              <span>Request Changes</span>
            </h3>
            <p className="text-xs text-slate-400">
              Provide specific guidance on what needs to be revised before approval.
            </p>
            <textarea
              rows={3}
              required
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              placeholder="e.g. Please add unit tests covering the boundary conditions..."
              className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!reviewFeedback.trim() || loading}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                Submit Feedback
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
