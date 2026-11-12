// lib/email/send-email.ts
import { sendEmail } from '@/lib/email/email-provider';
import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';

interface EmailTemplateData {
  userName: string;
  userEmail: string;
  verificationLink: string;
  unsubscribeLink?: string;
}

export async function sendVerificationEmail(data: EmailTemplateData) {
  try {
    // Read the email template file
    const templatePath = join(
      process.cwd(),
      'email-templates',
      'verification.html'
    );
    const templateSource = readFileSync(templatePath, 'utf-8');

    // Compile the template with Handlebars
    const template = Handlebars.compile(templateSource);
    const html = template({
      ...data,
      unsubscribeLink:
        data.unsubscribeLink ||
        `https://yourdomain.com/unsubscribe?email=${encodeURIComponent(
          data.userEmail
        )}`,
    });

    // Send through the provider selected in Settings → Email
    const info = await sendEmail({
      to: data.userEmail,
      subject: 'Verify Your Email Address - MyEvent.com.ng',
      html,
      text: `Hi ${data.userName},\n\nPlease verify your email address by clicking on the following link: ${data.verificationLink}\n\nThis link will expire in 24 hours.\n\nIf you didn't sign up for MyEvent.com.ng, you can safely ignore this email.\n\nRegards,\nThe MyEvent.com.ng Team`,
    });
    if (!info.success) throw info.error ?? new Error('Email send failed');

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error };
  }
}

// Alternative implementation using an email service API
// export async function sendVerificationEmailWithService(
//   data: EmailTemplateData
// ) {
//   try {
//     // Example using a service like SendGrid
//     const apiKey = process.env.SENDGRID_API_KEY;
//     const sgMail = require('@sendgrid/mail');
//     sgMail.setApiKey(apiKey);

//     // Read the email template file
//     const templatePath = join(
//       process.cwd(),
//       'email-templates',
//       'verification.html'
//     );
//     const templateSource = readFileSync(templatePath, 'utf-8');

//     // Compile the template with Handlebars
//     const template = Handlebars.compile(templateSource);
//     const html = template({
//       ...data,
//       unsubscribeLink:
//         data.unsubscribeLink ||
//         `https://yourdomain.com/unsubscribe?email=${encodeURIComponent(
//           data.userEmail
//         )}`,
//     });

//     const msg = {
//       to: data.userEmail,
//       from: process.env.EMAIL_FROM,
//       subject: 'Verify Your Email Address - MyEvent.com.ng',
//       text: `Hi ${data.userName},\n\nPlease verify your email address by clicking on the following link: ${data.verificationLink}\n\nThis link will expire in 24 hours.\n\nIf you didn't sign up for MyEvent.com.ng, you can safely ignore this email.\n\nRegards,\nThe MyEvent.com.ng Team`,
//       html,
//     };

//     await sgMail.send(msg);
//     return { success: true };
//   } catch (error) {
//     console.error('Error sending verification email:', error);
//     return { success: false, error };
//   }
// }
