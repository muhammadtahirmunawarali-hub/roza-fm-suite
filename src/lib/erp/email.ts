// Roza FM Suite — Email Service (Resend)
//
// Sends transactional emails via Resend when RESEND_API_KEY is set.
// When no key is set (dev/sandbox), it gracefully degrades:
//   • Logs the email to the console (so you can see what would have been sent)
//   • Returns the email body in the result so the caller can show the temp
//     password on screen (for the SaaS Management panel — dev convenience)
//
// EMAIL TEMPLATES:
//   Each template returns an HTML string. Templates are inline-styled for
//   maximum email-client compatibility (Gmail, Outlook, Apple Mail).
//
// PRODUCTION CHECKLIST:
//   1. Sign up at resend.com (free for 3,000 emails/mo)
//   2. Verify your sending domain (e.g. noreply.yourdomain.com)
//   3. Set RESEND_API_KEY in your Vercel env vars
//   4. Set EMAIL_FROM="Roza FM Suite <noreply@yourdomain.com>"
//   5. Done — emails will send automatically

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || 'Roza FM Suite <onboarding@resend.dev>';

// Lazily init the Resend client only if a key is present.
// This avoids throwing in dev/sandbox where no key is set.
let _client: Resend | null = null;
function getClient(): Resend | null {
  if (!apiKey) return null;
  if (!_client) _client = new Resend(apiKey);
  return _client;
}

export interface EmailResult {
  ok: boolean;
  sent: boolean; // true if actually emailed; false if fallback (dev)
  messageId?: string;
  // For dev fallback: the caller can show these on screen
  to: string;
  subject: string;
  html: string;
  // For onboarding emails: the temp password (only returned in dev fallback)
  tempPassword?: string;
  error?: string;
}

/**
 * Send an email via Resend. If no API key is set, falls back to "log + return"
 * so the caller can display the temp password on screen in dev.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  // Optional context for dev logging
  devNote?: string;
}): Promise<EmailResult> {
  const { to, subject, html, devNote } = opts;

  // Dev fallback — no Resend key configured
  if (!apiKey) {
    if (devNote) {
      console.log(`\n📧 [EMAIL — dev fallback, not actually sent] ${devNote}`);
      console.log(`   To:      ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Body:    ${html.replace(/<[^>]+>/g, '').slice(0, 200)}...`);
      console.log('');
    }
    return { ok: true, sent: false, to, subject, html };
  }

  // Production — actually send via Resend
  const client = getClient();
  if (!client) {
    return { ok: false, sent: false, to, subject, html, error: 'Resend client not initialized' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    if (error) {
      console.error('[email] Resend error:', error);
      return { ok: false, sent: false, to, subject, html, error: error.message };
    }
    return { ok: true, sent: true, messageId: data?.id, to, subject, html };
  } catch (e: any) {
    console.error('[email] Send failed:', e);
    return { ok: false, sent: false, to, subject, html, error: e?.message || 'Unknown error' };
  }
}

// ────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES (inline-styled HTML for email-client compatibility)
// ────────────────────────────────────────────────────────────────

const BRAND_LOGO = 'https://roza-fm-suite.com/logo.png'; // placeholder — replace with your CDN URL
const BRAND_COLOR = '#00D4AA';
const BRAND_COLOR_DARK = '#009975';

/**
 * Welcome / onboarding email sent to a new tenant admin on signup.
 * Contains: their username, temp password, login URL, and a "set your own password" note.
 */
export function welcomeEmailTemplate(opts: {
  adminName: string;
  companyName: string;
  username: string;
  tempPassword: string;
  loginUrl: string;
  plan: string;
}): { subject: string; html: string } {
  const { adminName, companyName, username, tempPassword, loginUrl, plan } = opts;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  const subject = `Welcome to Roza FM Suite — your ${companyName} workspace is ready`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f5f7;min-height:100%;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_COLOR_DARK});padding:28px 32px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Roza <span style="opacity:0.85;">FM Suite</span></div>
              <div style="font-size:11px;color:rgba(255,255,255,0.85);margin-top:2px;letter-spacing:0.5px;">FACILITY MANAGEMENT SUITE</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Welcome, ${escapeHtml(adminName)}! 👋</h1>
              <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
                Your <strong style="color:#0f172a;">${escapeHtml(companyName)}</strong> workspace on Roza FM Suite is ready to go.
                You're on the <strong>${planLabel}</strong> plan — ${planDescription(plan)}.
              </p>

              <!-- Credentials card -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:24px 0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Your login credentials</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size:13px;color:#64748b;padding-bottom:8px;width:90px;">Username</td>
                        <td style="font-size:14px;color:#0f172a;font-weight:600;padding-bottom:8px;font-family:monospace;">${escapeHtml(username)}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#64748b;padding-bottom:0;">Temp password</td>
                        <td style="font-size:14px;color:#0f172a;font-weight:600;font-family:monospace;">${escapeHtml(tempPassword)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">
                <tr>
                  <td align="center">
                    <a href="${escapeAttr(loginUrl)}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:6px;">Sign in to your workspace →</a>
                  </td>
                </tr>
              </table>

              <!-- Security note -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin:20px 0;">
                <tr>
                  <td style="padding:14px 18px;font-size:12px;color:#92400e;line-height:1.5;">
                    <strong>⚠️ Action required:</strong> You'll be asked to set your own password on first login.
                    This temporary password is for one-time use only — please don't share it.
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#475569;line-height:1.6;">
                Your workspace comes with <strong>46 pre-loaded registers</strong> and sample data — work orders,
                assets, PM schedules, inventory, and more. Explore freely; you can edit, delete, or add anything.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;line-height:1.5;">
                This email was sent because someone signed up for Roza FM Suite using this address.
                If this wasn't you, please ignore this email — no action is needed.
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                © ${new Date().getFullYear()} Roza FM Suite · Facility Management Suite
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/**
 * Send the welcome/onboarding email to a new tenant admin.
 * If RESEND_API_KEY isn't set, returns the temp password in the result so
 * the SaaS Management UI can show it on screen (dev convenience).
 */
export async function sendWelcomeEmail(opts: {
  adminName: string;
  adminEmail: string;
  companyName: string;
  username: string;
  tempPassword: string;
  loginUrl: string;
  plan: string;
}): Promise<EmailResult> {
  const { subject, html } = welcomeEmailTemplate(opts);
  const result = await sendEmail({
    to: opts.adminEmail,
    subject,
    html,
    devNote: `Welcome email for "${opts.adminName}" (${opts.companyName})`,
  });
  // In dev fallback, expose the temp password so the UI can display it
  if (!result.sent) {
    return { ...result, tempPassword: opts.tempPassword };
  }
  return result;
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/`/g, '&#96;');
}

function planDescription(plan: string): string {
  switch (plan) {
    case 'starter': return '10 users, 10K records, 1GB storage';
    case 'pro': return '50 users, 100K records, 10GB storage';
    case 'enterprise': return '500 users, 1M records, 100GB storage';
    default: return 'full access to all modules';
  }
}
