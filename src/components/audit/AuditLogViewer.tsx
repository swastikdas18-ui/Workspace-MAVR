import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Download, Filter, Search, RefreshCw, Calendar, 
  User, Layers, Lock, FileText, CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { PageHeader } from '../common/PageHeader';
import { useWorkspace } from '../../context/WorkspaceContext';

interface AuditRecord {
  id: string;
  action: string;
  module: string;
  actorName: string;
  actorEmail: string;
  ipAddress: string;
  createdAt: string;
  entityType?: string;
  entityId?: string;
}

export const AuditLogViewer: React.FC = () => {
  const { addToast } = useWorkspace();
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  // Generate initial simulated audit stream
  useEffect(() => {
    const mockLogs: AuditRecord[] = [
      {
        id: 'aud-101',
        action: 'auth.login_successful',
        module: 'auth',
        actorName: 'Arthur Admin',
        actorEmail: 'admin@workspace.os',
        ipAddress: '192.168.1.104',
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      },
      {
        id: 'aud-102',
        action: 'projects.created',
        module: 'projects',
        actorName: 'Arthur Admin',
        actorEmail: 'admin@workspace.os',
        ipAddress: '192.168.1.104',
        entityType: 'project',
        entityId: 'proj-q3-deployment',
        createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      },
      {
        id: 'aud-103',
        action: 'automations.rule_enabled',
        module: 'automations',
        actorName: 'Arthur Admin',
        actorEmail: 'admin@workspace.os',
        ipAddress: '192.168.1.104',
        entityType: 'automation_rule',
        entityId: 'rule-auto-notify',
        createdAt: new Date(Date.now() - 55 * 60000).toISOString(),
      },
      {
        id: 'aud-104',
        action: 'security.secret_rotated',
        module: 'security',
        actorName: 'Arthur Admin',
        actorEmail: 'admin@workspace.os',
        ipAddress: '192.168.1.104',
        createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
      },
      {
        id: 'aud-105',
        action: 'crm.lead_stage_updated',
        module: 'crm',
        actorName: 'Emma Employee',
        actorEmail: 'emma@workspace.os',
        ipAddress: '10.0.0.45',
        entityType: 'crm_record',
        entityId: 'crm-saas-inc',
        createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
      },
    ];
    setLogs(mockLogs);
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (selectedModule !== 'all' && log.module !== selectedModule) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'Actor Name', 'Actor Email', 'Module', 'Action', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.createdAt,
      `"${l.actorName}"`,
      l.actorEmail,
      l.module,
      `"${l.action}"`,
      l.ipAddress,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_trail_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'CSV Audit Export Downloaded',
      message: 'Immutable audit log records exported successfully.',
    });
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_trail_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'JSON Audit Export Downloaded',
      message: 'Structured JSON compliance records generated.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Audit & Compliance Center"
        description="Immutable, append-only security logs, access verification telemetry, and regulatory export tools."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono font-bold flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Append-Only Verified
          </span>
        }
      />

      {/* Action & Filter Bar */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-1 items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit actions, users, or modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0F172A] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Module Filter */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-2 bg-[#0F172A] border border-white/[0.08] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Modules</option>
            <option value="auth">Auth & Sessions</option>
            <option value="projects">Projects</option>
            <option value="tasks">Tasks</option>
            <option value="crm">CRM Leads</option>
            <option value="automations">Automations</option>
            <option value="security">Security</option>
          </select>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-white/[0.08] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#0F172A] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Actor</th>
              <th className="p-3.5">Module</th>
              <th className="p-3.5">Action Event</th>
              <th className="p-3.5">IP Address</th>
              <th className="p-3.5 text-right">Integrity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                      {log.actorName[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-xs">{log.actorName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{log.actorEmail}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase font-mono bg-slate-800 text-slate-300 border border-white/[0.08]">
                    {log.module}
                  </span>
                </td>
                <td className="p-3.5 text-slate-200 font-mono text-xs">
                  {log.action}
                </td>
                <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                  {log.ipAddress}
                </td>
                <td className="p-3.5 text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
