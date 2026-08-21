import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { schemaDefinitions } from '../../db/schema';
import { dbConnectionCode, betterAuthCode } from '../../db/connection';
import { ROLE_PERMISSIONS } from '../../lib/auth';
import { 
  ShieldAlert, Database, Terminal, FileCode, Lock, CheckCircle2, 
  XCircle, Clock, Copy, Check, Filter, Layers, Server 
} from 'lucide-react';

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
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Admin Tools & Architecture Diagnostics</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono font-semibold">
            Superuser Level
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Inspect PostgreSQL Drizzle ORM schema, Better Auth session guards, and live zero-trust audit trails.
        </p>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('rbac')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'rbac'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Role & Permissions Matrix</span>
        </button>

        <button
          onClick={() => setActiveSubTab('schema')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'schema'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Drizzle DB & Better Auth Schema</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'logs'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Real-time System Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: RBAC Permission Matrix */}
      {activeSubTab === 'rbac' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Full Role-Based Access Control (RBAC) Capabilities</h3>
              <p className="text-xs text-slate-400 mt-0.5">Enforced on every route, database query, and UI component.</p>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Module & Action</th>
                  <th className="p-3.5 text-purple-400">Admin</th>
                  <th className="p-3.5 text-blue-400">Employee</th>
                  <th className="p-3.5 text-emerald-400">Intern</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="p-3.5 font-medium text-white">Projects: Create / Edit / Delete</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed</td>
                  <td className="p-3.5 text-rose-400 font-medium">Denied</td>
                  <td className="p-3.5 text-rose-400 font-medium">Denied</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">Projects: View Assigned & Update %</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed</td>
                  <td className="p-3.5 text-rose-400 font-medium">Denied</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">Tasks: Create & Assign to Others</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed</td>
                  <td className="p-3.5 text-amber-400">Self-Task Only</td>
                  <td className="p-3.5 text-rose-400 font-medium">Denied</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">Tasks: Advance Status (Todo → In Progress → Done)</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed (Assigned Only)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">Documents: Organization Policies & Delete</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed</td>
                  <td className="p-3.5 text-amber-400">Personal Docs Only</td>
                  <td className="p-3.5 text-rose-400 font-medium">Read-Only</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">CRM: Pipeline Value & Lead Deletion</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed</td>
                  <td className="p-3.5 text-amber-400">Assigned Notes Only</td>
                  <td className="p-3.5 text-rose-400 font-medium">No Access</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">Teams: Manage & Invite Members</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed</td>
                  <td className="p-3.5 text-rose-400 font-medium">Denied</td>
                  <td className="p-3.5 text-rose-400 font-medium">Denied</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white">Financial Billing & Organization Settings</td>
                  <td className="p-3.5 text-emerald-400 font-bold">Allowed</td>
                  <td className="p-3.5 text-rose-400 font-medium">Denied</td>
                  <td className="p-3.5 text-rose-400 font-medium">Denied</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Drizzle ORM Schema & Better Auth Explorer */}
      {activeSubTab === 'schema' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Table Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block px-2 pb-2">
                PostgreSQL Tables
              </span>
              {Object.keys(schemaDefinitions).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedSchemaTable(key as any)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono font-medium flex items-center justify-between transition-colors ${
                    selectedSchemaTable === key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{key}</span>
                  <Database className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>

            {/* Code Display */}
            <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-2xl p-5 relative font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <FileCode className="w-4 h-4" />
                  <span>drizzle/schema.ts - {selectedSchemaTable} table</span>
                </span>
                <button
                  onClick={() => handleCopy(schemaDefinitions[selectedSchemaTable])}
                  className="flex items-center gap-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-750 transition-colors"
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
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Server className="w-4 h-4" />
                <span>lib/auth.ts - Better Auth Configuration</span>
              </span>
              <button
                onClick={() => handleCopy(betterAuthCode)}
                className="flex items-center gap-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-750 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <pre className="text-slate-300 overflow-x-auto p-2 leading-relaxed">
              <code>{betterAuthCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: System Audit Logs */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter Status:</span>
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1"
              >
                <option value="all">All Events</option>
                <option value="success">Success Only</option>
                <option value="denied">Access Denied Only</option>
                <option value="warning">Warnings</option>
              </select>
            </div>
            <span className="text-xs font-mono text-slate-400">{filteredLogs.length} Log Entries</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Action Executed</th>
                  <th className="p-3.5">Module</th>
                  <th className="p-3.5">IP Address</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 text-slate-400">{log.timestamp}</td>
                    <td className="p-3.5 text-white font-sans font-medium">{log.user_name}</td>
                    <td className="p-3.5 text-slate-200">{log.action}</td>
                    <td className="p-3.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{log.ip_address}</td>
                    <td className="p-3.5 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
        </div>
      )}
    </div>
  );
};
