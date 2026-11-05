// lib/email/templates/auth-email.ts
// Branded template for transactional auth emails: verify email, reset password,
// magic link, admin invites. Table-based layout + inline styles so it renders
// consistently in Gmail, Outlook, Apple Mail and mobile clients.

export interface AuthEmailData {
  /** Used for the <title> and as the big heading */
  heading: string;
  /** Main body copy (plain text — it is HTML-escaped here) */
  description: string;
  /** The action link (verification URL, reset URL, ...) */
  link: string;
  /** Button label. Defaults to "Continue" */
  buttonText?: string;
  /** Greets the recipient: "Hi Chioma," */
  recipientName?: string;
  /** Small print under the button, e.g. "This link expires in 1 hour." */
  footerNote?: string;
}

// Brand tokens (taken from the logo + the app's purple/indigo UI)
const BRAND = {
  purple: '#7c3aed',
  indigo: '#4f46e5',
  ink: '#111827',
  body: '#374151',
  muted: '#6b7280',
  border: '#e5e7eb',
  pageBg: '#f3f4f6',
  // the logo's own spectrum, used for the accent bar
  spectrum:
    'linear-gradient(90deg,#7e22ce 0%,#d946ef 25%,#ff3d5a 50%,#ff7a00 75%,#f5c518 100%)',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://myevent.com.ng'
  ).replace(/\/$/, '');
}

export function getAuthEmailHtml(data: AuthEmailData): string {
  const baseUrl = getBaseUrl();
  const logoUrl = `${baseUrl}/assets/images/email-logo.png`;
  const heading = escapeHtml(data.heading);
  const description = escapeHtml(data.description);
  const link = escapeHtml(data.link);
  const buttonText = escapeHtml(data.buttonText ?? 'Continue');
  const greeting = data.recipientName
    ? `<p style="margin:0 0 12px;font-size:16px;line-height:24px;color:${BRAND.body};">Hi ${escapeHtml(data.recipientName)},</p>`
    : '';
  const footerNote = data.footerNote
    ? `<p style="margin:20px 0 0;font-size:13px;line-height:20px;color:${BRAND.muted};text-align:center;">${escapeHtml(data.footerNote)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!-- Preheader (inbox preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${description}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};">
          <!-- Brand accent bar -->
          <tr>
            <td height="6" style="height:6px;line-height:6px;font-size:0;background-color:${BRAND.purple};background-image:${BRAND.spectrum};">&nbsp;</td>
          </tr>

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:28px 32px 8px;">
              <a href="${escapeHtml(baseUrl)}" style="text-decoration:none;">
                <img src="${logoUrl}" width="150" alt="MyEvent.com.ng" style="display:block;border:0;outline:none;height:auto;width:150px;max-width:100%;">
              </a>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:16px 40px 8px;">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:${BRAND.ink};text-align:center;">${heading}</h1>
              ${greeting}
              <p style="margin:0 0 28px;font-size:16px;line-height:24px;color:${BRAND.body};">${description}</p>

              <!-- Bulletproof button -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" bgcolor="${BRAND.purple}" style="border-radius:8px;background-color:${BRAND.purple};background-image:linear-gradient(90deg,${BRAND.purple},${BRAND.indigo});">
                    <a href="${link}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${buttonText}</a>
                  </td>
                </tr>
              </table>

              ${footerNote}
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:24px 40px 8px;">
              <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:${BRAND.muted};">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin:0;font-size:12px;line-height:18px;word-break:break-all;"><a href="${link}" style="color:${BRAND.purple};text-decoration:underline;">${link}</a></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <hr style="border:0;border-top:1px solid ${BRAND.border};margin:0 0 16px;">
              <p style="margin:0;font-size:12px;line-height:18px;color:${BRAND.muted};text-align:center;">
                If you didn't request this email, you can safely ignore it.<br>
                &copy; ${new Date().getFullYear()} MyEvent.com.ng &middot; Experience the extraordinary
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative — improves deliverability and accessibility. */
export function getAuthEmailText(data: AuthEmailData): string {
  return [
    data.recipientName ? `Hi ${data.recipientName},` : null,
    '',
    data.description,
    '',
    `${data.buttonText ?? 'Continue'}: ${data.link}`,
    data.footerNote ? `\n${data.footerNote}` : null,
    "\nIf you didn't request this email, you can safely ignore it.",
    '— MyEvent.com.ng',
  ]
    .filter((line) => line !== null)
    .join('\n');
}
