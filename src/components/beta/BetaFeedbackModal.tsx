import React, { useState } from 'react';
import { 
  MessageSquarePlus, AlertTriangle, Bug, Sparkles, Zap, Heart, 
  HelpCircle, Image, X, CheckCircle2, Loader2, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';

interface BetaFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BetaFeedbackModal: React.FC<BetaFeedbackModalProps> = ({ isOpen, onClose }) => {
  const { addToast } = useWorkspace();
  const [category, setCategory] = useState<'bug' | 'feature_request' | 'ux_friction' | 'performance' | 'praise' | 'other'>('bug');
  const [severity, setSeverity] = useState<'p0_blocker' | 'p1_critical' | 'p2_major' | 'p3_minor'>('p2_major');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const categories = [
    { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-400' },
    { id: 'feature_request', label: 'Feature Request', icon: Sparkles, color: 'text-purple-400' },
    { id: 'ux_friction', label: 'UX Friction', icon: AlertTriangle, color: 'text-amber-400' },
    { id: 'performance', label: 'Performance', icon: Zap, color: 'text-blue-400' },
    { id: 'praise', label: 'Praise', icon: Heart, color: 'text-pink-400' },
    { id: 'other', label: 'Other', icon: HelpCircle, color: 'text-slate-400' },
  ];

  const severities = [
    { id: 'p0_blocker', label: 'P0 Blocker', desc: 'Prevents core work execution', color: 'border-red-500/50 bg-red-950/30 text-red-300' },
    { id: 'p1_critical', label: 'P1 Critical', desc: 'Severe issue with workaround', color: 'border-orange-500/50 bg-orange-950/30 text-orange-300' },
    { id: 'p2_major', label: 'P2 Major', desc: 'Standard friction / inconvenience', color: 'border-purple-500/50 bg-purple-950/30 text-purple-300' },
    { id: 'p3_minor', label: 'P3 Minor', desc: 'Cosmetic or minor suggestion', color: 'border-slate-500/50 bg-slate-900/30 text-slate-300' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      addToast({
        type: 'error',
        title: 'Missing Required Fields',
        message: 'Please provide both a title and description for your feedback.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitFeedback({
        category,
        severity,
        title,
        description,
        screenshotUrl: screenshotUrl.trim() || undefined,
      });

      addToast({
        type: 'success',
        title: 'Feedback Submitted to Founder',
        message: 'Thank you! Your feedback has been placed directly into the Founder review queue.',
      });

      setTitle('');
      setDescription('');
      setScreenshotUrl('');
      onClose();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Failed to submit feedback. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#0F172A]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <MessageSquarePlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Closed Beta Feedback</h3>
                <p className="text-xs text-slate-400">Directly monitored by Founder and Product Engineering.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Category selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Feedback Category</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategory(cat.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-purple-500 bg-purple-600/20 text-white shadow-lg shadow-purple-950/40'
                          : 'border-white/[0.06] bg-[#0F172A] text-slate-400 hover:text-slate-200 hover:border-white/[0.12]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity selector (if bug/friction) */}
            {(category === 'bug' || category === 'ux_friction' || category === 'performance') && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Severity Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {severities.map((sev) => {
                    const isSelected = severity === sev.id;
                    return (
                      <button
                        type="button"
                        key={sev.id}
                        onClick={() => setSeverity(sev.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? sev.color
                            : 'border-white/[0.06] bg-[#0F172A] text-slate-400 hover:text-slate-200 hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="font-semibold text-xs">{sev.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{sev.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Title / Subject</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Command search shortcut key conflict on macOS"
                className="w-full px-3 py-2 bg-[#0F172A] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Detailed Description & Steps</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what happened, expected behavior, or your specific proposal..."
                className="w-full px-3 py-2 bg-[#0F172A] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                required
              />
            </div>

            {/* Screenshot attachment link */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Image className="w-3 h-3 text-slate-400" />
                <span>Screenshot / Loom URL (Optional)</span>
              </label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-[#0F172A] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            {/* Footer buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
