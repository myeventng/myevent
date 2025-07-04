import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const emailConfig = {
  from: `${process.env.RESEND_FROM_NAME || 'Event.com.ng'} <${process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'}>`,
  replyTo: process.env.RESEND_REPLY_TO_EMAIL,
  testMode: process.env.RESEND_TEST_MODE === 'true',
  testEmail: process.env.RESEND_TEST_EMAIL,
};
