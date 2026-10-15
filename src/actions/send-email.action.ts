// NOTE: intentionally NOT a "use server" file. It is only called from server
// code (better-auth callbacks, admin actions). Marking it "use server" would
// expose it as a public endpoint that anyone could use to send arbitrary
// emails (with arbitrary links) from the platform's mail account.

import transporter from '@/lib/nodemailer';
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

  const mailOptions = {
    from: process.env.NODEMAILER_USER
      ? `"MyEvent.com.ng" <${process.env.NODEMAILER_USER}>`
      : undefined,
    to,
    subject: `MyEvent.com.ng - ${subject}`,
    html: getAuthEmailHtml(template),
    text: getAuthEmailText(template),
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    console.error('[SendEmail]:', err);
    return { success: false };
  }
}
