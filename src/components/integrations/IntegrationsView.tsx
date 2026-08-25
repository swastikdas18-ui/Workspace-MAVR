import React, { useState } from 'react';
import { 
  Calendar, Mail, Video, Plus, CheckCircle2, Clock, Users,
  ExternalLink, Send, ArrowUpRight, Sparkles, RefreshCw
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CalendarEventItemType, EmailLogItemType } from '../../types';
import { PageHeader } from '../common/PageHeader';

export const IntegrationsView: React.FC = () => {
  const { currentRole, crmRecords } = useWorkspace();

  const [events, setEvents] = useState<CalendarEventItemType[]>([
    {
      id: 'cal-1',
      workspaceId: 'ws-default',
      crmRecordId: crmRecords[0]?.id || 'crm-1',
      title: 'Discovery & Proposal Alignment Call',
      description: 'Discussing scope, timelines, and 12-month Business roadmap.',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      startTime: '2026-08-25T15:00:00Z',
      endTime: '2026-08-25T15:45:00Z',
      attendees: [
        { email: 'founder@msme.com', name: 'Alice Founder' },
        { email: 'robert@apexglobal.com', name: 'Robert Vance' }
      ],
      status: 'confirmed',
      createdAt: '2026-08-24T18:00:00Z'
    }
  ]);

  const [emails, setEmails] = useState<EmailLogItemType[]>([
    {
      id: 'eml-1',
      workspaceId: 'ws-default',
      crmRecordId: crmRecords[0]?.id || 'crm-1',
      from: 'robert@apexglobal.com',
      to: 'founder@msme.com',
      subject: 'Re: Workspace OS Implementation Retainer',
      snippet: 'We have approved the ₹1,50,000 monthly retainer contract. Let us schedule kickoff.',
      direction: 'inbound',
      timestamp: '2026-08-25T08:30:00Z'
    }
  ]);

  const [isGoogleConnected, setIsGoogleConnected] = useState(true);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const handleScheduleMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;

    const newEvt: CalendarEventItemType = {
      id: `cal-${Date.now()}`,
      workspaceId: 'ws-default',
      title: newMeetingTitle.trim(),
      description: 'Scheduled via Workspace OS Google Calendar sync.',
      meetingUrl: `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`,
      startTime: newMeetingDate || new Date().toISOString(),
      endTime: new Date(Date.now() + 45 * 60000).toISOString(),
      attendees: [{ email: 'client@company.com', name: 'Lead Prospect' }],
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    setEvents((prev) => [newEvt, ...prev]);
    setNewMeetingTitle('');
    setIsScheduling(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Email & Google Calendar Synchronization"
        description="Connect Gmail and Google Calendar to log inbound CRM threads and schedule Google Meet calls natively."
      />

      {/* CONNECTED ACCOUNTS STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Workspace */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-white/[0.08] flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              G
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Google Workspace</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Syncing Gmail threads & Google Meet events</p>
            </div>
          </div>
          <button
            onClick={() => setIsGoogleConnected(!isGoogleConnected)}
            className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 border border-white/[0.06] cursor-pointer"
          >
            Manage
          </button>
        </div>

        {/* Meeting Scheduler CTA */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 flex items-center justify-between shadow-xl">
          <div>
            <h4 className="text-sm font-bold text-white">Discovery Call Scheduler</h4>
            <p className="text-xs text-slate-400 mt-0.5">Generate Google Meet link with 1 click</p>
          </div>
          <button
            onClick={() => setIsScheduling(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* SCHEDULING FORM MODAL */}
      {isScheduling && (
        <form onSubmit={handleScheduleMeeting} className="p-5 rounded-2xl bg-[#0F172A] border border-blue-500/40 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Schedule New Google Meet</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Meeting Title (e.g. Discovery Scope Call)"
              value={newMeetingTitle}
              onChange={(e) => setNewMeetingTitle(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="datetime-local"
              value={newMeetingDate}
              onChange={(e) => setNewMeetingDate(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsScheduling(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              Confirm & Generate Meet
            </button>
          </div>
        </form>
      )}

      {/* 2-COLUMN SYNCED STREAMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheduled Calendar Events */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Upcoming Google Meet Calls</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{events.length} calls</span>
          </div>

          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">{ev.title}</span>
                  <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    {new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{ev.description}</p>
                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                  <a
                    href={ev.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline font-semibold"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Google Meet</span>
                  </a>
                  <span className="text-[10px] text-slate-500">{new Date(ev.startTime).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Synced Email Threads */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-400" />
              <span>Inbound CRM Email Threads</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{emails.length} emails</span>
          </div>

          <div className="space-y-3">
            {emails.map((eml) => (
              <div key={eml.id} className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{eml.from}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(eml.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs font-medium text-purple-300">{eml.subject}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{eml.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
