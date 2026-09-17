import React, { useState, useEffect } from 'react';
import { 
  Shield, Briefcase, GraduationCap, ArrowRight, CheckCircle2, 
  Layers, Check, Sparkles, FolderKanban, CheckSquare, FileText, 
  Users, DollarSign, BarChart3, LogIn, UserPlus, Zap,
  MessageSquare, FileSpreadsheet, HardDrive, BookOpen
} from 'lucide-react';
import { AuthModal, AuthModalMode } from '../auth/AuthModal';

export const LandingPage: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthModalMode>('login');
  const [initialEmail, setInitialEmail] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (urlParams.get('inviteAccepted') === 'true' || path === '/login' || path === '/auth/login') {
      const email = urlParams.get('email');
      if (email) setInitialEmail(email);
      setAuthMode('login');
      setIsAuthOpen(true);
    }
  }, []);

  const handleOpenAuth = (mode: AuthModalMode = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 selection:bg-amber-200 selection:text-stone-900 antialiased font-sans">
      {/* Top Navbar */}
      <header className="border-b border-[#E8E3DA] bg-[#FBF9F5]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-stone-900 via-stone-800 to-amber-700 flex items-center justify-center shadow-md shadow-amber-900/10">
              <Layers className="w-5 h-5 text-[#FBF9F5]" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-stone-900 font-heading">
                Workspace OS
              </span>
              <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60">
                Public Beta
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-stone-600">
            <a href="#problems" className="hover:text-stone-900 transition-colors">Problems We Solve</a>
            <a href="#modules" className="hover:text-stone-900 transition-colors">Modules</a>
            <a href="#roles" className="hover:text-stone-900 transition-colors">Role Operations</a>
            <a href="#outcomes" className="hover:text-stone-900 transition-colors">Outcomes</a>
            <a href="#features" className="hover:text-stone-900 transition-colors">Features</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleOpenAuth('join-org')}
              className="text-xs font-semibold text-stone-700 hover:text-stone-950 px-3 py-2 rounded-lg hover:bg-stone-200/50 transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-700" />
              <span>Join Workspace</span>
            </button>
            <button
              onClick={() => handleOpenAuth('login')}
              className="text-xs font-semibold text-stone-700 hover:text-stone-950 px-3 py-2 rounded-lg hover:bg-stone-200/50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-stone-600" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => handleOpenAuth('start-org')}
              className="text-xs font-semibold bg-[#1C1917] hover:bg-[#292524] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 group cursor-pointer"
            >
              <span>Create Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: Hero */}
      <section className="relative pt-20 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-[#FBF9F5] to-[#FBF9F5] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold mb-6 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>The Unified Operating System for Modern Teams</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-stone-900 leading-tight mb-5 font-heading">
              Run Your Entire Business <br />
              <span className="bg-gradient-to-r from-amber-800 via-stone-800 to-amber-700 bg-clip-text text-transparent">
                From One Workspace
              </span>
            </h1>

            <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
              Projects, CRM, Documents, Teams, Tasks, and Automations in one cohesive operating system built for high-velocity teams.
            </p>

            {/* Core Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <button
                onClick={() => handleOpenAuth('start-org')}
                className="px-7 py-3.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-semibold text-sm shadow-xl shadow-stone-900/10 hover:shadow-stone-900/20 transition-all flex items-center gap-2 group cursor-pointer"
              >
                <span>Create Workspace</span>
                <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <a
                href="#trust"
                className="px-7 py-3.5 rounded-xl bg-white hover:bg-stone-50 border border-[#E8E3DA] text-stone-800 font-semibold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Platform</span>
              </a>
            </div>

            {/* Fragmentation Replacement Comparison */}
            <div className="p-4 rounded-2xl bg-white/90 border border-[#E8E3DA] max-w-2xl mx-auto text-xs text-stone-600 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-center gap-2 text-stone-500">
                <span className="text-rose-600 line-through">Notion</span> &bull;
                <span className="text-rose-600 line-through">Trello</span> &bull;
                <span className="text-rose-600 line-through">Google Drive</span> &bull;
                <span className="text-rose-600 line-through">Excel</span> &bull;
                <span className="text-rose-600 line-through">WhatsApp</span> &bull;
                <span className="text-rose-600 line-through">Fragmented CRMs</span>
              </div>
              <div className="mt-2 text-amber-800 font-semibold">
                &rarr; Replaced by Workspace OS: 1 Login &bull; 1 Workspace &bull; 1 Operating System
              </div>
            </div>

            {/* Target Audience Badges */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-stone-500">
              <span className="text-stone-400 font-medium">Built for growing teams:</span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#E8E3DA] text-stone-700 font-medium shadow-xs">Agencies</span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#E8E3DA] text-stone-700 font-medium shadow-xs">Software Companies</span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#E8E3DA] text-stone-700 font-medium shadow-xs">Consultancies</span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#E8E3DA] text-stone-700 font-medium shadow-xs">Training Institutes</span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-[#E8E3DA] text-stone-700 font-medium shadow-xs">Service Firms</span>
            </div>
          </div>

          {/* Live Preview Mockup Card */}
          <div className="relative mx-auto max-w-5xl rounded-2xl border border-[#E8E3DA] bg-white shadow-xl shadow-stone-900/5 overflow-hidden">
            <div className="h-10 bg-[#FAF8F5] border-b border-[#E8E3DA] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs text-stone-500 ml-2 font-mono">Workspace OS — Unified Operations Command Center</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 text-[10px]">Real-Time Sync Active</span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-[#FBF9F5]">
              <div className="bg-white p-4 rounded-xl border border-[#E8E3DA] shadow-xs">
                <p className="text-xs text-stone-500 font-medium">Active Business Projects</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">16 Active</p>
                <span className="text-[11px] text-amber-700 font-semibold mt-1 inline-block">Operations & Pipelines synced</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E8E3DA] shadow-xs">
                <p className="text-xs text-stone-500 font-medium">Team Task Velocity</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">94% On-Time</p>
                <span className="text-[11px] text-sky-700 font-semibold mt-1 inline-block">Kanban checklists verified</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E8E3DA] shadow-xs">
                <p className="text-xs text-stone-500 font-medium">Active CRM Pipeline</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">18 Deals</p>
                <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">Qualified Opportunities</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E8E3DA] shadow-xs">
                <p className="text-xs text-stone-500 font-medium">Team Members</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">28 Active</p>
                <span className="text-[11px] text-stone-600 font-semibold mt-1 inline-block">4 Departments</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Trust / Unified OS Section */}
      <section id="trust" className="py-20 border-t border-[#E8E3DA] bg-[#F5F2EB]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Unified Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mt-2 font-heading">
              One Operating System For Your Entire Company
            </h2>
            <p className="text-stone-600 mt-3 text-sm leading-relaxed">
              Stop juggling 8 disconnected SaaS tabs. Workspace OS brings your core operational workflows together under a single, hardened platform.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { title: 'Projects', icon: FolderKanban, desc: 'Planning to delivery lifecycles' },
              { title: 'Tasks', icon: CheckSquare, desc: 'Realtime Kanban boards' },
              { title: 'CRM', icon: DollarSign, desc: 'Deal stages and lead tracking' },
              { title: 'Knowledge', icon: BookOpen, desc: 'Company wiki & living documentation' },
              { title: 'Documents', icon: FileText, desc: 'Encrypted document vault' },
              { title: 'Teams', icon: Users, desc: 'Department directories & leads' },
              { title: 'Automation', icon: Zap, desc: 'Trigger-action workflow rules' },
              { title: 'Analytics', icon: BarChart3, desc: 'Real-time velocity & telemetry' },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white border border-[#E8E3DA] text-center hover:border-amber-400/80 hover:shadow-md transition-all shadow-xs">
                <div className="w-9 h-9 mx-auto rounded-lg bg-amber-50 border border-amber-200/60 text-amber-800 flex items-center justify-center mb-2.5">
                  <item.icon className="w-4.5 h-4.5" />
                </div>
                <h4 className="font-semibold text-stone-900 text-sm">{item.title}</h4>
                <p className="text-[11px] text-stone-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: Problems We Solve */}
      <section id="problems" className="py-20 border-t border-[#E8E3DA] bg-[#FBF9F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Operational Bottlenecks</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mt-2 font-heading">
              The 6 Bottlenecks Slowing Down Team Execution
            </h2>
            <p className="text-stone-600 mt-3 text-sm">
              Growing companies lose hours every week to fragmented tools, disconnected communication, and lost context.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#E8E3DA] p-6 rounded-2xl shadow-xs hover:border-stone-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">1. Scattered Communication</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Important project decisions and client requirements get buried across WhatsApp groups, email threads, and multiple channels.
              </p>
            </div>

            <div className="bg-white border border-[#E8E3DA] p-6 rounded-2xl shadow-xs hover:border-stone-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">2. Spreadsheet Chaos</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Outdated sheets for lead tracking and task management lead to broken formulas, duplicate entries, and zero accountability.
              </p>
            </div>

            <div className="bg-white border border-[#E8E3DA] p-6 rounded-2xl shadow-xs hover:border-stone-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center mb-4">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">3. Lost Documents & SOPs</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                SOPs, contracts, and onboarding guides get scattered across personal storage with no versioning or access controls.
              </p>
            </div>

            <div className="bg-white border border-[#E8E3DA] p-6 rounded-2xl shadow-xs hover:border-stone-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-center mb-4">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">4. Poor Team Accountability</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Managers don't know who is working on what, leading to missed client deadlines and repeated status update meetings.
              </p>
            </div>

            <div className="bg-white border border-[#E8E3DA] p-6 rounded-2xl shadow-xs hover:border-stone-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mb-4">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">5. CRM Fragmentation</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sales reps forget to follow up with inbound leads. No unified visibility into deal stages, customer notes, or pipeline value.
              </p>
            </div>

            <div className="bg-white border border-[#E8E3DA] p-6 rounded-2xl shadow-xs hover:border-stone-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">6. Manual Operations</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Repetitive manual tasks like assigning follow-ups, notifying team leads, and logging audit trails consume 10+ hours per week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Core Modules */}
      <section id="modules" className="py-20 bg-[#F5F2EB]/50 border-t border-[#E8E3DA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Core Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mt-2 font-heading">
              8 Powerful Modules in One Cohesive Platform
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white border border-[#E8E3DA] shadow-xs">
              <FolderKanban className="w-6 h-6 text-amber-700 mb-3" />
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Projects</h4>
              <p className="text-xs text-stone-600">Multi-department roadmaps, progress tracking, budget indicators, and milestone status.</p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E8E3DA] shadow-xs">
              <CheckSquare className="w-6 h-6 text-emerald-700 mb-3" />
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Tasks & Kanban</h4>
              <p className="text-xs text-stone-600">Interactive Kanban columns (Todo, In Progress, Review, Done) with priority tags & comments.</p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E8E3DA] shadow-xs">
              <DollarSign className="w-6 h-6 text-amber-800 mb-3" />
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Sales CRM</h4>
              <p className="text-xs text-stone-600">Pipeline stages, deal valuation, customer notes, contact logs, and conversion metrics.</p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E8E3DA] shadow-xs">
              <FileText className="w-6 h-6 text-rose-700 mb-3" />
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Document Vault</h4>
              <p className="text-xs text-stone-600">Granular visibility (Public, Team, Private, Learning) backed by Backblaze B2 encryption.</p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E8E3DA] shadow-xs">
              <Sparkles className="w-6 h-6 text-amber-700 mb-3" />
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Global Command Search</h4>
              <p className="text-xs text-stone-600">Instant full-text query across Projects, Tasks, Docs, CRM, and Team members in under 400ms.</p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E8E3DA] shadow-xs">
              <Zap className="w-6 h-6 text-stone-800 mb-3" />
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Workflow Automations</h4>
              <p className="text-xs text-stone-600">Trigger-Action automation rules for lead routing, task assignment, and automated notifications.</p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E8E3DA] shadow-xs">
              <Users className="w-6 h-6 text-sky-700 mb-3" />
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Team Management</h4>
              <p className="text-xs text-stone-600">Department directories, team leads, real-time presence indicators, and instant invites.</p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#E8E3DA] shadow-xs">
              <BarChart3 className="w-6 h-6 text-emerald-700 mb-3" />
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Analytics & Auditing</h4>
              <p className="text-xs text-stone-600">Executive overview charts, velocity tracking, revenue analytics, and tamper-evident audit trails.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Role-Based Operations */}
      <section id="roles" className="py-20 border-t border-[#E8E3DA] bg-[#FBF9F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Zero-Trust Operations</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mt-2 font-heading">
              Three Operating Modes for Full Staff Alignment
            </h2>
            <p className="text-stone-600 mt-3 text-sm">
              Keep financial data confidential while empowering your team to execute with focused clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-[#E8E3DA] p-6 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">Admin — Run Company</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-4">
                For Founders, CEOs, and Executive Directors. Complete operational command over CRM sales pipelines, member invites, and audit logs.
              </p>
              <ul className="space-y-2 text-xs text-stone-700">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-700" /> Full CRM & Pipeline Visibility</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-700" /> Team Invitations & Role Governance</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-700" /> Organization-Wide Audit Trail & Security</li>
              </ul>
            </div>

            <div className="bg-white border border-[#E8E3DA] p-6 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">Employee — Get Work Done</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-4">
                For Project Managers, Leads, and Contributors. Focused on assigned deliverables, task updates, and team collaboration with zero clutter.
              </p>
              <ul className="space-y-2 text-xs text-stone-700">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-sky-700" /> Assigned Projects & Kanban Task Boards</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-sky-700" /> Team Document Collaboration</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-sky-700" /> High-Velocity Execution Zero Noise</li>
              </ul>
            </div>

            <div className="bg-white border border-[#E8E3DA] p-6 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">Intern — Learn & Execute</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-4">
                For Apprentices, Trainees, and Juniors. Restricted learning sandbox for studying company SOPs, completing assigned training tasks, and contributing safely.
              </p>
              <ul className="space-y-2 text-xs text-stone-700">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Assigned Learning Checklists & Tasks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Training Handbooks & Company Guides</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Safe Sandbox Isolation Without Risk</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Customer Outcomes */}
      <section id="outcomes" className="py-20 border-t border-[#E8E3DA] bg-[#F5F2EB]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Measurable Impact</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mt-2 font-heading">
              Transforming How High-Velocity Teams Execute
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-[#E8E3DA] shadow-xs">
              <div className="text-2xl font-extrabold text-stone-900 mb-1">100%</div>
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Better Team Accountability</h4>
              <p className="text-xs text-stone-600">Real-time Kanban visibility and activity feeds eliminate missed deliverables and ambiguous task ownership.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-[#E8E3DA] shadow-xs">
              <div className="text-2xl font-extrabold text-emerald-700 mb-1">3x Faster</div>
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Execution Velocity</h4>
              <p className="text-xs text-stone-600">Unified project roadmaps and instant command search ensure team members spend time creating, not searching.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-[#E8E3DA] shadow-xs">
              <div className="text-2xl font-extrabold text-amber-700 mb-1">Zero Chaos</div>
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Organized Operations</h4>
              <p className="text-xs text-stone-600">Automated rules route inbound leads, assign onboarding tasks, and keep department leads synced.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-[#E8E3DA] shadow-xs">
              <div className="text-2xl font-extrabold text-stone-900 mb-1">1 Vault</div>
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Centralized Knowledge</h4>
              <p className="text-xs text-stone-600">All company SOPs, client proposals, and policies secured in an encrypted, permission-gated repository.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-[#E8E3DA] shadow-xs">
              <div className="text-2xl font-extrabold text-sky-700 mb-1">+45%</div>
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Improved Pipeline Visibility</h4>
              <p className="text-xs text-stone-600">Structured CRM pipelines give founders real-time forecast accuracy on deals and customer opportunities.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-[#E8E3DA] shadow-xs">
              <div className="text-2xl font-extrabold text-stone-800 mb-1">Scale-Ready</div>
              <h4 className="font-semibold text-stone-900 text-sm mb-1">Platform Reliability</h4>
              <p className="text-xs text-stone-600">Grow from 5 to 200+ team members smoothly with hardened PostgreSQL architecture and role sandboxes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: Public Beta — Everything Included */}
      <section id="features" className="py-20 border-t border-[#E8E3DA] bg-gradient-to-b from-white via-[#FBF9F5] to-[#F5F2EB]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-white border border-amber-200/80 shadow-xl shadow-amber-900/5 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-900 text-xs font-semibold mb-4">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Free Public Beta Access</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mb-3 font-heading">
              Everything Included During Public Beta
            </h2>

            <p className="text-sm text-stone-600 max-w-2xl mx-auto mb-10">
              Get immediate, unmetered access to every tool and module inside Workspace OS. No credit card required.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3.5 max-w-4xl mx-auto mb-10 text-left">
              {[
                'Unlimited Workspaces',
                'Unlimited Team Members',
                'Unlimited Projects',
                'Unlimited Tasks',
                'CRM Pipeline',
                'Workspace Wiki',
                'Document Vault',
                'Analytics',
                'Automations',
                'Client Portal',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA]">
                  <Check className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-xs font-semibold text-stone-800">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center justify-center gap-4">
              <button
                onClick={() => handleOpenAuth('start-org')}
                className="px-8 py-4 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-sm shadow-xl shadow-stone-900/15 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Create Workspace</span>
                <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="text-xs text-stone-500 font-medium">
                Workspace OS is currently free while we validate and improve the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E8E3DA] py-10 bg-[#F5F2EB] text-xs text-stone-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-700" />
            <span className="font-semibold text-stone-800">Workspace OS</span>
            <span>&copy; {new Date().getFullYear()} Workspace OS. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => handleOpenAuth('login')} className="hover:text-stone-900 transition-colors cursor-pointer">Sign In</button>
            <button onClick={() => handleOpenAuth('join-org')} className="hover:text-stone-900 transition-colors cursor-pointer">Join Workspace</button>
            <button onClick={() => handleOpenAuth('start-org')} className="hover:text-stone-900 transition-colors cursor-pointer">Create Workspace</button>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        initialEmail={initialEmail}
      />
    </div>
  );
};
