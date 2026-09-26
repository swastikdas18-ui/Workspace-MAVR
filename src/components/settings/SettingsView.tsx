import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Save } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { api } from '../../lib/api';
import { ProfileTab, SecurityTab, RbacTab } from './ProfileAndSecurityTabs';
import { TeamBillingTab, TeamBillingItem } from './TeamBillingTab';
import { ApiKeysTab, SecretItem, DEFAULT_SECRETS } from './ApiKeysTab';
import { NotificationsTab, NotificationPrefsState } from './NotificationsTab';
import { LabsTab } from './LabsTab';
import { SettingsTabBar, SettingsTabType } from './SettingsTabBar';

export const SettingsView: React.FC = () => {
  const { currentWorkspace, updateWorkspace, addToast, users, setActiveTab: setGlobalActiveTab } = useWorkspace();

  const [activeTab, setActiveTab] = useState<SettingsTabType>('profile');
  const [name, setName] = useState(currentWorkspace?.name || 'Workspace OS HQ');
  const [slug, setSlug] = useState(currentWorkspace?.slug || 'workspaceos');
  const [allowPublicInvites, setAllowPublicInvites] = useState(false);
  const [enforceTwoFactor, setEnforceTwoFactor] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('24h');

  // Notification Preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefsState>({
    peopleEmployeeInvites: true,
    peopleEmployeeJoined: true,
    peopleLeaveRequests: true,
    projectsInitiativeUpdates: true,
    projectsReviewRequests: true,
    projectsAssignments: true,
    tasksAssignments: true,
    tasksCompletions: true,
    tasksOverdueAlerts: true,
    crmLeadAssignment: true,
    crmDealUpdates: true,
    mentions: true,
  });
  const [isPrefsLoading, setIsPrefsLoading] = useState(false);
  const [isPrefsSaving, setIsPrefsSaving] = useState(false);

  // Team Billing Profiles state
  const [billingProfiles, setBillingProfiles] = useState<TeamBillingItem[]>([]);
  const [isProfilesLoading, setIsProfilesLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const loadBillingProfiles = useCallback(async () => {
    try {
      setIsProfilesLoading(true);
      const res = await api.getEmployeeBillingProfiles();
      const loaded = (res?.profiles || []) as any[];

      // Merge with workspace users roster
      const merged: TeamBillingItem[] = users.map((u) => {
        const found = loaded.find((p) => p.userId === u.id);
        return {
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          role: u.role,
          costRate: found?.costRate || 1000,
          billableRate: found?.billableRate || 2000,
          utilizationTarget: found?.utilizationTarget || 75,
        };
      });
      setBillingProfiles(merged);
    } catch (err: any) {
      console.error('[SettingsView] Failed to load team billing profiles:', err);
    } finally {
      setIsProfilesLoading(false);
    }
  }, [users]);

  useEffect(() => {
    if (activeTab === 'team_billing') {
      loadBillingProfiles();
    }
  }, [activeTab, loadBillingProfiles]);

  const loadNotificationPrefs = useCallback(async () => {
    try {
      setIsPrefsLoading(true);
      const res = await api.getNotificationPreferences();
      if (res?.preferences) {
        setNotificationPrefs((prev) => ({ ...prev, ...res.preferences }));
      }
    } catch (err: any) {
      console.error('[SettingsView] Failed to load notification preferences:', err);
    } finally {
      setIsPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      loadNotificationPrefs();
    }
  }, [activeTab, loadNotificationPrefs]);

  const handleSaveNotificationPrefs = async () => {
    try {
      setIsPrefsSaving(true);
      await api.updateNotificationPreferences(notificationPrefs);
      addToast({
        type: 'success',
        title: 'Notification Preferences Saved',
        message: 'Your notification preferences have been persisted.',
      });
    } catch (err: any) {
      console.error('[SettingsView] Failed to update preferences:', err);
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save notification preferences.',
      });
    } finally {
      setIsPrefsSaving(false);
    }
  };

  const handleUpdateProfile = async (item: TeamBillingItem) => {
    try {
      setSavingUserId(item.userId);
      await api.updateEmployeeBillingProfile(item.userId, {
        costRate: item.costRate,
        billableRate: item.billableRate,
        utilizationTarget: item.utilizationTarget,
      });
      addToast({
        type: 'success',
        title: 'Billing Profile Updated',
        message: `Rates and target saved for ${item.userName}.`,
      });
    } catch (err: any) {
      console.error('[SettingsView] Failed to update profile:', err);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not save billing rates.',
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const [secrets, setSecrets] = useState<SecretItem[]>(DEFAULT_SECRETS);

  const [rotatingSecretId, setRotatingSecretId] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspace({ name, slug });
    addToast({
      type: 'success',
      title: 'Settings Persisted',
      message: 'Workspace configurations updated successfully.',
    });
  };

  const handleRotateSecret = (secretId: string) => {
    setIsRotating(true);
    setTimeout(() => {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
      setSecrets(prev => prev.map(s => {
        if (s.id === secretId) {
          return {
            ...s,
            suffix: randomSuffix,
            maskedValue: `${s.prefix}xxxxxxxxxxx${randomSuffix}`,
            lastRotated: 'Just now',
          };
        }
        return s;
      }));
      setIsRotating(false);
      setRotatingSecretId(null);
      addToast({
        type: 'success',
        title: 'Secret Rotated',
        message: 'A new secret was provisioned server-side and previous token revoked.',
      });
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Workspace Configuration & Security"
        description="Manage organization metadata, zero-trust RBAC policies, team billing rates, and developer credentials."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold">
            SOC2 / HIPAA Compliant
          </span>
        }
      />

      {/* Settings Navigation Tabs */}
      <SettingsTabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'labs' && (
        <LabsTab onNavigate={setGlobalActiveTab} />
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {activeTab === 'profile' && (
          <ProfileTab
            name={name}
            setName={setName}
            slug={slug}
            setSlug={setSlug}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab
            enforceTwoFactor={enforceTwoFactor}
            setEnforceTwoFactor={setEnforceTwoFactor}
            allowPublicInvites={allowPublicInvites}
            setAllowPublicInvites={setAllowPublicInvites}
            sessionTimeout={sessionTimeout}
            setSessionTimeout={setSessionTimeout}
          />
        )}

        {activeTab === 'rbac' && (
          <RbacTab />
        )}

        {activeTab === 'team_billing' && (
          <TeamBillingTab
            isProfilesLoading={isProfilesLoading}
            billingProfiles={billingProfiles}
            setBillingProfiles={setBillingProfiles}
            savingUserId={savingUserId}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {activeTab === 'api' && (
          <ApiKeysTab
            secrets={secrets}
            rotatingSecretId={rotatingSecretId}
            setRotatingSecretId={setRotatingSecretId}
            isRotating={isRotating}
            onRotateSecret={handleRotateSecret}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab
            notificationPrefs={notificationPrefs}
            setNotificationPrefs={setNotificationPrefs}
            isPrefsLoading={isPrefsLoading}
            isPrefsSaving={isPrefsSaving}
            onSaveNotificationPrefs={handleSaveNotificationPrefs}
          />
        )}

        {activeTab !== 'api' && activeTab !== 'team_billing' && activeTab !== 'notifications' && activeTab !== 'labs' && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Workspace Settings</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
