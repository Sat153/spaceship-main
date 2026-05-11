import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev'

export async function sendTaskAssignmentEmail({
    toEmail,
    toName,
    assignedBy,
    taskTitle,
    taskDescription,
    priority,
    dueDate,
    projectName,
    dashboardUrl,
}: {
    toEmail: string
    toName: string
    assignedBy: string
    taskTitle: string
    taskDescription?: string
    priority: string
    dueDate?: string
    projectName?: string
    dashboardUrl: string
}) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
        console.warn('[Email] RESEND_API_KEY not set — skipping email')
        return { error: null }
    }

    const priorityColor: Record<string, string> = {
        urgent: '#ef4444',
        high: '#f97316',
        medium: '#3b82f6',
        low: '#6b7280',
    }
    const pColor = priorityColor[priority] || '#6b7280'

    const { error } = await resend.emails.send({
        from: `Anya Segen CRM <${FROM}>`,
        to: toEmail,
        subject: `New task assigned: ${taskTitle}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;max-width:560px;width:100%;">

        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px 32px;">
            <p style="margin:0;color:#bfdbfe;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Anya Segen CRM</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">You have a new task</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 6px;color:#9ca3af;font-size:15px;">Hi <strong style="color:#f9fafb;">${toName}</strong>,</p>
            <p style="margin:0 0 28px;color:#9ca3af;font-size:14px;line-height:1.7;">
              <strong style="color:#f9fafb;">${assignedBy}</strong> has assigned a task to you.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:10px;border:1px solid #374151;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #374151;">
                  <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Task</p>
                  <p style="margin:6px 0 0;color:#f9fafb;font-size:17px;font-weight:700;">${taskTitle}</p>
                  ${taskDescription ? `<p style="margin:6px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">${taskDescription}</p>` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #374151;">
                  <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Priority</p>
                  <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${pColor};">${priority.charAt(0).toUpperCase() + priority.slice(1)}</p>
                </td>
              </tr>
              ${projectName ? `<tr><td style="padding:12px 20px;border-bottom:1px solid #374151;">
                <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Project</p>
                <p style="margin:4px 0 0;color:#f9fafb;font-size:14px;">${projectName}</p>
              </td></tr>` : ''}
              ${dueDate ? `<tr><td style="padding:12px 20px;">
                <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Due Date</p>
                <p style="margin:4px 0 0;color:#f9fafb;font-size:14px;">${dueDate}</p>
              </td></tr>` : ''}
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${dashboardUrl}" target="_blank"
                    style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#1d4ed8,#7c3aed);color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">
                    Open Dashboard &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1f2937;">
            <p style="margin:0;color:#374151;font-size:12px;">Anya Segen CRM &middot; Automated task notification</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return { error: error?.message || null }
}

export async function sendApprovalRequestEmail({
    toEmail,
    postTitle,
    postBody,
    clientName,
    platforms,
    approvalUrl,
}: {
    toEmail: string
    postTitle: string
    postBody: string
    clientName: string
    platforms: string[]
    approvalUrl: string
}) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
        console.warn('[Email] RESEND_API_KEY not set — skipping approval email')
        return { error: null }
    }

    const platformLabels: Record<string, string> = {
        twitter: '𝕏 Twitter', instagram: '📷 Instagram',
        facebook: '📘 Facebook', linkedin: '💼 LinkedIn', youtube: '▶️ YouTube',
    }
    const platformBadges = platforms.map(p => platformLabels[p] || p).join(' &nbsp; ')
    const previewBody = postBody.length > 400 ? postBody.slice(0, 400) + '…' : postBody

    const { error } = await resend.emails.send({
        from: `Anya Segen CRM <${FROM}>`,
        to: toEmail,
        subject: `Content awaiting your approval — ${postTitle}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07070d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07070d;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:20px;border:1px solid rgba(139,92,246,0.2);overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#8b5cf6,#ec4899);padding:32px;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Anya Segen CRM</p>
            <h1 style="margin:10px 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">Content Awaiting<br/>Your Approval</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;">
              Hi <strong style="color:#fff;">Akhilesh Ji</strong>, a new post is ready for your final approval before publishing.
            </p>

            <!-- Post card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;border:1px solid rgba(255,255,255,0.08);margin-bottom:28px;overflow:hidden;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Client</p>
                  <p style="margin:4px 0 0;color:#e2e8f0;font-size:15px;font-weight:600;">${clientName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Post Title</p>
                  <p style="margin:4px 0 0;color:#e2e8f0;font-size:17px;font-weight:700;">${postTitle}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Content Preview</p>
                  <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;line-height:1.8;white-space:pre-wrap;">${previewBody}</p>
                </td>
              </tr>
              ${platforms.length > 0 ? `<tr>
                <td style="padding:14px 20px;">
                  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Platforms</p>
                  <p style="margin:6px 0 0;color:#c4b5fd;font-size:13px;">${platformBadges}</p>
                </td>
              </tr>` : ''}
            </table>

            <!-- CTA buttons -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="${approvalUrl}?action=approve" target="_blank"
                    style="display:inline-block;padding:16px 56px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.02em;">
                    ✓ &nbsp; Approve
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${approvalUrl}?action=reject" target="_blank"
                    style="display:inline-block;padding:16px 56px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#ffffff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.02em;">
                    ✗ &nbsp; Reject
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;text-align:center;line-height:1.6;">
              This link expires in 7 days &middot; Each link is single-use<br/>
              <a href="${approvalUrl}" style="color:#8b5cf6;text-decoration:none;">View full post &rarr;</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;color:rgba(255,255,255,0.15);font-size:12px;">Anya Segen CRM &middot; Final Approval Request</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return { error: error?.message || null }
}

export async function sendPhotoApprovalEmail({
    toEmail,
    photoId,
    imageUrl,
    assigneeName,
    departmentName,
    approvalUrl,
}: {
    toEmail: string
    photoId: string
    imageUrl: string
    assigneeName: string
    departmentName: string | null
    approvalUrl: string
}) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
        console.warn('[Email] RESEND_API_KEY not set — skipping photo approval email')
        return { error: null }
    }

    const { error } = await resend.emails.send({
        from: `Anya Segen CRM <${FROM}>`,
        to: toEmail,
        subject: `Photo awaiting your approval — ${photoId}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07070d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07070d;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:20px;border:1px solid rgba(139,92,246,0.2);overflow:hidden;max-width:560px;width:100%;">

        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:32px;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Anya Segen CRM</p>
            <h1 style="margin:10px 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">Photo Awaiting<br/>Your Approval</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;">
              Hi <strong style="color:#fff;">Akhilesh Ji</strong>, a photo has been processed and is ready for your final approval.
            </p>

            <!-- Photo preview -->
            <div style="border-radius:12px;overflow:hidden;margin-bottom:24px;border:1px solid rgba(255,255,255,0.1);">
              <img src="${imageUrl}" alt="${photoId}" style="width:100%;max-height:320px;object-fit:cover;display:block;" />
            </div>

            <!-- Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;border:1px solid rgba(255,255,255,0.08);margin-bottom:28px;overflow:hidden;">
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Photo ID</p>
                  <p style="margin:4px 0 0;color:#e2e8f0;font-size:15px;font-weight:600;font-family:monospace;">${photoId}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Processed By</p>
                  <p style="margin:4px 0 0;color:#e2e8f0;font-size:15px;font-weight:600;">${assigneeName}</p>
                </td>
              </tr>
              ${departmentName ? `<tr>
                <td style="padding:14px 20px;">
                  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Department</p>
                  <p style="margin:4px 0 0;color:#e2e8f0;font-size:15px;">${departmentName}</p>
                </td>
              </tr>` : ''}
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="${approvalUrl}?action=approve" target="_blank"
                    style="display:inline-block;padding:16px 56px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:700;">
                    ✓ &nbsp; Approve
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${approvalUrl}?action=reject" target="_blank"
                    style="display:inline-block;padding:16px 56px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#ffffff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:700;">
                    ✗ &nbsp; Reject
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;text-align:center;">
              <a href="${approvalUrl}" style="color:#8b5cf6;text-decoration:none;">View full photo &rarr;</a>
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;color:rgba(255,255,255,0.15);font-size:12px;">Anya Segen CRM &middot; Photo Approval Request</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return { error: error?.message || null }
}

export async function sendApprovalReminderEmail({
    toEmail,
    postTitle,
    clientName,
    approvalUrl,
    minutesLeft,
}: {
    toEmail: string
    postTitle: string
    clientName: string
    approvalUrl: string
    minutesLeft: number
}) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
        console.warn('[Email] RESEND_API_KEY not set — skipping reminder email')
        return { error: null }
    }

    const isUrgent = minutesLeft <= 5
    const headerColor = isUrgent ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#d97706,#b45309)'
    const urgencyLabel = isUrgent ? '⚠️ FINAL REMINDER' : '⏰ REMINDER'
    const urgencyText = isUrgent
        ? `Only <strong style="color:#fca5a5;">${minutesLeft} minutes</strong> remaining!`
        : `<strong style="color:#fcd34d;">${minutesLeft} minutes</strong> remaining before deadline.`

    const { error } = await resend.emails.send({
        from: `Anya Segen CRM <${FROM}>`,
        to: toEmail,
        subject: `${urgencyLabel}: Content approval needed — ${postTitle}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07070d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07070d;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:20px;border:1px solid rgba(239,68,68,0.3);overflow:hidden;max-width:560px;width:100%;">

        <tr>
          <td style="background:${headerColor};padding:28px 32px;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">${urgencyLabel}</p>
            <h1 style="margin:10px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Approval Still Pending</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:rgba(255,255,255,0.6);font-size:14px;line-height:1.7;">
              Hi <strong style="color:#fff;">Akhilesh Ji</strong>, the following content is still waiting for your approval. ${urgencyText}
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;border:1px solid rgba(239,68,68,0.2);margin-bottom:28px;overflow:hidden;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Client</p>
                  <p style="margin:4px 0 0;color:#e2e8f0;font-size:15px;font-weight:600;">${clientName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Post</p>
                  <p style="margin:4px 0 0;color:#e2e8f0;font-size:17px;font-weight:700;">${postTitle}</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="${approvalUrl}?action=approve" target="_blank"
                    style="display:inline-block;padding:16px 56px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:700;">
                    ✓ &nbsp; Approve Now
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${approvalUrl}?action=reject" target="_blank"
                    style="display:inline-block;padding:16px 56px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#ffffff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:700;">
                    ✗ &nbsp; Reject
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;text-align:center;">
              <a href="${approvalUrl}" style="color:#8b5cf6;text-decoration:none;">View full post &rarr;</a>
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;color:rgba(255,255,255,0.15);font-size:12px;">Anya Segen CRM &middot; Automated approval reminder</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return { error: error?.message || null }
}

export async function sendMeetingInviteEmail({
    toEmail,
    toName,
    meetingTitle,
    description,
    startDate,
    endDate,
    location,
    meetingUrl,
    departmentName,
    organizer,
    dashboardUrl,
}: {
    toEmail: string
    toName: string
    meetingTitle: string
    description?: string
    startDate: string
    endDate: string
    location?: string
    meetingUrl?: string
    departmentName: string
    organizer: string
    dashboardUrl: string
}) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
        console.warn('[Email] RESEND_API_KEY not set — skipping meeting invite email')
        return { error: null }
    }

    const { error } = await resend.emails.send({
        from: `Anya Segen CRM <${FROM}>`,
        to: toEmail,
        subject: `Meeting Invite: ${meetingTitle}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;max-width:560px;width:100%;">

        <tr>
          <td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 32px;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Anya Segen CRM &middot; Meeting Invite</p>
            <h1 style="margin:10px 0 0;color:#ffffff;font-size:22px;font-weight:700;">You have been invited to a meeting</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 6px;color:#9ca3af;font-size:15px;">Hi <strong style="color:#f9fafb;">${toName}</strong>,</p>
            <p style="margin:0 0 28px;color:#9ca3af;font-size:14px;line-height:1.7;">
              <strong style="color:#f9fafb;">${organizer}</strong> has scheduled a meeting for the <strong style="color:#f9fafb;">${departmentName}</strong> department.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:10px;border:1px solid #374151;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #374151;">
                  <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Meeting</p>
                  <p style="margin:6px 0 0;color:#f9fafb;font-size:18px;font-weight:700;">${meetingTitle}</p>
                  ${description ? `<p style="margin:6px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">${description}</p>` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #374151;">
                  <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Date &amp; Time</p>
                  <p style="margin:4px 0 0;color:#f9fafb;font-size:14px;font-weight:600;">${startDate}</p>
                  <p style="margin:2px 0 0;color:#9ca3af;font-size:13px;">to ${endDate}</p>
                </td>
              </tr>
              ${location ? `<tr>
                <td style="padding:12px 20px;border-bottom:1px solid #374151;">
                  <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Location</p>
                  <p style="margin:4px 0 0;color:#f9fafb;font-size:14px;">${location}</p>
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding:12px 20px;">
                  <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Department</p>
                  <p style="margin:4px 0 0;color:#38bdf8;font-size:14px;font-weight:600;">${departmentName}</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${meetingUrl ? `<td align="center" style="padding-bottom:12px;">
                  <a href="${meetingUrl}" target="_blank"
                    style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">
                    Join Meeting &rarr;
                  </a>
                </td>` : ''}
              </tr>
              <tr>
                <td align="center">
                  <a href="${dashboardUrl}" target="_blank"
                    style="display:inline-block;padding:12px 36px;background:transparent;color:#6b7280;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;border:1px solid #374151;">
                    View Calendar
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1f2937;">
            <p style="margin:0;color:#374151;font-size:12px;">Anya Segen CRM &middot; Meeting invitation for ${departmentName} department</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return { error: error?.message || null }
}

export async function sendPhotoAssignmentEmail({
    toEmail,
    toName,
    assignedBy,
    photoId,
    departmentName,
    imageUrl,
    taskUrl,
}: {
    toEmail: string
    toName: string
    assignedBy: string
    photoId: string
    departmentName?: string | null
    imageUrl: string
    taskUrl: string
}) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
        console.warn('[Email] RESEND_API_KEY not set — skipping email')
        return { error: null }
    }

    const isVideo = /\.(mp4|mov|avi|webm|mkv|m4v)(\?|$)/i.test(imageUrl)
    const fileLabel = isVideo ? 'video' : 'photo'

    const { error } = await resend.emails.send({
        from: `Anya Segen CRM <${FROM}>`,
        to: toEmail,
        subject: `You have a new task — ${photoId}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px 32px;">
            <p style="margin:0;color:#bfdbfe;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Anya Segen CRM</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">You got your today's task!</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <!-- Greeting -->
            <p style="margin:0 0 6px;color:#9ca3af;font-size:15px;">Hi <strong style="color:#f9fafb;">${toName}</strong>,</p>
            <p style="margin:0 0 28px;color:#9ca3af;font-size:14px;line-height:1.7;">
              <strong style="color:#f9fafb;">${assignedBy}</strong> has assigned a new ${fileLabel} to you.
              ${departmentName ? `This task is for the <strong style="color:#f9fafb;">${departmentName}</strong> department.` : ''}
              Click the button below to view and download your file.
            </p>

            <!-- File preview box -->
            <div style="border-radius:12px;overflow:hidden;margin-bottom:28px;border:1px solid #374151;background:#1f2937;">
              ${isVideo
                ? `<div style="padding:32px;text-align:center;">
                    <div style="width:56px;height:56px;border-radius:50%;background:#1d4ed8;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">
                      <span style="font-size:24px;">&#9654;</span>
                    </div>
                    <p style="margin:0;color:#9ca3af;font-size:13px;">Video file attached — open to preview &amp; download</p>
                  </div>`
                : `<img src="${imageUrl}" alt="Assigned task" style="width:100%;max-height:260px;object-fit:cover;display:block;" />`
              }
            </div>

            <!-- Task ID -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:10px;border:1px solid #374151;margin-bottom:28px;">
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #374151;">
                  <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Task ID</p>
                  <p style="margin:4px 0 0;color:#f9fafb;font-size:15px;font-weight:600;font-family:monospace;">${photoId}</p>
                </td>
              </tr>
              ${departmentName ? `
              <tr>
                <td style="padding:14px 20px;">
                  <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Department</p>
                  <p style="margin:4px 0 0;color:#f9fafb;font-size:15px;">${departmentName}</p>
                </td>
              </tr>` : ''}
            </table>

            <!-- Open Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${taskUrl}" target="_blank"
                    style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#1d4ed8,#7c3aed);color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.02em;">
                    Open Task &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:20px 0 0;color:#4b5563;font-size:12px;text-align:center;line-height:1.6;">
              Inside the task page you can preview the file and download it to your device.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1f2937;">
            <p style="margin:0;color:#374151;font-size:12px;">Anya Segen CRM &middot; This is an automated task notification</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return { error: error?.message || null }
}
