import React, { useState, useEffect } from 'react';
import { 
  Shield, Briefcase, GraduationCap, ArrowRight, CheckCircle2, 
  Layers, Check, Sparkles, FolderKanban, CheckSquare, FileText, 
  Users, DollarSign, BarChart3, LogIn, Building2, UserPlus, Zap,
  Award, Flame, Target, TrendingUp, HelpCircle, Play, Phone,
  MessageSquare, FileSpreadsheet, HardDrive, CheckCheck, IndianRupee,
  FileCheck2, Rocket, Clock, MessageCircle, X
} from 'lucide-react';
import { AuthModal, AuthModalMode } from '../auth/AuthModal';
import { FoundingPartnerForm } from './FoundingPartnerForm';

export const LandingPage: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthModalMode>('login');
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);

  const handleOpenAuth = (mode: AuthModalMode = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Workspace OS
              </span>
              <span className="ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                MSME Edition
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-300">
            <a href="#problems" className="hover:text-white transition-colors">Problems We Solve</a>
            <a href="#modules" className="hover:text-white transition-colors">Modules</a>
            <a href="#roles" className="hover:text-white transition-colors">Role Operations</a>
            <a href="#outcomes" className="hover:text-white transition-colors">Outcomes</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#founding-partner" className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              <span>Founding Partners</span>
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleOpenAuth('join-org')}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Join Workspace</span>
            </button>
            <button
              onClick={() => handleOpenAuth('login')}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => setIsPartnerModalOpen(true)}
              className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 group cursor-pointer"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: Hero */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>The Horizontal Operating System for Modern MSMEs</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4">
              Run Your Entire Business <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                From One Workspace
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
              Projects, CRM, Documents, Teams, Tasks and Automations in one operating system built for growing businesses.
            </p>

            {/* Core Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <a
                href="#founding-partner"
                className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center gap-2 group cursor-pointer"
              >
                <Award className="w-4 h-4 text-amber-300" />
                <span>Apply For Founding Partner Program</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <button
                onClick={() => handleOpenAuth('start-org')}
                className="px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 text-blue-400" />
                <span>Book Demo / Start Free</span>
              </button>
            </div>

            {/* Fragmentation Comparison */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 max-w-2xl mx-auto text-xs text-slate-300">
              <div className="flex flex-wrap items-center justify-center gap-2 text-slate-400">
                <span className="text-rose-400 line-through">Notion</span> &bull;
                <span className="text-rose-400 line-through">Trello</span> &bull;
                <span className="text-rose-400 line-through">Google Drive</span> &bull;
                <span className="text-rose-400 line-through">Excel</span> &bull;
                <span className="text-rose-400 line-through">WhatsApp</span> &bull;
                <span className="text-rose-400 line-through">Fragmented CRMs</span>
              </div>
              <div className="mt-2 text-emerald-400 font-semibold">
                &rarr; Replaced by Workspace OS: 1 Login &bull; 1 Workspace &bull; 1 Operating System
              </div>
            </div>

            {/* Target Audience Badges */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="text-slate-500">Built for growing MSMEs:</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium">Agencies</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium">Software Companies</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium">Consultancies</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium">Training Institutes</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium">Fitness Businesses</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium">Service Companies</span>
            </div>
          </div>

          {/* Live Preview Mockup Card */}
          <div className="relative mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="h-10 bg-slate-950/90 border-b border-slate-800 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-slate-400 ml-2 font-mono">Workspace OS — MSME Enterprise Command Center</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">Real-Time Sync Active</span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Active Business Projects</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">16 Active</p>
                <span className="text-[11px] text-emerald-400 font-medium">Operations & Sales synced</span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Team Task Velocity</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">94% On-Time</p>
                <span className="text-[11px] text-blue-400 font-medium">Kanban checklists verified</span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Active CRM Pipeline</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">₹4,85,000</p>
                <span className="text-[11px] text-purple-400 font-medium">18 Qualified Opportunities</span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Team Members</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">28 Active</p>
                <span className="text-[11px] text-slate-400 font-medium">4 Departments</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Problems We Solve */}
      <section id="problems" className="py-20 border-t border-slate-900 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Operational Bottlenecks</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              The 6 Bottlenecks Slowing Down MSME Growth
            </h2>
            <p className="text-slate-400 mt-3 text-sm">
              Growing companies lose hours every week to fragmented tools, disconnected communication, and lost context.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">1. Scattered Communication</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Important project decisions and client requirements get buried across WhatsApp groups, email threads, and Slack channels.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">2. Spreadsheet Chaos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Outdated Excel sheets for lead tracking and task management lead to broken formulas, duplicate data, and zero accountability.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">3. Lost Documents & SOPs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                SOPs, client contracts, and onboarding guides get scattered across personal Google Drives with no versioning or access controls.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">4. Poor Team Accountability</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Managers don't know who is working on what, leading to missed client deadlines and repeated status update meetings.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">5. CRM Fragmentation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sales reps forget to follow up with inbound leads. No unified visibility into deal stages, customer notes, or pipeline value.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">6. Manual Operations</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Repetitive manual tasks like assigning follow-ups, notifying team leads, and logging audit trails consume 10+ hours per week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Core Modules */}
      <section id="modules" className="py-20 bg-slate-900/30 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Core Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              8 Powerful Modules in One Cohesive Platform
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <FolderKanban className="w-6 h-6 text-blue-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Projects</h4>
              <p className="text-xs text-slate-400">Multi-department roadmaps, progress tracking, budget indicators, and milestone status.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <CheckSquare className="w-6 h-6 text-emerald-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Tasks & Kanban</h4>
              <p className="text-xs text-slate-400">Interactive Kanban columns (Todo, In Progress, Review, Done) with priority tags & comments.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <DollarSign className="w-6 h-6 text-amber-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Sales CRM</h4>
              <p className="text-xs text-slate-400">Pipeline stages, deal valuation, customer notes, contact logs, and conversion metrics.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <FileText className="w-6 h-6 text-rose-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Document Vault</h4>
              <p className="text-xs text-slate-400">Granular visibility (Public, Team, Private, Learning) backed by Backblaze B2 encryption.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <Sparkles className="w-6 h-6 text-purple-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Global Command Search</h4>
              <p className="text-xs text-slate-400">Instant full-text query across Projects, Tasks, Docs, CRM, and Team members in under 400ms.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <Zap className="w-6 h-6 text-indigo-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Workflow Automations</h4>
              <p className="text-xs text-slate-400">Trigger-Action automation rules for lead routing, task assignment, and automated notifications.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <Users className="w-6 h-6 text-cyan-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Team Management</h4>
              <p className="text-xs text-slate-400">Department directories, team leads, real-time presence indicators, and instant invites.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <BarChart3 className="w-6 h-6 text-emerald-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Analytics & Auditing</h4>
              <p className="text-xs text-slate-400">Executive overview charts, velocity tracking, revenue analytics, and tamper-evident audit trails.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Role-Based Operations */}
      <section id="roles" className="py-20 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Zero-Trust Operations</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              Three Operating Modes for Full Staff Alignment
            </h2>
            <p className="text-slate-400 mt-3 text-sm">
              Keep financial data confidential while empowering your team to execute with focused clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Admin — Run Company</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                For Founders, CEOs, and Executive Directors. Complete operational command over CRM sales pipelines, billing, member invites, and audit logs.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Full CRM & Financial Revenue Visibility</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Team Invitations & Role Governance</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Organization-Wide Audit Trail & Security</li>
              </ul>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Employee — Get Work Done</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                For Project Managers, Leads, and Developers. Focused on assigned deliverables, task updates, and team collaboration with zero billing clutter.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Assigned Projects & Kanban Task Boards</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Team Document Collaboration</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> High-Velocity Execution Zero Noise</li>
              </ul>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Intern — Learn & Execute</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                For Apprentices, Trainees, and Juniors. Restricted learning sandbox for studying company SOPs, completing assigned training tasks, and contributing safely.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Assigned Learning Checklists & Tasks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Training Handbooks & Company Guides</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Safe Sandbox Isolation Without Risk</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Customer Outcomes */}
      <section id="outcomes" className="py-20 border-t border-slate-900 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Measurable Impact</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              Transforming How Growing MSMEs Execute
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-extrabold text-blue-400 mb-1">100%</div>
              <h4 className="font-semibold text-white text-sm mb-1">Better Team Accountability</h4>
              <p className="text-xs text-slate-400">Real-time Kanban visibility and activity feeds eliminate missed deliverables and ambiguous task ownership.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-extrabold text-emerald-400 mb-1">3x Faster</div>
              <h4 className="font-semibold text-white text-sm mb-1">Execution Velocity</h4>
              <p className="text-xs text-slate-400">Unified project roadmaps and instant command search ensure team members spend time creating, not searching.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-extrabold text-amber-400 mb-1">Zero Chaos</div>
              <h4 className="font-semibold text-white text-sm mb-1">Organized Operations</h4>
              <p className="text-xs text-slate-400">Automated rules route inbound leads, assign onboarding tasks, and keep department leads synced.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-extrabold text-purple-400 mb-1">1 Vault</div>
              <h4 className="font-semibold text-white text-sm mb-1">Centralized Knowledge</h4>
              <p className="text-xs text-slate-400">All company SOPs, client proposals, and policies secured in an encrypted, permission-gated repository.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-extrabold text-cyan-400 mb-1">+45%</div>
              <h4 className="font-semibold text-white text-sm mb-1">Improved Sales Visibility</h4>
              <p className="text-xs text-slate-400">Structured CRM pipelines give executive founders real-time forecast accuracy on deals and customer revenue.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-extrabold text-rose-400 mb-1">Scale-Ready</div>
              <h4 className="font-semibold text-white text-sm mb-1">Business Scalability</h4>
              <p className="text-xs text-slate-400">Grow from 5 to 200+ team members smoothly with hardened PostgreSQL architecture and role sandboxes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Pricing (INR Restructure) */}
      <section id="pricing" className="py-20 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Simple Transparent Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              Scalable for Bootstrapped Startups to Growing MSMEs
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-mono">All prices in INR (₹) &bull; No hidden fees &bull; Upgrade or downgrade anytime</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Free */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Free</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">For small pilot teams</p>
                <div className="my-4">
                  <span className="text-2xl font-extrabold text-white">₹0</span>
                  <span className="text-xs text-slate-400"> / month</span>
                </div>
                <div className="space-y-1.5 py-3 border-y border-slate-800 text-[11px] text-slate-300 font-medium">
                  <div className="text-blue-300 font-semibold">5 Users</div>
                  <div>3 Projects</div>
                  <div>500 MB Storage</div>
                </div>
                <ul className="space-y-2 pt-3 text-[11px] text-slate-400">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Basic CRM</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Basic Documents</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Unified Search</li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenAuth('start-org')}
                className="w-full mt-6 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Start Free
              </button>
            </div>

            {/* Starter */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Starter</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">For growing teams</p>
                <div className="my-4">
                  <span className="text-2xl font-extrabold text-white">₹499</span>
                  <span className="text-xs text-slate-400"> / month</span>
                </div>
                <div className="space-y-1.5 py-3 border-y border-slate-800 text-[11px] text-slate-300 font-medium">
                  <div className="text-blue-300 font-semibold">15 Users</div>
                  <div>Unlimited Projects</div>
                  <div>2 GB Storage</div>
                </div>
                <ul className="space-y-2 pt-3 text-[11px] text-slate-400">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Full CRM Pipeline</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Encrypted Documents</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Global Search</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Activity Audit Logs</li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenAuth('start-org')}
                className="w-full mt-6 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Choose Starter
              </button>
            </div>

            {/* Business (Flagship) */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/70 to-slate-900 border-2 border-blue-500/80 flex flex-col justify-between relative shadow-xl shadow-blue-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full">
                Flagship Plan
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Business</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">For scaling MSMEs</p>
                <div className="my-4">
                  <span className="text-2xl font-extrabold text-white">₹1,499</span>
                  <span className="text-xs text-slate-400"> / month</span>
                </div>
                <div className="space-y-1.5 py-3 border-y border-slate-800 text-[11px] text-slate-300 font-medium">
                  <div className="text-blue-300 font-semibold">50 Users</div>
                  <div>Unlimited Projects</div>
                  <div>5 GB Storage</div>
                </div>
                <ul className="space-y-2 pt-3 text-[11px] text-slate-400">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Advanced CRM</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> 50 Automations</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Executive Analytics</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Team Role Permissions</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Priority Support</li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenAuth('start-org')}
                className="w-full mt-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors"
              >
                Launch Business
              </button>
            </div>

            {/* Growth */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Growth</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">For multi-team firms</p>
                <div className="my-4">
                  <span className="text-2xl font-extrabold text-white">₹3,999</span>
                  <span className="text-xs text-slate-400"> / month</span>
                </div>
                <div className="space-y-1.5 py-3 border-y border-slate-800 text-[11px] text-slate-300 font-medium">
                  <div className="text-blue-300 font-semibold">200 Users</div>
                  <div>Unlimited Projects</div>
                  <div>20 GB Storage</div>
                </div>
                <ul className="space-y-2 pt-3 text-[11px] text-slate-400">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Full API Access</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Advanced Automations</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Multiple Departments</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Custom Roles & Permissions</li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenAuth('start-org')}
                className="w-full mt-6 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Choose Growth
              </button>
            </div>

            {/* Enterprise */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Enterprise</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">For regulated scale</p>
                <div className="my-4">
                  <span className="text-2xl font-extrabold text-white">Custom</span>
                  <span className="text-xs text-slate-400"> / year</span>
                </div>
                <div className="space-y-1.5 py-3 border-y border-slate-800 text-[11px] text-slate-300 font-medium">
                  <div className="text-blue-300 font-semibold">Unlimited Users</div>
                  <div>Unlimited Projects</div>
                  <div>Dedicated TB Storage</div>
                </div>
                <ul className="space-y-2 pt-3 text-[11px] text-slate-400">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Single Sign-On (SSO)</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Dedicated 24/7 Support</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Custom Integrations</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Dedicated DB Instance</li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenAuth('start-org')}
                className="w-full mt-6 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: Founding Partner Program */}
      <section id="founding-partner" className="py-20 border-t border-slate-900 bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border-2 border-amber-500/60 shadow-2xl shadow-amber-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-bl-xl">
              Only 3 Organizations Will Be Selected
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-4">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Exclusive Launch Campaign</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Workspace OS Founding Partner Program
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8 max-w-2xl">
              We are selecting 3 forward-thinking MSMEs (Agencies, Software firms, Consultancies, Training Institutes) to co-build the definitive business operating system.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Business Plan Free For 12 Months</h4>
                  <p className="text-[11px] text-slate-400">₹17,988 annual value waived 100% for up to 50 staff members.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">White-Glove Setup & Template Ingestion</h4>
                  <p className="text-[11px] text-slate-400">Our engineering team custom-provisions your Projects, SOPs, and CRM in under 15 minutes.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Direct Founder Access & Priority Features</h4>
                  <p className="text-[11px] text-slate-400">Direct Slack/WhatsApp channel with our core architects and product leadership.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Lifetime 50% Renewal Discount</h4>
                  <p className="text-[11px] text-slate-400">Permanent locked-in founder pricing on all future renewals and extra seat add-ons.</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 mb-8 text-xs text-slate-300">
              <span className="font-semibold text-amber-400">Program Requirements:</span>
              <span className="ml-2">&bull; Active MSME &bull; Minimum 5 Team Members &bull; One 20-min Monthly Feedback Call &bull; Willing to provide verified testimonial</span>
            </div>

            <button
              onClick={() => setIsPartnerModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Apply Now (Only 3 Slots)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-300">Workspace OS</span>
            <span>&copy; {new Date().getFullYear()} Workspace OS, Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => handleOpenAuth('login')} className="hover:text-slate-300">Sign In</button>
            <button onClick={() => handleOpenAuth('join-org')} className="hover:text-slate-300">Join Workspace</button>
            <button onClick={() => setIsPartnerModalOpen(true)} className="text-amber-400 hover:text-amber-300">Founding Partners</button>
            <button onClick={() => handleOpenAuth('start-org')} className="hover:text-slate-300">Launch Workspace</button>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
      />

      {/* Founding Partner Modal */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl my-8">
            <button
              onClick={() => setIsPartnerModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <FoundingPartnerForm onSuccess={() => {}} />
          </div>
        </div>
      )}
    </div>
  );
};
