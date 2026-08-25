export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private static sentEmails: Array<EmailPayload & { sentAt: Date; id: string }> = [];

  /**
   * Universal Dispatcher
   */
  public static async sendEmail(payload: EmailPayload): Promise<{ success: boolean; id: string }> {
    const id = `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const emailRecord = {
      ...payload,
      from: payload.from || process.env.EMAIL_FROM || 'Workspace OS <notifications@workspaceos.dev>',
      sentAt: new Date(),
      id,
    };

    // If RESEND_API_KEY exists in production, send via HTTP API
    if (process.env.RESEND_API_KEY && process.env.NODE_ENV === 'production') {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailRecord),
        });
      } catch (err) {
        console.warn('[EmailService Warning]:', err);
      }
    }

    this.sentEmails.push(emailRecord);
    return { success: true, id };
  }

  /**
   * 1. Send Workspace Invite Email
   */
  public static async sendWorkspaceInvite(to: string, workspaceName: string, inviteUrl: string) {
    return this.sendEmail({
      to,
      subject: `You've been invited to join ${workspaceName} on Workspace OS`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 16px;">
          <h2 style="color: #60A5FA; margin-bottom: 8px;">Workspace Invitation</h2>
          <p style="font-size: 14px; color: #94A3B8;">You have been invited to collaborate in <strong>${workspaceName}</strong> on Workspace OS.</p>
          <div style="margin: 24px 0;">
            <a href="${inviteUrl}" style="background: linear-gradient(to right, #2563EB, #4F46E5); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="font-size: 12px; color: #64748B;">This invitation token expires in 7 days.</p>
        </div>
      `,
    });
  }

  /**
   * 2. Send Client Guest Magic Link
   */
  public static async sendGuestMagicLink(to: string, clientName: string, portalUrl: string) {
    return this.sendEmail({
      to,
      subject: `Your Secure Deliverables Portal Link — Workspace OS`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 16px;">
          <h2 style="color: #A855F7; margin-bottom: 8px;">Client Portal Access</h2>
          <p style="font-size: 14px; color: #94A3B8;">Hello ${clientName}, access your project deliverables, assets, and milestone sign-offs below:</p>
          <div style="margin: 24px 0;">
            <a href="${portalUrl}" style="background: linear-gradient(to right, #7C3AED, #9333EA); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Open Client Portal</a>
          </div>
        </div>
      `,
    });
  }

  /**
   * 3. Send Trial Expiry Reminder
   */
  public static async sendTrialReminder(to: string, daysRemaining: number, upgradeUrl: string) {
    return this.sendEmail({
      to,
      subject: `Action Required: Your Workspace OS Business Trial expires in ${daysRemaining} day(s)`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 16px;">
          <h2 style="color: #F59E0B; margin-bottom: 8px;">Trial Expiring Soon</h2>
          <p style="font-size: 14px; color: #94A3B8;">Your 14-day Business Plan trial has <strong>${daysRemaining} day(s)</strong> remaining. Activate your plan to preserve 50 staff seats, 5 GB storage, and automations.</p>
          <div style="margin: 24px 0;">
            <a href="${upgradeUrl}" style="background: #2563EB; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Activate Business Plan (₹1,499/mo)</a>
          </div>
        </div>
      `,
    });
  }

  /**
   * 4. Send Subscription Receipt
   */
  public static async sendSubscriptionReceipt(to: string, amount: string, invoiceNumber: string) {
    return this.sendEmail({
      to,
      subject: `Payment Receipt — ${invoiceNumber}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 16px;">
          <h2 style="color: #10B981; margin-bottom: 8px;">Payment Successful</h2>
          <p style="font-size: 14px; color: #94A3B8;">We have received your payment of <strong>${amount}</strong> for Invoice <strong>${invoiceNumber}</strong>.</p>
        </div>
      `,
    });
  }

  /**
   * 5. Send Deliverable Approval Request
   */
  public static async sendApprovalRequest(to: string, deliverableTitle: string, reviewUrl: string) {
    return this.sendEmail({
      to,
      subject: `Action Required: Please Review & Sign Deliverable "${deliverableTitle}"`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 16px;">
          <h2 style="color: #3B82F6; margin-bottom: 8px;">Deliverable Ready For Sign-Off</h2>
          <p style="font-size: 14px; color: #94A3B8;">A new deliverable <strong>${deliverableTitle}</strong> has been submitted for your review.</p>
          <div style="margin: 24px 0;">
            <a href="${reviewUrl}" style="background: #2563EB; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Review & Sign</a>
          </div>
        </div>
      `,
    });
  }

  /**
   * 6. Send Password Reset
   */
  public static async sendPasswordReset(to: string, resetUrl: string) {
    return this.sendEmail({
      to,
      subject: `Reset Your Workspace OS Password`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 16px;">
          <h2 style="color: #EF4444; margin-bottom: 8px;">Password Reset Request</h2>
          <p style="font-size: 14px; color: #94A3B8;">Click the button below to securely reset your password:</p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="background: #DC2626; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
          </div>
        </div>
      `,
    });
  }

  /**
   * 7. Send Onboarding Reminder (Day 1 / Day 3 / Day 7)
   */
  public static async sendOnboardingReminder(to: string, name: string, day: number, workspaceName: string, workspaceUrl: string) {
    const messages: Record<number, { subject: string; body: string }> = {
      1: {
        subject: `Welcome to ${workspaceName} — Your workspace is ready 🚀`,
        body: `You joined <strong>${workspaceName}</strong> on Workspace OS. Take 5 minutes to explore your workspace, create your first project, and invite a colleague.`,
      },
      3: {
        subject: `How is ${workspaceName} going? — 3 days in`,
        body: `You've been on Workspace OS for 3 days. Make sure to check your task board, add leads to your CRM, and set up your team calendar.`,
      },
      7: {
        subject: `Your first week on Workspace OS — Weekly digest`,
        body: `It's been 7 days since you joined <strong>${workspaceName}</strong>. Here's a summary of your workspace activity and what's coming up this week.`,
      },
    };

    const msg = messages[day] || { subject: `${workspaceName} Reminder`, body: `Log in to continue your work.` };

    return this.sendEmail({
      to,
      subject: msg.subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 16px;">
          <h2 style="color: #60A5FA; margin-bottom: 8px;">Hey ${name} 👋</h2>
          <p style="font-size: 14px; color: #94A3B8;">${msg.body}</p>
          <div style="margin: 24px 0;">
            <a href="${workspaceUrl}" style="background: linear-gradient(to right, #2563EB, #4F46E5); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Open ${workspaceName}</a>
          </div>
          <p style="font-size: 11px; color: #475569;">Workspace OS — The Operating System for MSMEs</p>
        </div>
      `,
    });
  }

  /**
   * 8. Send Daily / Weekly Digest Email
   */
  public static async sendDailyDigest(to: string, name: string, digestData: {
    workspaceName: string;
    tasksDueToday: number;
    overdueTasksCount: number;
    newComments: number;
    newDocuments: number;
    crmMovements: number;
    pendingApprovals: number;
    frequency: 'daily' | 'weekly';
    workspaceUrl: string;
  }) {
    const periodLabel = digestData.frequency === 'weekly' ? 'Weekly' : 'Daily';
    return this.sendEmail({
      to,
      subject: `${periodLabel} Digest: ${digestData.workspaceName} — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 16px; max-width: 600px;">
          <h2 style="color: #60A5FA; margin-bottom: 4px;">${periodLabel} Workspace Digest</h2>
          <p style="font-size: 12px; color: #64748B; margin-top: 0; margin-bottom: 24px;">${digestData.workspaceName}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 16px; background: #1E293B; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #3B82F6;">
                <div style="font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Tasks Due Today</div>
                <div style="font-size: 24px; font-weight: 800; color: #F8FAFC;">${digestData.tasksDueToday}</div>
              </td>
            </tr>
            <tr><td style="height: 8px;"></td></tr>
            <tr>
              <td style="padding: 12px 16px; background: #1E293B; border-radius: 8px; border-left: 3px solid ${digestData.overdueTasksCount > 0 ? '#EF4444' : '#10B981'};">
                <div style="font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Overdue Tasks</div>
                <div style="font-size: 24px; font-weight: 800; color: ${digestData.overdueTasksCount > 0 ? '#EF4444' : '#10B981'};">${digestData.overdueTasksCount}</div>
              </td>
            </tr>
            <tr><td style="height: 8px;"></td></tr>
            <tr>
              <td style="padding: 12px 16px; background: #1E293B; border-radius: 8px; border-left: 3px solid #A855F7;">
                <div style="font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">CRM Updates</div>
                <div style="font-size: 24px; font-weight: 800; color: #F8FAFC;">${digestData.crmMovements}</div>
              </td>
            </tr>
            <tr><td style="height: 8px;"></td></tr>
            <tr>
              <td style="padding: 12px 16px; background: #1E293B; border-radius: 8px; border-left: 3px solid #F59E0B;">
                <div style="font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Pending Client Approvals</div>
                <div style="font-size: 24px; font-weight: 800; color: #F8FAFC;">${digestData.pendingApprovals}</div>
              </td>
            </tr>
          </table>

          <div style="margin: 24px 0;">
            <a href="${digestData.workspaceUrl}" style="background: linear-gradient(to right, #2563EB, #4F46E5); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Open Workspace</a>
          </div>
          <p style="font-size: 11px; color: #475569;">Workspace OS — Unsubscribe from digest emails in Settings › Notifications</p>
        </div>
      `,
    });
  }

  /**
   * Get Sent Emails telemetry
   */
  public static getSentEmails() {
    return this.sentEmails;
  }
}
