import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let settingsRows: Array<{ key: string; value: string }> = [];
vi.mock('@/lib/prisma', () => ({
  prisma: {
    platformSettings: { findMany: vi.fn(async () => settingsRows) },
    emailLog: { create: vi.fn(async () => ({})) },
  },
}));

import { sendEmail, testEmailProvider, emailErrorMessage } from '@/lib/email/email-provider';

const TOKEN = 'wSsVR61abcdefghijklmnopqrstuvwxyz0123456789';
const cfg = (over: Record<string, string> = {}) => {
  settingsRows = Object.entries({
    'email.activeProvider': 'zeptomail',
    'email.fromName': 'MyEvent.com.ng',
    'email.zeptomail.apiToken': TOKEN,
    'email.zeptomail.region': 'com',
    'email.zeptomail.fromAddress': 'noreply@myevent.com.ng',
    ...over,
  }).map(([key, value]) => ({ key, value }));
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  delete process.env.ZEPTOMAIL_TOKEN;
  delete process.env.ZEPTOMAIL_FROM_ADDRESS;
});
afterEach(() => vi.unstubAllGlobals());

const ok = (body: any = { request_id: 'req_1', message: 'OK' }) =>
  ({ ok: true, status: 201, statusText: 'Created', json: async () => body }) as any;

describe('ZeptoMail provider', () => {
  it('posts to the regional host with the Zoho-enczapikey header and the right body', async () => {
    cfg({ 'email.zeptomail.region': 'eu' });
    fetchMock.mockResolvedValue(ok());

    const res = await sendEmail({
      to: 'buyer@example.com',
      subject: 'Your tickets',
      html: '<p>hi</p>',
      text: 'hi',
      replyTo: 'support@myevent.com.ng',
      attachments: [{ filename: 't.pdf', content: Buffer.from('pdf'), contentType: 'application/pdf' }],
    });

    expect(res).toEqual({ success: true, messageId: 'req_1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.zeptomail.eu/v1.1/email');
    expect(init.headers.Authorization).toBe(`Zoho-enczapikey ${TOKEN}`);
    const body = JSON.parse(init.body);
    expect(body.from).toEqual({ address: 'noreply@myevent.com.ng', name: 'MyEvent.com.ng' });
    expect(body.to).toEqual([{ email_address: { address: 'buyer@example.com' } }]);
    expect(body.htmlbody).toBe('<p>hi</p>');
    expect(body.reply_to).toEqual([{ address: 'support@myevent.com.ng' }]);
    expect(body.attachments[0]).toEqual({
      name: 't.pdf',
      mime_type: 'application/pdf',
      content: Buffer.from('pdf').toString('base64'),
    });
  });

  it('uses the Zoho CPaaS host (default region)', async () => {
    cfg({ 'email.zeptomail.region': 'cpaas' });
    fetchMock.mockResolvedValue(ok());
    await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://cpaas.zoho.com/v1.1/email');
  });

  it('accepts the token pasted with its Zoho-enczapikey prefix, and a pre-formatted from', async () => {
    cfg({ 'email.zeptomail.apiToken': `Zoho-enczapikey ${TOKEN}` });
    fetchMock.mockResolvedValue(ok());
    await sendEmail({ to: 'a@b.com', subject: 's', html: 'h', from: '"Acme Events" <acme@myevent.com.ng>' });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe(`Zoho-enczapikey ${TOKEN}`);
    expect(JSON.parse(init.body).from).toEqual({ address: 'acme@myevent.com.ng', name: 'Acme Events' });
  });

  it('turns a 401 into an actionable failure', async () => {
    cfg();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { code: 'TM_3501', message: 'Invalid API Token found', details: [{ message: 'Invalid API Token found' }] } }),
    });
    const res = await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' });
    expect(res.success).toBe(false);
    expect(emailErrorMessage(res)).toMatch(/ZeptoMail rejected the Send Mail Token/);
  });

  it('reports an unverified sender as a ZeptoMail sender problem (not a Resend one)', async () => {
    cfg({ 'email.zeptomail.fromAddress': 'noreply@event.com.ng' });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { code: 'TM_3301', message: 'Sender address not verified', details: [{ message: 'Sender address not verified' }] } }),
    });
    const res = await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' });
    const msg = emailErrorMessage(res);
    expect(msg).toMatch(/ZeptoMail refused the sender address/);
    expect(msg).not.toMatch(/Resend/);
  });

  it('fails clearly without config / with a bad region, and never calls the API', async () => {
    cfg({ 'email.zeptomail.apiToken': '••••••••' });
    let res = await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' });
    expect(emailErrorMessage(res)).toMatch(/Send Mail Token is not configured/);

    cfg({ 'email.zeptomail.region': 'evil.example.com/x' });
    res = await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' });
    expect(emailErrorMessage(res)).toMatch(/Unknown ZeptoMail region/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to ZEPTOMAIL_* env vars', async () => {
    cfg({ 'email.zeptomail.apiToken': '', 'email.zeptomail.fromAddress': '' });
    process.env.ZEPTOMAIL_TOKEN = TOKEN;
    process.env.ZEPTOMAIL_FROM_ADDRESS = 'env@myevent.com.ng';
    fetchMock.mockResolvedValue(ok());
    const res = await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' });
    expect(res.success).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).from.address).toBe('env@myevent.com.ng');
  });

  it('test connection sends to the given recipient', async () => {
    cfg();
    fetchMock.mockResolvedValue(ok());
    const r = await testEmailProvider('zeptomail', 'admin@myevent.com.ng');
    expect(r.success).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toEqual([{ email_address: { address: 'admin@myevent.com.ng' } }]);
  });
});
