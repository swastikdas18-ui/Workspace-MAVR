import React, { useState } from 'react';
import { 
  Shield, Briefcase, GraduationCap, ArrowRight, CheckCircle2, Layers, 
  Lock, Check, Sparkles, FolderKanban, CheckSquare, FileText, Users, DollarSign, 
  BarChart3, LogIn
} from 'lucide-react';
import { AuthModal } from '../auth/AuthModal';

export const LandingPage: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
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
                Enterprise
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#roles" className="hover:text-white transition-colors">Role Matrix</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenAuth('login')}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => handleOpenAuth('register')}
              className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>The Complete Business Operating System for Modern Teams</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
              One Unified OS. <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Three Tailored Workspaces.
              </span>
            </h1>

            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Empower your organization with purpose-built environments. Full executive oversight for 
              <strong> Admins</strong>, high-velocity workflows for <strong>Employees</strong>, and guided onboarding for <strong>Interns</strong>.
            </p>

            {/* Authentication Entry CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => handleOpenAuth('register')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 group"
              >
                <span>Create Workspace Account</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => handleOpenAuth('login')}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Sign In to Existing Account</span>
              </button>
            </div>
          </div>

          {/* Live Preview Mockup Card */}
          <div className="relative mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="h-10 bg-slate-950/90 border-b border-slate-800 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-slate-500 ml-2 font-mono">https://workspace-os.internal/dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">Server RBAC Enforced</span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Total Projects</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">12 Active</p>
                <span className="text-[11px] text-emerald-400 font-medium">+3 this quarter</span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Tasks in Pipeline</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">84 Tasks</p>
                <span className="text-[11px] text-blue-400 font-medium">92% velocity rate</span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Active CRM Pipeline</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">$176,500</p>
                <span className="text-[11px] text-purple-400 font-medium">4 enterprise deals</span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Team Members</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">17 Members</p>
                <span className="text-[11px] text-slate-400 font-medium">3 teams active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Architecture Section */}
      <section id="architecture" className="py-20 border-t border-slate-900 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">System Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              1 Shared Backend. 1 PostgreSQL DB. 3 Tailored Apps.
            </h2>
            <p className="text-slate-400 mt-3">
              Engineered with strict zero-trust Role-Based Access Control (RBAC) at both frontend route level and backend API middleware.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">1. Admin Application</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Full executive suite. Manage projects, tasks, CRM pipeline, documents, teams, invoices, and audit logs.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Full CRUD on all modules</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Team & Member Invites</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Financials & Subscriptions</li>
              </ul>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">2. Employee Application</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Laser-focused on assigned deliverables. No clutter, zero exposure to organization billing or administrative settings.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Assigned Projects & Tasks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Personal & Shared Docs</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Assigned CRM Clients</li>
              </ul>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">3. Intern Application</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Restricted sandbox for learning. View assigned learning tasks, submit progress, and access onboarding repositories.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Assigned Learning Tasks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Learning Docs & Guides</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Safe Restricted Access</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Modules Grid */}
      <section id="features" className="py-20 bg-slate-900/30 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Core Modules</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              Everything Your Company Needs in One Platform
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <FolderKanban className="w-6 h-6 text-blue-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Project Management</h4>
              <p className="text-xs text-slate-400">Multi-team roadmaps, milestone tracking, budget indicators, and progress status.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <CheckSquare className="w-6 h-6 text-emerald-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Kanban & Task Engine</h4>
              <p className="text-xs text-slate-400">Interactive Kanban columns (Todo, In Progress, Review, Completed) with priority tags.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <FileText className="w-6 h-6 text-amber-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Document Repository</h4>
              <p className="text-xs text-slate-400">Granular visibility levels: Public, Team, Private, and Learning documents with download counts.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <DollarSign className="w-6 h-6 text-purple-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">CRM & Sales Pipeline</h4>
              <p className="text-xs text-slate-400">Deal valuation, lead status, customer notes, and account ownership tracking.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <Users className="w-6 h-6 text-cyan-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Teams & Organization</h4>
              <p className="text-xs text-slate-400">Department directories, team leads, member management, and instant invitations.</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <BarChart3 className="w-6 h-6 text-rose-400 mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Real-time Analytics</h4>
              <p className="text-xs text-slate-400">Velocity charts, task distribution, CRM conversion pipelines, and audit logs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Comparison Table */}
      <section id="roles" className="py-20 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Security & RBAC</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              Strict Role-Based Permission Matrix
            </h2>
            <p className="text-slate-400 mt-3 text-sm">
              Enforced at schema, API, and client UI layer.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-4">Capability / Module</th>
                  <th className="p-4 text-purple-400">Admin (Full Access)</th>
                  <th className="p-4 text-blue-400">Employee (Assigned Only)</th>
                  <th className="p-4 text-emerald-400">Intern (Restricted)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="p-4 font-medium text-white">Workspace & Settings</td>
                  <td className="p-4 text-purple-300 font-semibold">Full Configuration</td>
                  <td className="p-4 text-slate-500">No Access</td>
                  <td className="p-4 text-slate-500">No Access</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Projects Management</td>
                  <td className="p-4 text-purple-300">Create, Edit, Delete, View All</td>
                  <td className="p-4 text-blue-300">View Assigned & Update Progress</td>
                  <td className="p-4 text-slate-500">No Access</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Task Management</td>
                  <td className="p-4 text-purple-300">Full CRUD + Assign</td>
                  <td className="p-4 text-blue-300">Create & Update Status</td>
                  <td className="p-4 text-emerald-300">Update Status Only</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Documents Repository</td>
                  <td className="p-4 text-purple-300">Manage All & Org Policies</td>
                  <td className="p-4 text-blue-300">Personal Docs + Shared View</td>
                  <td className="p-4 text-emerald-300">Learning Docs Only (View/Download)</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">CRM & Customers</td>
                  <td className="p-4 text-purple-300">Full Pipeline & Records</td>
                  <td className="p-4 text-blue-300">Assigned Leads & Notes</td>
                  <td className="p-4 text-slate-500">No Access</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Financial Billing</td>
                  <td className="p-4 text-purple-300">Manage Invoices & Plans</td>
                  <td className="p-4 text-slate-500">No Access</td>
                  <td className="p-4 text-slate-500">No Access</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Plans & Billing</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              Scalable for Startups to Global Enterprises
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
              <h3 className="text-lg font-bold text-white">Starter</h3>
              <p className="text-xs text-slate-400 mt-1">For small pilot teams</p>
              <div className="my-6">
                <span className="text-3xl font-bold text-white">$0</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Up to 5 team members</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Basic Kanban & Projects</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Shared document vault</li>
              </ul>
              <button
                onClick={() => handleOpenAuth('register')}
                className="w-full py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Start Free
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-b from-blue-950/60 to-slate-900 border-2 border-blue-500/80 flex flex-col relative shadow-xl shadow-blue-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-0.5 rounded-full">
                Most Popular
              </div>
              <h3 className="text-lg font-bold text-white">Professional</h3>
              <p className="text-xs text-slate-400 mt-1">For scaling modern companies</p>
              <div className="my-6">
                <span className="text-3xl font-bold text-white">$49</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Up to 25 team members</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Full CRM Pipeline & Leads</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Intern learning portals</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Advanced Analytics</li>
              </ul>
              <button
                onClick={() => handleOpenAuth('register')}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors"
              >
                Launch Pro Workspace
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
              <h3 className="text-lg font-bold text-white">Enterprise</h3>
              <p className="text-xs text-slate-400 mt-1">For regulated organizations</p>
              <div className="my-6">
                <span className="text-3xl font-bold text-white">$199</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Unlimited seats & teams</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Custom RBAC policies & logs</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Dedicated Neon DB instance</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> 24/7 Priority SLA</li>
              </ul>
              <button
                onClick={() => handleOpenAuth('register')}
                className="w-full py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-300">Workspace OS</span>
            <span>&copy; {new Date().getFullYear()} Acme Global Technologies. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => handleOpenAuth('login')} className="hover:text-slate-300">Sign In</button>
            <button onClick={() => handleOpenAuth('register')} className="hover:text-slate-300">Register Organization</button>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
};
