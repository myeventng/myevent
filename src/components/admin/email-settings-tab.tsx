'use client';

// src/components/admin/email-settings-tab.tsx
// Drop this tab inside your existing <AdminSettings /> Tabs component.
// It handles both Gmail and Amazon SES config, provider switching, and connection tests.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Mail, Server } from 'lucide-react';
import { testEmailProviderAction } from '@/actions/platform-settings.actions';

export type EmailProviderType = 'gmail' | 'ses';

export interface EmailSettings {
  activeProvider: EmailProviderType;
  fromName: string;
  gmail: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
  ses: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    fromAddress: string;
  };
}

interface Props {
  settings: EmailSettings;
  onChange: (settings: EmailSettings) => void;
}

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-southeast-1',
  'ap-south-1',
  'ca-central-1',
];

export function EmailSettingsTab({ settings, onChange }: Props) {
  const [testState, setTestState] = useState<{
    loading: boolean;
    result: { success: boolean; message: string } | null;
  }>({ loading: false, result: null });

  const update = (path: string[], value: any) => {
    const next = JSON.parse(JSON.stringify(settings)) as EmailSettings;
    let obj: any = next;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
    obj[path[path.length - 1]] = value;
    onChange(next);
  };

  const handleTest = async () => {
    setTestState({ loading: true, result: null });
    const res = await testEmailProviderAction(settings.activeProvider);
    setTestState({ loading: false, result: { success: res.success, message: res.message ?? '' } });
  };

  return (
    <div className="space-y-8">
      {/* ── Provider selector ─────────────────────────────────────────── */}
      <div className="space-y-4 rounded-lg border p-5">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Active Email Provider</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Gmail card */}
          <button
            type="button"
            onClick={() => update(['activeProvider'], 'gmail')}
            className={`rounded-lg border-2 p-4 text-left transition-all ${
              settings.activeProvider === 'gmail'
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-muted-foreground/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Gmail / SMTP</span>
              {settings.activeProvider === 'gmail' && (
                <Badge className="bg-primary text-primary-foreground text-xs">Active</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Send via your Gmail account using an App Password.
            </p>
          </button>

          {/* SES card */}
          <button
            type="button"
            onClick={() => update(['activeProvider'], 'ses')}
            className={`rounded-lg border-2 p-4 text-left transition-all ${
              settings.activeProvider === 'ses'
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-muted-foreground/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Amazon SES</span>
              {settings.activeProvider === 'ses' && (
                <Badge className="bg-primary text-primary-foreground text-xs">Active</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              High-volume, cost-effective AWS email delivery.
            </p>
          </button>
        </div>

        {/* Shared: From name */}
        <div className="mt-4 grid gap-2">
          <Label htmlFor="fromName">From Name (shown to recipients)</Label>
          <Input
            id="fromName"
            value={settings.fromName}
            onChange={(e) => update(['fromName'], e.target.value)}
            placeholder="MyEvent.com.ng"
          />
        </div>
      </div>

      {/* ── Gmail config ─────────────────────────────────────────────── */}
      {settings.activeProvider === 'gmail' && (
        <div className="space-y-4 rounded-lg border p-5">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Gmail / SMTP Configuration</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gmailHost">SMTP Host</Label>
              <Input
                id="gmailHost"
                value={settings.gmail.host}
                onChange={(e) => update(['gmail', 'host'], e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gmailPort">Port</Label>
              <Input
                id="gmailPort"
                type="number"
                value={settings.gmail.port}
                onChange={(e) => update(['gmail', 'port'], parseInt(e.target.value))}
                placeholder="465"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="gmailSecure"
              checked={settings.gmail.secure}
              onCheckedChange={(v) => update(['gmail', 'secure'], v)}
            />
            <Label htmlFor="gmailSecure">Use SSL/TLS (recommended for port 465)</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gmailUser">Gmail Address</Label>
            <Input
              id="gmailUser"
              type="email"
              value={settings.gmail.user}
              onChange={(e) => update(['gmail', 'user'], e.target.value)}
              placeholder="noreply@myevent.com.ng"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gmailPassword">
              App Password{' '}
              <span className="text-xs text-muted-foreground">(not your Google account password)</span>
            </Label>
            <Input
              id="gmailPassword"
              type="password"
              value={settings.gmail.password}
              onChange={(e) => update(['gmail', 'password'], e.target.value)}
              placeholder="Leave blank to keep existing password"
            />
            <p className="text-xs text-muted-foreground">
              Generate at{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                myaccount.google.com/apppasswords
              </a>
              . Requires 2FA to be enabled on your Google account.
            </p>
          </div>
        </div>
      )}

      {/* ── Amazon SES config ─────────────────────────────────────────── */}
      {settings.activeProvider === 'ses' && (
        <div className="space-y-4 rounded-lg border p-5">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Amazon SES Configuration</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sesRegion">AWS Region</Label>
            <Select
              value={settings.ses.region}
              onValueChange={(v) => update(['ses', 'region'], v)}
            >
              <SelectTrigger id="sesRegion">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {AWS_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sesFrom">Verified From Address</Label>
            <Input
              id="sesFrom"
              type="email"
              value={settings.ses.fromAddress}
              onChange={(e) => update(['ses', 'fromAddress'], e.target.value)}
              placeholder="noreply@myevent.com.ng"
            />
            <p className="text-xs text-muted-foreground">
              Must be a verified identity (email or domain) in your AWS SES console.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sesKey">IAM Access Key ID</Label>
            <Input
              id="sesKey"
              value={settings.ses.accessKeyId}
              onChange={(e) => update(['ses', 'accessKeyId'], e.target.value)}
              placeholder="AKIAIOSFODNN7EXAMPLE"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sesSecret">IAM Secret Access Key</Label>
            <Input
              id="sesSecret"
              type="password"
              value={settings.ses.secretAccessKey}
              onChange={(e) => update(['ses', 'secretAccessKey'], e.target.value)}
              placeholder="Leave blank to keep existing key"
            />
            <p className="text-xs text-muted-foreground">
              Create a dedicated IAM user with the{' '}
              <code className="rounded bg-muted px-1 text-xs">AmazonSESFullAccess</code>{' '}
              (or a custom least-privilege) policy.
            </p>
          </div>
        </div>
      )}

      {/* ── Test connection ───────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button type="button" variant="outline" onClick={handleTest} disabled={testState.loading}>
          {testState.loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Test {settings.activeProvider === 'ses' ? 'Amazon SES' : 'Gmail'} Connection
        </Button>

        {testState.result && (
          <Alert
            className={`flex-1 py-2 ${
              testState.result.success
                ? 'border-green-500/30 bg-green-50 dark:bg-green-900/10'
                : 'border-red-500/30 bg-red-50 dark:bg-red-900/10'
            }`}
          >
            <AlertDescription className="flex items-center gap-2 text-sm">
              {testState.result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              {testState.result.message}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
