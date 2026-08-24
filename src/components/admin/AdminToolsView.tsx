import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { schemaDefinitions } from '../../db/schema';
import { dbConnectionCode, betterAuthCode } from '../../db/connection';
import { 
  ShieldAlert, Database, Terminal, FileCode, Lock, CheckCircle2, 
  XCircle, Clock, Copy, Check, Filter, Layers, Server, Shield
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { motion } from 'motion/react';

export const AdminToolsView: React.FC = () => {
  const { systemLogs } = useWorkspace();
  const [activeSubTab, setActiveSubTab] = useState<'rbac' | 'schema' | 'logs'>('rbac');
  const [selectedSchemaTable, setSelectedSchemaTable] = useState<keyof typeof schemaDefinitions>('users');
  const [copiedCode, setCopiedCode] = useState(false);
  const [logFilter, setLogFilter] = useState<string>('all');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredLogs = systemLogs.filter((log) => {
    if (logFilter !== 'all' && log.status !== logFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Admin Diagnostics & Core Architecture"
        description="Inspect PostgreSQL Drizzle ORM schemas, Better Auth session capabilities, and real-time audit event streams."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold">
            Root Superuser Mode
          </span>
        }
      />

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('rbac')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeSubTab === 'rbac'
              ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/20'
              : 'bg-[#111827] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>RBAC Capabilities Matrix</span>
        </button>

        <button
          onClick={() => setActiveSubTab('schema')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeSubTab === 'schema'
              ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/20'
              : 'bg-[#111827] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Drizzle ORM & Database Schema</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/20'
              : 'bg-[#111827] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Audit Trail Telemetry</span>
        </button>
      </div>

      {/* TAB 1: RBAC Permission Matrix */}
      {activeSubTab === 'rbac' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="p-5 border-b border-white/[0.08] bg-[#0F172A]">
            <h3 className="text-sm font-semibold text-white">Full Role-Based Access Control (RBAC) Specification</h3>
            <p className="text-xs text-slate-400 mt-0.5">Enforced on every route, database query, and UI component.</p>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0F172A]/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Module & Action Scope</th>
                <th className="p-3.5 text-center text-purple-400">ADMIN</th>
                <th className="p-3.5 text-center text-blue-400">EMPLOYEE</th>
                <th className="p-3.5 text-center text-emerald-400">INTERN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              <tr>
                <td className="p-3.5 font-medium text-white">Projects: Create / Edit / Delete</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed</td>
                <td className="p-3.5 text-center text-rose-400 font-mono">Denied</td>
                <td className="p-3.5 text-center text-rose-400 font-mono">Denied</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-white">Projects: View Assigned & Update %</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed</td>
                <td className="p-3.5 text-center text-rose-400 font-mono">Denied</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-white">Tasks: Create & Assign to Others</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed</td>
                <td className="p-3.5 text-center text-amber-400">Self-Task Only</td>
                <td className="p-3.5 text-center text-rose-400 font-mono">Denied</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-white">Tasks: Advance Status (Todo → In Progress → Done)</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed (Assigned Only)</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-white">Documents: Organization Policies & Delete</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed</td>
                <td className="p-3.5 text-center text-amber-400">Personal Docs Only</td>
                <td className="p-3.5 text-center text-rose-400 font-mono">Read-Only</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-white">CRM: Pipeline Value & Lead Deletion</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed</td>
                <td className="p-3.5 text-center text-amber-400">Assigned Notes Only</td>
                <td className="p-3.5 text-center text-rose-400 font-mono">No Access</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-white">Teams: Manage & Invite Members</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed</td>
                <td className="p-3.5 text-center text-rose-400 font-mono">Denied</td>
                <td className="p-3.5 text-center text-rose-400 font-mono">Denied</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-white">Financial Billing & Organization Settings</td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">Allowed</td>
                <td className="p-3.5 text-center text-rose-400 font-mono">Denied</td>
                <td className="p-3.5 text-center text-rose-400 font-mono">Denied</td>
              </tr>
            </tbody>
          </table>
        </motion.div>
      )}

      {/* TAB 2: Drizzle ORM Schema & Better Auth Explorer */}
      {activeSubTab === 'schema' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Table Selector */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block px-2 pb-2">
                PostgreSQL Schema Tables
              </span>
              {Object.keys(schemaDefinitions).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedSchemaTable(key as any)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    selectedSchemaTable === key
                      ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#0F172A]'
                  }`}
                >
                  <span>{key}</span>
                  <Database className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>

            {/* Code Display */}
            <div className="lg:col-span-3 bg-[#0F172A] border border-white/[0.08] rounded-2xl p-5 relative font-mono text-xs overflow-hidden shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-slate-400">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <FileCode className="w-4 h-4" />
                  <span>drizzle/schema.ts • {selectedSchemaTable} table</span>
                </span>
                <button
                  onClick={() => handleCopy(schemaDefinitions[selectedSchemaTable])}
                  className="flex items-center gap-1 text-[11px] bg-[#111827] hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-white/[0.08] transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="text-slate-300 overflow-x-auto p-2 leading-relaxed">
                <code>{schemaDefinitions[selectedSchemaTable]}</code>
              </pre>
            </div>
          </div>

          {/* Better Auth Setup Snippet */}
          <div className="bg-[#0F172A] border border-white/[0.08] rounded-2xl p-5 font-mono text-xs shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-slate-400">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Server className="w-4 h-4" />
                <span>lib/auth.ts • Better Auth Server Engine</span>
              </span>
              <button
                onClick={() => handleCopy(betterAuthCode)}
                className="flex items-center gap-1 text-[11px] bg-[#111827] hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-white/[0.08] transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <pre className="text-slate-300 overflow-x-auto p-2 leading-relaxed">
              <code>{betterAuthCode}</code>
            </pre>
          </div>
        </motion.div>
      )}

      {/* TAB 3: System Audit Logs */}
      {activeSubTab === 'logs' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter Event Status:</span>
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="bg-[#111827] border border-white/[0.08] text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Events</option>
                <option value="success">Success Only</option>
                <option value="denied">Access Denied Only</option>
                <option value="warning">Warnings</option>
              </select>
            </div>
            <span className="text-xs font-mono text-slate-400">{filteredLogs.length} Log Events</span>
          </div>

          <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0F172A] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Action Executed</th>
                  <th className="p-3.5">Module</th>
                  <th className="p-3.5">IP Address</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono text-slate-300 text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 text-slate-400">{log.timestamp}</td>
                    <td className="p-3.5 text-white font-sans font-medium">{log.user_name}</td>
                    <td className="p-3.5 text-slate-200">{log.action}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-[#0F172A] border border-white/[0.06] text-purple-300 text-[10px]">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{log.ip_address}</td>
                    <td className="p-3.5 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        log.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : log.status === 'denied'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};
