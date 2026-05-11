// src/lib/email/email-service.ts
// Now routes through the universal provider (Gmail or SES) based on admin settings.
// Drop-in replacement — the external signature is unchanged.

import { sendEmail as sendViaProvider } from './email-provider';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  return sendViaProvider({ to, subject, html, text });
}
