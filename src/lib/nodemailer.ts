// src/lib/nodemailer.ts
// Legacy shim — kept so existing imports don't break.
// All NEW code should import from @/lib/email/email-provider instead.
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_APP_PASSWORD,
  },
});

export default transporter;
