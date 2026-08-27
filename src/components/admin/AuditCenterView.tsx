import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Shield, User, Calendar, Package, ChevronDown } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { motion } from 'motion/react';
import { api } from '../../lib/api';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  user: { name: string; email: string; id: string };
  ipAddress?: string | null;
  createdAt: string | Date;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  UPDATE: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-300 border-red-500/20',
  LOGIN: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  LOGOUT: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  INVITE: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  EXPORT: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
};

const MODULES = ['All Modules', 'project', 'task', 'crm', 'document', 'billing', 'session', 'workspace', 'team'];
const ACTIONS = ['All Actions', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'INVITE', 'EXPORT'];

function formatTime(d: string | Date): string {
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export const AuditCenterView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('All Modules');
  const [selectedAction, setSelectedAction] = useState('All Actions');
  const [selectedActor, setSelectedActor] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        setIsLoading(true);
        const res = await api.getAuditLogs();
        if (res && res.logs) {
          const mapped: AuditLog[] = res.logs.map((l: any) => ({
            id: l.id,
            action: l.action || 'UPDATE',
            resource: l.module || l.entityType || 'workspace',
            resourceId: l.entityId || l.id,
            user: {
              name: l.actorName || 'User',
              email: l.actorEmail || '',
              id: l.actorId || 'u1',
            },
            ipAddress: l.ipAddress || null,
            createdAt: l.createdAt || new Date().toISOString(),
            oldValues: l.oldValues || null,
            newValues: l.newValues || null,
          }));
          setLogs(mapped);
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.warn('Failed to load audit center logs:', err);
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAudit();
  }, []);

  const filtered = logs.filter((log) => {
    if (selectedModule !== 'All Modules' && log.resource !== selectedModule) return false;
    if (selectedAction !== 'All Actions' && log.action !== selectedAction) return false;
    if (selectedActor && !log.user.name.toLowerCase().includes(selectedActor.toLowerCase()) && !log.user.email.toLowerCase().includes(selectedActor.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!log.action.toLowerCase().includes(q) && !log.resource.toLowerCase().includes(q) && !log.resourceId.toLowerCase().includes(q) && !log.user.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Action', 'Module', 'Resource ID', 'Actor', 'Email', 'IP', 'Time'];
    const rows = filtered.map((l) => [l.id, l.action, l.resource, l.resourceId, l.user.name, l.user.email, l.ipAddress || '', formatTime(l.createdAt)]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Center"
        description="Search, filter, and export complete audit trails for security compliance and operational visibility."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold">
            Admin Only
          </span>
        }
      />

      {/* Filters Row */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              id="audit-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, module, resource..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900/60 border border-white/[0.06] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>

          {/* Module Filter */}
          <div className="relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <select
              id="audit-module-filter"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full pl-9 pr-7 py-2 text-xs bg-slate-900/60 border border-white/[0.06] rounded-xl text-slate-200 focus:outline-none focus:border-blue-500/40 appearance-none cursor-pointer"
            >
              {MODULES.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <select
              id="audit-action-filter"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full pl-9 pr-7 py-2 text-xs bg-slate-900/60 border border-white/[0.06] rounded-xl text-slate-200 focus:outline-none focus:border-blue-500/40 appearance-none cursor-pointer"
            >
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Actor Search */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              id="audit-actor-filter"
              type="text"
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              placeholder="Filter by actor..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900/60 border border-white/[0.06] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{filtered.length} event{filtered.length !== 1 ? 's' : ''} found</p>
          <button
            id="audit-export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/60 border border-white/[0.06] hover:bg-slate-700/60 transition-all cursor-pointer"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-900/40">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Module</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Resource ID</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Actor</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">IP Address</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Time</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    <Shield className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                    No audit events match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <React.Fragment key={log.id}>
                    <motion.tr
                      layout
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${ACTION_COLORS[log.action] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono">{log.resource}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono truncate max-w-[100px]">{log.resourceId}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-slate-200 font-medium">{log.user.name}</p>
                          <p className="text-slate-600">{log.user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono">{log.ipAddress || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          {formatTime(log.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} />
                      </td>
                    </motion.tr>
                    {expandedId === log.id && (log.oldValues || log.newValues) && (
                      <tr>
                        <td colSpan={7} className="px-4 pb-4 pt-1 bg-slate-900/30">
                          <div className="grid grid-cols-2 gap-3">
                            {log.oldValues && (
                              <div>
                                <p className="text-[10px] font-bold text-red-400 mb-1">Previous Values</p>
                                <pre className="text-[10px] text-slate-400 font-mono bg-red-500/5 border border-red-500/10 rounded-lg p-2 overflow-auto max-h-24">{JSON.stringify(log.oldValues, null, 2)}</pre>
                              </div>
                            )}
                            {log.newValues && (
                              <div>
                                <p className="text-[10px] font-bold text-emerald-400 mb-1">New Values</p>
                                <pre className="text-[10px] text-slate-400 font-mono bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 overflow-auto max-h-24">{JSON.stringify(log.newValues, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
