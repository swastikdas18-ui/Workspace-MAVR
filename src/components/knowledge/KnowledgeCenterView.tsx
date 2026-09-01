import React, { useState, useEffect } from 'react';
import { 
  BookOpen, FileText, CheckCircle2, Copy, Search, Filter, Plus, 
  Lock, Globe, Users, ShieldCheck, Download, ArrowRight, Sparkles,
  Building2, FolderKanban, GraduationCap, FileCode, CheckSquare, Layers, Clock, Shield
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PageHeader } from '../common/PageHeader';
import { WikiView } from '../wiki/WikiView';
import { DocumentsView } from '../documents/DocumentsView';
import { api } from '../../lib/api';
import { Department } from '../../types';

export type KnowledgeTab = 'company_sops' | 'department_sops' | 'playbooks' | 'onboarding' | 'templates' | 'documents';

interface KnowledgeCenterViewProps {
  initialTab?: KnowledgeTab | 'wiki' | 'sops';
  routePageId?: string | null;
  routeDocumentId?: string | null;
  onRouteChange?: (id: string | null) => void;
}

export const KnowledgeCenterView: React.FC<KnowledgeCenterViewProps> = ({
  initialTab = 'company_sops',
  routePageId,
  routeDocumentId,
  onRouteChange,
}) => {
  console.log("ACTIVE KNOWLEDGE CENTER VIEW — SPRINT 4 OPERATIONAL BRAIN");

  const { documents, currentRole, currentWorkspace, projects, users } = useWorkspace();

  // Normalize initialTab
  const normalizedTab: KnowledgeTab = 
    initialTab === 'wiki' || initialTab === 'sops' ? 'company_sops' : (initialTab as KnowledgeTab);

  const [activeTab, setActiveTab] = useState<KnowledgeTab>(normalizedTab);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [wikiPages, setWikiPages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlaybook, setSelectedPlaybook] = useState<any | null>(null);
  const [selectedOnboardingTrack, setSelectedOnboardingTrack] = useState<any | null>(null);

  // Sync initialTab on change
  useEffect(() => {
    const nextTab = initialTab === 'wiki' || initialTab === 'sops' ? 'company_sops' : (initialTab as KnowledgeTab);
    if (nextTab && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [initialTab]);

  // Load Departments & Wiki Pages
  useEffect(() => {
    async function loadData() {
      try {
        const [deptRes, wikiRes] = await Promise.all([
          api.getDepartments(),
          api.getWikiPages()
        ]);
        if (deptRes?.departments) setDepartments(deptRes.departments);
        if (wikiRes?.pages) setWikiPages(wikiRes.pages);
      } catch (err) {
        console.error('[KnowledgeCenter] Failed to load data:', err);
      }
    }
    loadData();
  }, [currentWorkspace?.id]);

  // Pre-seeded Corporate Data
  const companySopsList = [
    { id: 'sop-leave', title: 'Employee Leave & Paid Time Off Policy', category: 'HR & People', lastUpdated: '2026-08-15', visibility: 'workspace', reads: 142, icon: CalendarIcon },
    { id: 'sop-expense', title: 'Corporate Expense Reimbursement & Procurement', category: 'Finance', lastUpdated: '2026-08-20', visibility: 'workspace', reads: 98, icon: DollarSignIcon },
    { id: 'sop-security', title: 'Information Security & Data Protection Policy', category: 'IT & Security', lastUpdated: '2026-08-28', visibility: 'workspace', reads: 210, icon: Shield },
    { id: 'sop-hiring', title: 'Standardized Talent Acquisition & Interviewing', category: 'HR & People', lastUpdated: '2026-08-10', visibility: 'workspace', reads: 76, icon: Users },
    { id: 'sop-remote', title: 'Hybrid & Remote Work Operational Guidelines', category: 'Operations', lastUpdated: '2026-08-25', visibility: 'workspace', reads: 185, icon: Globe },
    { id: 'sop-client', title: 'Client SLA & Communication Protocol', category: 'Client Success', lastUpdated: '2026-08-18', visibility: 'workspace', reads: 112, icon: Sparkles }
  ];

  const departmentSopsList = [
    { id: 'dsop-eng-code', deptName: 'Engineering', title: 'Code Review & Production Deployment SOP', items: ['Pull Request Checklist', 'CI/CD Pipeline Checks', 'Database Migration Protocol', 'Rollback Procedures'] },
    { id: 'dsop-sales-pipeline', deptName: 'Sales', title: 'Lead Qualification & CRM Deal Pipeline Protocol', items: ['BANT Qualification Model', 'Contract Sign-off Checklist', 'Handoff to Account Manager'] },
    { id: 'dsop-mktg-content', deptName: 'Marketing', title: 'Brand Asset Distribution & Campaign Release SOP', items: ['Graphic Guidelines', 'Copywriting Review', 'Multi-channel Distribution'] },
    { id: 'dsop-ops-procure', deptName: 'Operations', title: 'Facility Management & Hardware Provisioning SOP', items: ['Laptop Provisioning', 'Access Key Issuance', 'Inventory Management'] },
    { id: 'dsop-hr-review', deptName: 'Human Resources', title: 'Quarterly Performance Appraisal & OKR Review SOP', items: ['Self-Assessment Form', 'Manager Calibration', 'Compensation Alignment'] }
  ];

  const projectPlaybooksList = [
    { 
      id: 'pb-web-launch', 
      title: 'Enterprise Website Launch Playbook', 
      projectTitle: 'Portal Overhaul', 
      phases: ['Phase 1: UX/UI Sign-off', 'Phase 2: Frontend Build & API Integration', 'Phase 3: Security & Penetration Testing', 'Phase 4: DNS Switchover & Live Telemetry'], 
      relatedSops: ['Code Review SOP', 'Client SLA Protocol'] 
    },
    { 
      id: 'pb-app-release', 
      title: 'Mobile Application App Store Release Playbook', 
      projectTitle: 'Mobile Native App', 
      phases: ['Phase 1: iOS & Android TestFlight Build', 'Phase 2: App Store Metadata Approval', 'Phase 3: Staged Rollout (10% to 100%)'], 
      relatedSops: ['Code Review SOP', 'Information Security Policy'] 
    },
    { 
      id: 'pb-client-onboarding', 
      title: 'Tier-1 Enterprise Client Onboarding Playbook', 
      projectTitle: 'Client Acquisition Drive', 
      phases: ['Kickoff Meeting', 'Data Ingestion & SSO Integration', 'Admin & End-user Training', 'Sign-off & Production Go-Live'], 
      relatedSops: ['Client SLA Protocol', 'Expense Policy'] 
    }
  ];

  const onboardingTracksList = [
    {
      id: 'ob-developer',
      roleTitle: 'Software Engineer / Developer Onboarding',
      department: 'Engineering',
      schedule: [
        { period: 'Day 1', task: 'Setup Workstation, SSH keys, access GitHub repos & Slack dev channels.' },
        { period: 'Day 2-3', task: 'Run local docker setup, execute test suite, submit first documentation PR.' },
        { period: 'Week 1', task: 'Complete security awareness training & deploy first minor bug fix to staging.' },
        { period: 'Week 2-4', task: 'Take ownership of assigned sprint story under buddy mentorship.' }
      ]
    },
    {
      id: 'ob-sales',
      roleTitle: 'Sales Executive / Account Executive Onboarding',
      department: 'Sales',
      schedule: [
        { period: 'Day 1', task: 'Complete HR orientation, CRM access setup & product overview demo.' },
        { period: 'Day 2-3', task: 'Shadow senior AE on 3 client discovery calls and study product playbook.' },
        { period: 'Week 1', task: 'Pass Product Certification Quiz and master lead qualification flow.' },
        { period: 'Week 2-4', task: 'Initiate outbound calls and manage first 5 pipeline opportunities.' }
      ]
    },
    {
      id: 'ob-intern',
      roleTitle: 'Product / Operations Intern Sandbox Onboarding',
      department: 'Operations',
      schedule: [
        { period: 'Day 1', task: 'Workspace OS overview, learning sandbox access & supervisor intro.' },
        { period: 'Week 1', task: 'Review company SOPs, complete learning tasks, shadow team lead.' },
        { period: 'Week 2-4', task: 'Execute assigned operational support tasks & submit weekly reflection.' }
      ]
    }
  ];

  const templatesList = [
    { id: 'tpl-sop', title: 'Standard Operating Procedure (SOP) Template', desc: 'Structure operational workflows with clear objective, scope, step-by-step checklist, and responsibilities.', icon: CheckSquare, badge: 'SOP' },
    { id: 'tpl-policy', title: 'Corporate Policy & Guideline Template', desc: 'Standardized policy layout with executive summary, applicability, compliance requirements, and penalties.', icon: ShieldCheck, badge: 'Policy' },
    { id: 'tpl-playbook', title: 'Strategic Project Playbook Blueprint', desc: 'Multi-phase execution blueprint with milestones, deliverables, required documents, and SOP links.', icon: FolderKanban, badge: 'Playbook' },
    { id: 'tpl-onboarding', title: 'Role-based Onboarding Schedule Template', desc: 'Structured day-by-day and week-by-week onboarding checklist for new team members.', icon: GraduationCap, badge: 'Onboarding' },
    { id: 'tpl-rfc', title: 'Engineering RFC & Technical Spec Template', desc: 'Technical design document format covering architecture, API contracts, security implications, and alternative designs.', icon: FileCode, badge: 'Technical' },
    { id: 'tpl-meeting', title: 'Executive Meeting & Decision Log Template', desc: 'Structured agenda, attendees, action items, owner assignments, and decision records.', icon: Users, badge: 'Meeting' }
  ];

  const filteredCompanySops = companySopsList.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.category.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Unified Header */}
      <PageHeader
        title="Knowledge Center"
        description="Operational brain of Workspace OS: Company SOPs, Department Playbooks, Onboarding Tracks, Templates, and Vault Documents."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
            {companySopsList.length + wikiPages.length + documents.length} Operational Assets
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium font-mono">Knowledge Engine:</span>
            <span className="text-xs px-3 py-1 rounded-xl bg-[#0F172A] border border-white/[0.08] text-white font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Operational Brain
            </span>
          </div>
        }
      />

      {/* Primary 6-Tab Switcher */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-1 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('company_sops')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'company_sops'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Company SOPs</span>
          </button>

          <button
            onClick={() => setActiveTab('department_sops')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'department_sops'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Department SOPs</span>
          </button>

          <button
            onClick={() => setActiveTab('playbooks')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'playbooks'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <FolderKanban className="w-4 h-4 text-emerald-400" />
            <span>Project Playbooks</span>
          </button>

          <button
            onClick={() => setActiveTab('onboarding')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'onboarding'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <span>Employee Onboarding</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <Copy className="w-4 h-4 text-cyan-400" />
            <span>Templates</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>Documents Vault</span>
          </button>
        </div>
      </div>

      {/* TAB 1: COMPANY SOPS */}
      {activeTab === 'company_sops' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search company policies & SOPs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Role Permission: <strong className="text-blue-400 uppercase">{currentRole}</strong> (Server Enforced)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanySops.map((sop) => {
              const IconComp = sop.icon;
              return (
                <div key={sop.id} className="bg-[#111827] border border-white/[0.06] hover:border-blue-500/30 rounded-2xl p-5 space-y-3 shadow-lg transition-all group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                      🌍 Workspace Policy
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500">{sop.category}</span>
                    <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 mt-0.5">
                      {sop.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/[0.04]">
                    <span>Updated: {sop.lastUpdated}</span>
                    <span className="text-slate-500">{sop.reads} reads</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Render Full Interactive Wiki View for Full Article Detail */}
          <div className="pt-6 border-t border-white/[0.08]">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Full Corporate Wiki Article Repository
            </h3>
            <WikiView embedded routePageId={routePageId} onRouteChange={onRouteChange} />
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENT SOPS */}
      {activeTab === 'department_sops' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filter Department:</span>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="bg-[#111827] border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 font-semibold"
              >
                <option value="all">All Departments ({departments.length})</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <span className="text-xs text-purple-400 font-mono">
              👥 Department Scoped Access (`employee_profiles.department_id`)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departmentSopsList
              .filter((ds) => selectedDeptId === 'all' || ds.deptName.toLowerCase() === selectedDeptId.toLowerCase())
              .map((ds) => (
                <div key={ds.id} className="bg-[#111827] border border-white/[0.06] rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono">{ds.deptName} Department</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                      Department SOP
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{ds.title}</h3>

                  <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-white/[0.04]">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Operational Checklist Items</span>
                    {ds.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: PROJECT PLAYBOOKS */}
      {activeTab === 'playbooks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-emerald-400" />
              Strategic Project Execution Playbooks
            </h3>
            <span className="text-xs text-emerald-400 font-mono">
              Linked to Projects Hub (`schema.projects`)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projectPlaybooksList.map((pb) => (
              <div key={pb.id} className="bg-[#111827] border border-white/[0.06] hover:border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Project Playbook
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{pb.projectTitle}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white leading-snug">{pb.title}</h3>
                </div>

                <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-white/[0.04] text-xs">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Execution Phases</span>
                  {pb.phases.map((phase, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-300 text-[11px]">
                      <Layers className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{phase}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400">
                  <span>SOP Links: {pb.relatedSops.length}</span>
                  <button
                    onClick={() => setSelectedPlaybook(pb)}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    View Playbook <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: EMPLOYEE ONBOARDING */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              Role-Based Employee Onboarding Schedules
            </h3>
            <span className="text-xs text-amber-400 font-mono">
              Structured Timeline Roadmap
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {onboardingTracksList.map((track) => (
              <div key={track.id} className="bg-[#111827] border border-white/[0.06] rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      {track.department} Track
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white leading-snug">{track.roleTitle}</h3>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {track.schedule.map((item, idx) => (
                    <div key={idx} className="bg-slate-900/60 p-2.5 rounded-xl border border-white/[0.04] space-y-0.5 text-xs">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">{item.period}</span>
                      <p className="text-slate-300 leading-relaxed text-[11px]">{item.task}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/[0.04] text-right">
                  <button
                    onClick={() => setSelectedOnboardingTrack(track)}
                    className="text-amber-400 hover:text-amber-300 text-xs font-semibold cursor-pointer flex items-center gap-1 ml-auto"
                  >
                    View Track Schedule <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: TEMPLATES LIBRARY */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Copy className="w-4 h-4 text-cyan-400" />
              Corporate Knowledge Template Repository
            </h3>
            <span className="text-xs text-cyan-400 font-mono">
              Create from Template
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templatesList.map((tpl) => {
              const IconComp = tpl.icon;
              return (
                <div key={tpl.id} className="bg-[#111827] border border-white/[0.06] hover:border-cyan-500/30 rounded-2xl p-5 space-y-3 shadow-lg flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                        {tpl.badge}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{tpl.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{tpl.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.04]">
                    <button
                      onClick={() => setActiveTab('company_sops')}
                      className="w-full py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Use Template</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: DOCUMENTS VAULT */}
      {activeTab === 'documents' && (
        <DocumentsView embedded routeDocumentId={routeDocumentId} onRouteChange={onRouteChange} />
      )}
    </div>
  );
};

// Helper SVG Icons
function CalendarIcon(props: any) {
  return <Clock {...props} />;
}
function DollarSignIcon(props: any) {
  return <Sparkles {...props} />;
}
