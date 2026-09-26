import React from 'react';
import { motion } from 'motion/react';
import { Bell, Save, Loader2, Users, Target, Building2, DollarSign } from 'lucide-react';

export interface NotificationPrefsState {
  [key: string]: boolean;
  peopleEmployeeInvites: boolean;
  peopleEmployeeJoined: boolean;
  peopleLeaveRequests: boolean;
  projectsInitiativeUpdates: boolean;
  projectsReviewRequests: boolean;
  projectsAssignments: boolean;
  tasksAssignments: boolean;
  tasksCompletions: boolean;
  tasksOverdueAlerts: boolean;
  crmLeadAssignment: boolean;
  crmDealUpdates: boolean;
  mentions: boolean;
}

interface NotificationsTabProps {
  notificationPrefs: NotificationPrefsState;
  setNotificationPrefs: React.Dispatch<React.SetStateAction<NotificationPrefsState>>;
  isPrefsLoading: boolean;
  isPrefsSaving: boolean;
  onSaveNotificationPrefs: () => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notificationPrefs,
  setNotificationPrefs,
  isPrefsLoading,
  isPrefsSaving,
  onSaveNotificationPrefs,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-400" />
              <span>Notification Preferences</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Control which in-app events generate notifications for your account.
            </p>
          </div>
          <button
            type="button"
            disabled={isPrefsSaving}
            onClick={onSaveNotificationPrefs}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {isPrefsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {isPrefsLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          <span>Loading preferences...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* People OS */}
          <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Users className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">People Notifications</h4>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Employee Invites</p>
                  <p className="text-[11px] text-slate-500">Alerts when team invitations are sent</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.peopleEmployeeInvites}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, peopleEmployeeInvites: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Employee Joined</p>
                  <p className="text-[11px] text-slate-500">Alerts when a new colleague joins the workspace</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.peopleEmployeeJoined}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, peopleEmployeeJoined: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Leave Requests</p>
                  <p className="text-[11px] text-slate-500">Leave submissions, approvals, and rejections</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.peopleLeaveRequests}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, peopleLeaveRequests: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
            </div>
          </div>

          {/* Projects OS */}
          <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Target className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Projects Notifications</h4>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Initiative Updates</p>
                  <p className="text-[11px] text-slate-500">Initiative creations, launches, and lifecycle state changes</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.projectsInitiativeUpdates}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, projectsInitiativeUpdates: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Review Requests</p>
                  <p className="text-[11px] text-slate-500">Initiative review submissions, approvals, and rejections</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.projectsReviewRequests}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, projectsReviewRequests: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Assignments</p>
                  <p className="text-[11px] text-slate-500">Alerts when assigned as an initiative lead or contributor</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.projectsAssignments}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, projectsAssignments: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
            </div>
          </div>

          {/* Tasks OS */}
          <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Building2 className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Task Notifications</h4>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Assignments</p>
                  <p className="text-[11px] text-slate-500">When tasks are delegated to you</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.tasksAssignments}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, tasksAssignments: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Completions</p>
                  <p className="text-[11px] text-slate-500">Alerts when assigned tasks are completed</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.tasksCompletions}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, tasksCompletions: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Overdue Alerts</p>
                  <p className="text-[11px] text-slate-500">Automated worker alerts for overdue task milestones</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.tasksOverdueAlerts}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, tasksOverdueAlerts: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
            </div>
          </div>

          {/* CRM & Mentions */}
          <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">CRM & Mentions</h4>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Lead Assignment</p>
                  <p className="text-[11px] text-slate-500">Alerts when assigned to a new CRM deal or lead</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.crmLeadAssignment}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, crmLeadAssignment: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">Deal Updates</p>
                  <p className="text-[11px] text-slate-500">Pipeline progression and stage transition alerts</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.crmDealUpdates}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, crmDealUpdates: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-slate-200">@Mentions</p>
                  <p className="text-[11px] text-slate-500">High priority alerts when someone mentions you</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.mentions}
                  onChange={(e) => setNotificationPrefs(p => ({ ...p, mentions: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-white/20"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
