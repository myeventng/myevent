// Small branded HTML wrapper for the contact + newsletter emails.
// Table layout + inline styles so it renders in Gmail, Outlook and mobile clients.
import { escapeHtml } from './auth-email';

const C = {
  bg: '#1b0b2e',
  surface: '#261245',
  red: '#e5173f',
  violet: '#9b4dff',
  ink: '#111827',
  body: '#374151',
  muted: '#6b7280',
  border: '#e5e7eb',
  page: '#f3f4f6',
};

export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://myevent.com.ng'
  ).replace(/\/$/, '');
}

/** Turns plain text into <p> paragraphs (blank line = new paragraph, single newline = <br>). */
export function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:${C.body};">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`
    )
    .join('');
}

interface Layout {
  title: string;
  /** Already-escaped HTML for the body */
  bodyHtml: string;
  button?: { label: string; url: string };
  /** Already-escaped HTML for the small print */
  footerHtml?: string;
}

export function siteEmailLayout({ title, bodyHtml, button, footerHtml }: Layout) {
  const logo = `${getBaseUrl()}/assets/images/email-logo.png`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${C.border};">
<tr><td style="background:${C.bg};padding:20px 32px;border-bottom:4px solid ${C.red};"><img src="${logo}" alt="MyEvent" height="44" style="display:block;height:44px;width:auto;border:0;"></td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 20px;font-size:24px;line-height:32px;color:${C.ink};">${escapeHtml(title)}</h1>
${bodyHtml}
${
  button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;"><tr><td style="background:${C.red};border-radius:999px;"><a href="${escapeHtml(button.url)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(button.label)}</a></td></tr></table>`
    : ''
}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid ${C.border};font-size:13px;line-height:20px;color:${C.muted};">
${footerHtml ?? 'MyEvent.com.ng, Utako, Abuja, Nigeria'}
</td></tr>
</table></td></tr></table></body></html>`;
}
