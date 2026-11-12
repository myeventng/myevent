import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
    constructor(public key: string) {
      constructorKeys.push(key);
    }
  },
}));
const constructorKeys: string[] = [];

let settingsRows: Array<{ key: string; value: string }> = [];
vi.mock('@/lib/prisma', () => ({
  prisma: {
    platformSettings: { findMany: vi.fn(async () => settingsRows) },
    emailLog: { create: vi.fn(async () => ({})) },
  },
}));

import { sendEmail, testEmailProvider, emailErrorMessage } from '@/lib/email/email-provider';

const resendSettings = (over: Record<string, string> = {}) => {
  settingsRows = Object.entries({
    'email.activeProvider': 'resend',
    'email.fromName': 'MyEvent.com.ng',
    'email.resend.apiKey': 're_test_1234567890',
    'email.resend.fromAddress': 'noreply@myevent.com.ng',
    ...over,
  }).map(([key, value]) => ({ key, value }));
};

beforeEach(() => {
  sendMock.mockReset();
  constructorKeys.length = 0;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_ADDRESS;
});

describe('Resend provider', () => {
  it('is used when selected, with the configured key, sender name and attachments', async () => {
    resendSettings();
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });

    const res = await sendEmail({
      to: 'buyer@example.com',
      subject: 'Your tickets',
      html: '<p>hi</p>',
      attachments: [{ filename: 't.pdf', content: Buffer.from('pdf'), contentType: 'application/pdf' }],
    });

    expect(res).toEqual({ success: true, messageId: 'msg_1' });
    expect(constructorKeys).toEqual(['re_test_1234567890']);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.from).toBe('"MyEvent.com.ng" <noreply@myevent.com.ng>');
    expect(arg.to).toEqual(['buyer@example.com']);
    expect(arg.attachments[0]).toMatchObject({ filename: 't.pdf', contentType: 'application/pdf' });
  });

  it('turns a Resend API error (returned, not thrown) into a failed result', async () => {
    resendSettings();
    sendMock.mockResolvedValue({ data: null, error: { name: 'restricted_api_key', message: 'API key is invalid' } });

    const res = await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' });
    expect(res.success).toBe(false);
    expect(emailErrorMessage(res)).toMatch(/Resend rejected the API key/);
  });

  it('fails clearly when not configured, and ignores the masked placeholder', async () => {
    resendSettings({ 'email.resend.apiKey': '••••••••' });
    const res = await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' });
    expect(res.success).toBe(false);
    expect(emailErrorMessage(res)).toMatch(/API key is not configured/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('falls back to RESEND_* env vars when nothing is saved in settings', async () => {
    resendSettings({ 'email.resend.apiKey': '', 'email.resend.fromAddress': '' });
    process.env.RESEND_API_KEY = 're_env_abcdefghij';
    process.env.RESEND_FROM_ADDRESS = 'env@myevent.com.ng';
    sendMock.mockResolvedValue({ data: { id: 'x' }, error: null });

    const res = await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' });
    expect(res.success).toBe(true);
    expect(constructorKeys).toEqual(['re_env_abcdefghij']);
    expect(sendMock.mock.calls[0][0].from).toContain('env@myevent.com.ng');
  });

  it('test connection sends to the given recipient', async () => {
    resendSettings();
    sendMock.mockResolvedValue({ data: { id: 'msg_t' }, error: null });
    const r = await testEmailProvider('resend', 'admin@myevent.com.ng');
    expect(r.success).toBe(true);
    expect(sendMock.mock.calls[0][0].to).toEqual(['admin@myevent.com.ng']);
  });
});
