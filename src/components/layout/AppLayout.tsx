import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../common/ToastContainer';
import { CommandPalette } from '../common/CommandPalette';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useWorkspace } from '../../context/WorkspaceContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Copy, CheckCircle2, UserPlus } from 'lucide-react';
import { getFrontendUrl, api } from '../../lib/api';
import { UserRole, WorkspaceInvite, TaskPriority, Department } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenCreateProject?: () => void;
  onOpenCreateTask?: () => void;
  onOpenCreateLead?: () => void;
  onOpenUploadDoc?: () => void;
  onOpenInviteMember?: () => void;
  onOpenCreateTeam?: () => void;
  onOpenCreateWiki?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children,
  onOpenCreateProject,
  onOpenCreateTask,
  onOpenCreateLead,
  onOpenUploadDoc,
  onOpenInviteMember,
  onOpenCreateTeam,
  onOpenCreateWiki,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { 
    activeTab, currentUser, users, teams, projects, 
    createTeam, inviteMember, createTask, createProject, addToast 
  } = useWorkspace();

  // Global Modals State
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.getDepartments();
        if (res?.departments) {
          setDepartments(res.departments);
        }
      } catch (err) {
        console.warn('Failed to fetch departments in AppLayout:', err);
      }
    };
    fetchDepts();
  }, []);

  // Create Team Form State
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#7C3AED');
  const [teamLeadId, setTeamLeadId] = useState<string>(currentUser?.id || '');

  // Invite Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('employee');
  const [inviteTeamId, setInviteTeamId] = useState<string>(teams[0]?.id || '');
  const [generatedInvite, setGeneratedInvite] = useState<WorkspaceInvite | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Create Project Form State
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectDueDate, setProjectDueDate] = useState('');
  const [projectBudget, setProjectBudget] = useState('');
  const [selectedProjectDepartmentId, setSelectedProjectDepartmentId] = useState<string>('');
  const [selectedProjectMembers, setSelectedProjectMembers] = useState<string[]>([]);
  const [projectTagsInput, setProjectTagsInput] = useState('');

  // Create Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskEstimateHours, setTaskEstimateHours] = useState('');
  const [taskProjectId, setTaskProjectId] = useState(projects[0]?.id || '');
  const [taskAssigneeId, setTaskAssigneeId] = useState(currentUser?.id || '');
  const [taskTagsInput, setTaskTagsInput] = useState('');

  // Action Handlers
  const handleTriggerCreateTeam = () => {
    if (onOpenCreateTeam) {
      onOpenCreateTeam();
    } else {
      setIsCreateTeamModalOpen(true);
    }
  };

  const handleTriggerInviteMember = () => {
    if (onOpenInviteMember) {
      onOpenInviteMember();
    } else {
      setGeneratedInvite(null);
      setIsInviteModalOpen(true);
    }
  };

  const handleTriggerCreateProject = () => {
    if (onOpenCreateProject) {
      onOpenCreateProject();
    } else {
      setIsCreateProjectModalOpen(true);
    }
  };

  const handleTriggerCreateTask = () => {
    if (onOpenCreateTask) {
      onOpenCreateTask();
    } else {
      setIsCreateTaskModalOpen(true);
    }
  };

  // Form Submissions
  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createTeam({
      name: teamName,
      description: teamDescription,
      lead_id: teamLeadId || currentUser?.id || '',
      color: teamColor
    });
    if (success) {
      setIsCreateTeamModalOpen(false);
      setTeamName('');
      setTeamDescription('');
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    const invite = await inviteMember(inviteEmail, inviteRole, inviteTeamId);
    setIsInviting(false);
    if (invite) {
      setGeneratedInvite(invite);
    }
  };

  const handleCopyLink = (token: string) => {
    const inviteUrl = getFrontendUrl(`/invite/${token}`);
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(true);
    addToast({
      type: 'success',
      title: 'Invite Link Copied',
      message: 'Workspace invitation URL copied to clipboard.',
    });
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createProject({
      title: projectTitle,
      description: projectDescription,
      status: 'planning',
      start_date: new Date().toISOString().split('T')[0],
      due_date: projectDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      budget: projectBudget ? (projectBudget.startsWith('$') ? projectBudget : `$${projectBudget}`) : '$15,000',
      member_ids: selectedProjectMembers,
      department_id: selectedProjectDepartmentId || undefined,
      tags: projectTagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    });
    if (success) {
      setIsCreateProjectModalOpen(false);
      setProjectTitle('');
      setProjectDescription('');
      setProjectDueDate('');
      setProjectBudget('');
      setSelectedProjectDepartmentId('');
      setSelectedProjectMembers([]);
      setProjectTagsInput('');
    }
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createTask({
      title: taskTitle,
      description: taskDescription,
      priority: taskPriority,
      status: 'todo',
      due_date: taskDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      project_id: taskProjectId || projects[0]?.id || '',
      assigned_to: taskAssigneeId || currentUser?.id || '',
      estimated_hours: taskEstimateHours ? parseFloat(taskEstimateHours) : 4,
      actual_hours: 0,
      tags: taskTagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    });
    if (success) {
      setIsCreateTaskModalOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueDate('');
      setTaskEstimateHours('');
      setTaskTagsInput('');
    }
  };

  // Listen for Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col font-sans text-stone-900 selection:bg-amber-200 selection:text-stone-900">
      <div className="flex flex-1 overflow-hidden">
        {/* Responsive Enterprise Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-gradient-to-b from-[#F7F4EE]/70 to-[#FBF9F5]">
          <Header
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenCreateTeam={handleTriggerCreateTeam}
            onOpenInviteMember={handleTriggerInviteMember}
            onOpenCreateProject={handleTriggerCreateProject}
            onOpenCreateTask={handleTriggerCreateTask}
            onOpenCreateWiki={onOpenCreateWiki}
            onOpenUploadDoc={onOpenUploadDoc}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="w-full pb-16"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Global Raycast-Style Command Palette with Error Boundary */}
      <ErrorBoundary isModal fallbackTitle="Command Palette Error" onReset={() => setIsCommandPaletteOpen(false)}>
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onOpenCreateProject={handleTriggerCreateProject}
          onOpenCreateTask={handleTriggerCreateTask}
          onOpenCreateLead={onOpenCreateLead}
          onOpenUploadDoc={onOpenUploadDoc}
          onOpenInviteMember={handleTriggerInviteMember}
        />
      </ErrorBoundary>

      {/* ========================================================================= */}
      {/* GLOBAL CREATE TEAM MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCreateTeamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateTeamModalOpen(false)}
              className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white border border-[#E8E3DA] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
                <h3 className="text-base font-bold text-stone-900">Create Department Team</h3>
                <button onClick={() => setIsCreateTeamModalOpen(false)} className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Department Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Infrastructure & Platform Engineering"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Mission & Domain</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Core scope and team deliverables..."
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Color Marker</label>
                    <input
                      type="color"
                      value={teamColor}
                      onChange={(e) => setTeamColor(e.target.value)}
                      className="w-full h-10 bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-1 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Team Lead</label>
                    <select
                      value={teamLeadId}
                      onChange={(e) => setTeamLeadId(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/20 transition-all"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E3DA]">
                  <button
                    type="button"
                    onClick={() => setIsCreateTeamModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-semibold shadow-md shadow-stone-900/10 cursor-pointer"
                  >
                    Create Department
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* GLOBAL INVITE MEMBER MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsInviteModalOpen(false);
                setGeneratedInvite(null);
              }}
              className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white border border-[#E8E3DA] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
                <h3 className="text-base font-bold text-stone-900">Generate Member Invitation</h3>
                <button 
                  onClick={() => {
                    setIsInviteModalOpen(false);
                    setGeneratedInvite(null);
                  }} 
                  className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {generatedInvite ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <h4 className="font-bold text-stone-900 text-sm">Invitation Provisioned!</h4>
                    <p className="text-stone-600 text-xs mt-1">
                      Token created for <span className="text-emerald-700 font-semibold">{generatedInvite.email}</span> as <span className="uppercase font-semibold">{generatedInvite.role}</span>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-stone-500 text-[10px] uppercase font-semibold mb-1">Invite URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getFrontendUrl(`/invite/${generatedInvite.token}`)}
                        className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 font-mono text-[11px]"
                      />
                      <button
                        onClick={() => handleCopyLink(generatedInvite.token)}
                        className="px-3.5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setIsInviteModalOpen(false);
                        setGeneratedInvite(null);
                        setInviteEmail('');
                      }}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Full Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Colleague Email</label>
                    <input
                      type="email"
                      required
                      placeholder="engineer@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Assigned Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-600 transition-colors"
                    >
                      <option value="admin">Administrator (Full Access & Organization Management)</option>
                      <option value="employee">Employee (Assigned Work, Projects & Teams)</option>
                      <option value="intern">Intern (Learning Sandbox, Mentored Tasks)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Assign to Department</label>
                    <select
                      value={inviteTeamId}
                      onChange={(e) => setInviteTeamId(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-600 transition-colors"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E3DA]">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isInviting || !inviteEmail}
                      className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-semibold shadow-md shadow-stone-900/10 disabled:opacity-50 cursor-pointer"
                    >
                      {isInviting ? 'Generating...' : 'Generate Invite Link'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* GLOBAL CREATE PROJECT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCreateProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateProjectModalOpen(false)}
              className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white border border-[#E8E3DA] rounded-2xl shadow-2xl p-6 z-10 space-y-4 max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
                <h3 className="text-base font-bold text-stone-900">Create Strategic Initiative</h3>
                <button
                  onClick={() => setIsCreateProjectModalOpen(false)}
                  className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProjectSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Initiative Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Next-Gen Enterprise AI Orchestrator"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Description & Key Milestones</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Define core deliverables, technical scope, and expected outcome..."
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Target Due Date</label>
                    <input
                      type="date"
                      required
                      value={projectDueDate}
                      onChange={(e) => setProjectDueDate(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Allocated Budget ($)</label>
                    <input
                      type="text"
                      placeholder="$25,000"
                      value={projectBudget}
                      onChange={(e) => setProjectBudget(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Assign to Department</label>
                  <select
                    value={selectedProjectDepartmentId}
                    onChange={(e) => setSelectedProjectDepartmentId(e.target.value)}
                    className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-600 transition-colors"
                  >
                    <option value="">Select Department (Optional)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="ai, core, enterprise"
                    value={projectTagsInput}
                    onChange={(e) => setProjectTagsInput(e.target.value)}
                    className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E8E3DA]">
                  <button
                    type="button"
                    onClick={() => setIsCreateProjectModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-semibold shadow-md shadow-stone-900/10 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    Create Initiative
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* GLOBAL CREATE TASK MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCreateTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateTaskModalOpen(false)}
              className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white border border-[#E8E3DA] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
                <h3 className="text-base font-bold text-stone-900">Create Work Item</h3>
                <button onClick={() => setIsCreateTaskModalOpen(false)} className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement real-time Redis caching layer"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Description & Acceptance Criteria</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe specific technical milestones, edge cases, and documentation needs..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-600 transition-colors"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Assign to Project</label>
                    <select
                      value={taskProjectId}
                      onChange={(e) => setTaskProjectId(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-600 transition-colors"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Assignee</label>
                    <select
                      value={taskAssigneeId}
                      onChange={(e) => setTaskAssigneeId(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-600 transition-colors"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Estimated Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="4.0"
                      value={taskEstimateHours}
                      onChange={(e) => setTaskEstimateHours(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="frontend, auth"
                      value={taskTagsInput}
                      onChange={(e) => setTaskTagsInput(e.target.value)}
                      className="w-full bg-[#FBF9F5] border border-[#E8E3DA] rounded-xl p-2.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E8E3DA]">
                  <button
                    type="button"
                    onClick={() => setIsCreateTaskModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-semibold shadow-md shadow-stone-900/10 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enterprise Toast System */}
      <ToastContainer />
    </div>
  );
};
