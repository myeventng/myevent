const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function staffInviteEmail(p: { organizerName: string; roleLabel: string; acceptUrl: string; expiresInDays: number }) {
  const subject = `${p.organizerName} invited you to help run their events`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f7f9;padding:24px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:10px;padding:28px">
    <h2 style="margin-top:0">You've been invited to join a team</h2>
    <p><strong>${esc(p.organizerName)}</strong> invited you as <strong>${esc(p.roleLabel)}</strong> on MyEvent.</p>
    <p>Sign in (or create an account) with <em>this email address</em> and accept the invitation:</p>
    <p style="text-align:center;margin:28px 0"><a href="${esc(p.acceptUrl)}" style="background:#111;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">Accept invitation</a></p>
    <p style="color:#666;font-size:13px">This link expires in ${p.expiresInDays} days and can be used once. Accepting does not change your own account type. If you weren't expecting this, you can ignore this email.</p>
  </div></body></html>`;
  const text = `${p.organizerName} invited you as ${p.roleLabel} on MyEvent.\nAccept (valid ${p.expiresInDays} days, single use): ${p.acceptUrl}`;
  return { subject, html, text };
}
