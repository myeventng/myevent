// lib/email/send-email.ts
import nodemailer from 'nodemailer';
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
    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_APP_PASSWORD,
      },
    });

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

    // Send the email
    const info = await transporter.sendMail({
      from: `"MyEvent.com.ng" <${process.env.EMAIL_FROM}>`,
      to: data.userEmail,
      subject: 'Verify Your Email Address - MyEvent.com.ng',
      html,
      text: `Hi ${data.userName},\n\nPlease verify your email address by clicking on the following link: ${data.verificationLink}\n\nThis link will expire in 24 hours.\n\nIf you didn't sign up for MyEvent.com.ng, you can safely ignore this email.\n\nRegards,\nThe MyEvent.com.ng Team`,
    });

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
