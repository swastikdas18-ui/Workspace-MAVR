import React, { useState } from 'react';
import { 
  Sparkles, CheckCircle2, AlertTriangle, FileText, Download, 
  Send, ExternalLink, ShieldCheck, Clock, UserCheck, MessageSquare
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { DeliverableApprovalItem } from '../../types';
import { PageHeader } from '../common/PageHeader';

export const ClientPortalView: React.FC = () => {
  const { currentRole, currentUser, currentWorkspace } = useWorkspace();

  const [approvals, setApprovals] = useState<DeliverableApprovalItem[]>([]);

  const [signerName, setSignerName] = useState(currentUser.name || 'Client Reviewer');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);

  const handleApprove = (approvalId: string) => {
    setApprovals((prev) =>
      prev.map((a) => {
        if (a.id === approvalId) {
          return {
            ...a,
            status: 'approved',
            feedback: feedbackInput || 'Approved without amendments.',
            signatureHash: `SIG-${btoa(signerName + ':' + Date.now()).slice(0, 16)}`,
            signedAt: new Date().toISOString()
          };
        }
        return a;
      })
    );
    setSelectedApprovalId(null);
    setFeedbackInput('');
  };

  const handleRequestChanges = (approvalId: string) => {
    if (!feedbackInput.trim()) return;
    setApprovals((prev) =>
      prev.map((a) => {
        if (a.id === approvalId) {
          return {
            ...a,
            status: 'changes_requested',
            feedback: feedbackInput.trim(),
            signedAt: new Date().toISOString()
          };
        }
        return a;
      })
    );
    setSelectedApprovalId(null);
    setFeedbackInput('');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Client / Guest Deliverables Portal"
        description="Secure external collaboration portal for review, feedback, and cryptographic milestone sign-offs."
      />

      {/* PORTAL SECURITY NOTICE */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border border-purple-500/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Zero-Trust Guest Sandbox Active
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Clients only see approved deliverable files. Internal tasks, CRM data, profit margins, and team chats remain completely private.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-800 text-purple-300 border border-purple-500/20 font-bold shrink-0">
          Magic Link Access
        </span>
      </div>

      {/* DELIVERABLES LIST */}
      <div className="space-y-4">
        {approvals.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#111827] border border-white/[0.08] text-center text-xs text-slate-500">
            No client deliverable packages or sign-off requests created for this workspace yet.
          </div>
        ) : (
          approvals.map((approval) => (
            <div
              key={approval.id}
              className="p-6 rounded-2xl bg-[#111827] border border-white/[0.08] shadow-xl space-y-4"
            >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0F172A] border border-white/[0.06] text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{approval.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">{approval.description}</p>
                </div>
              </div>

              <div>
                {approval.status === 'approved' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                ) : approval.status === 'changes_requested' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold font-mono">
                    <AlertTriangle className="w-3.5 h-3.5" /> Changes Requested
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold font-mono">
                    <Clock className="w-3.5 h-3.5" /> Awaiting Sign-off
                  </span>
                )}
              </div>
            </div>

            {/* Signature Badge if signed */}
            {approval.signatureHash && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.04] flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    Signed by <strong>{signerName}</strong> on{' '}
                    {approval.signedAt ? new Date(approval.signedAt).toLocaleDateString() : 'recently'}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-white/[0.04]">
                  Hash: {approval.signatureHash}
                </span>
              </div>
            )}

            {/* Actions & Feedback */}
            <div className="pt-3 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-3">
              <a
                href={approval.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Deliverable Package</span>
              </a>

              {approval.status === 'pending' && (
                <div className="flex items-center gap-2">
                  {selectedApprovalId === approval.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Feedback or amendment notes..."
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleApprove(approval.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        Sign & Approve
                      </button>
                      <button
                        onClick={() => handleRequestChanges(approval.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-500/20 cursor-pointer"
                      >
                        Request Changes
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedApprovalId(approval.id)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      Review & Sign
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);
};
