// NOTE: intentionally NOT a "use server" file. It is only called from server
// code (better-auth callbacks, admin actions). Marking it "use server" would
// expose it as a public endpoint that anyone could use to send arbitrary
// emails (with arbitrary links) from the platform's mail account.

import { sendEmail } from '@/lib/email/email-provider';
import {
  getAuthEmailHtml,
  getAuthEmailText,
} from '@/lib/email/templates/auth-email';

export async function sendEmailAction({
  to,
  subject,
  meta,
}: {
  to: string;
  subject: string;
  meta: {
    description: string;
    link: string;
    /** Button label, e.g. "Verify Email Address". Defaults to "Continue". */
    buttonText?: string;
    /** Recipient's name for the greeting */
    recipientName?: string;
    /** Small print under the button, e.g. link expiry */
    footerNote?: string;
  };
}) {
  const template = {
    heading: subject,
    description: meta.description,
    link: meta.link,
    buttonText: meta.buttonText,
    recipientName: meta.recipientName,
    footerNote: meta.footerNote,
  };

  // Goes through the provider the super admin selected (Gmail / SES / Resend);
  // sendEmail never throws and uses that provider's configured sender.
  const result = await sendEmail({
    to,
    subject: `MyEvent.com.ng - ${subject}`,
    html: getAuthEmailHtml(template),
    text: getAuthEmailText(template),
  });

  if (!result.success) {
    console.error('[SendEmail]:', result.error);
    return { success: false };
  }
  return { success: true };
}
