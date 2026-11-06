'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, CircleDashed, Cloud, Loader2, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getStorageSettings,
  saveStorageProvider,
  testR2ConnectionAction,
  type StorageSettingsView,
} from '@/actions/storage-settings.actions';
import type { StorageProviderName } from '@/lib/storage/rules';

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
      <span className={ok ? '' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}

export function StorageSettingsPanel({ canEdit }: { canEdit: boolean }) {
  const [view, setView] = useState<StorageSettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<StorageProviderName>('uploadthing');
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ bucket: string; ok: boolean; error?: string }[] | null>(null);

  useEffect(() => {
    getStorageSettings().then((r) => {
      if (r.success && r.data) {
        setView(r.data);
        setChoice(r.data.provider);
      } else setError(r.error ?? 'Could not load storage settings');
    });
  }, []);

  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  if (!view) return <Skeleton className="h-64 w-full" />;

  const dirty = choice !== view.provider;

  const save = () =>
    startSave(async () => {
      const r = await saveStorageProvider(choice);
      if (r.success) {
        setView({ ...view, provider: choice });
        toast.success(`New uploads now use ${choice === 'r2' ? 'Cloudflare R2' : 'UploadThing'}`);
      } else toast.error(r.error ?? 'Could not save');
    });

  const test = () =>
    startTest(async () => {
      const r = await testR2ConnectionAction();
      if (r.success) setTestResult(r.results ?? []);
      else toast.error(r.error ?? 'Test failed');
    });

  const options: { id: StorageProviderName; title: string; icon: typeof Cloud; text: string }[] = [
    { id: 'uploadthing', title: 'UploadThing', icon: Server, text: 'Current default. Needs UPLOADTHING_TOKEN.' },
    { id: 'r2', title: 'Cloudflare R2', icon: Cloud, text: 'Images in a public bucket, ticket PDFs in a private bucket. No egress fees.' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>File storage provider</CardTitle>
          <CardDescription>
            Applies to new uploads only. Files already uploaded keep working from where they are, so switching never breaks existing events or printed ticket batches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={!canEdit}
                onClick={() => setChoice(o.id)}
                className={`rounded-lg border p-4 text-left transition ${choice === o.id ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/50'} disabled:opacity-60`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <o.icon className="h-4 w-4" /> {o.title}
                  {view.provider === o.id && <Badge variant="secondary">Active</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{o.text}</p>
              </button>
            ))}
          </div>

          {choice === 'r2' && !view.r2.imagesReady && (
            <Alert variant="destructive">
              <AlertDescription>
                R2 is not fully configured yet, so it can&apos;t be selected. Add the environment variables below on Vercel and redeploy.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={save} disabled={!canEdit || !dirty || saving || (choice === 'r2' && !view.r2.imagesReady)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save provider
            </Button>
          </div>
          {!canEdit && <p className="text-sm text-muted-foreground">Only a Super Admin can change this.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cloudflare R2 configuration</CardTitle>
          <CardDescription>Secrets live in Vercel environment variables, never in the database.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-1.5">
            <Check ok={view.r2.credentials} label="R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY" />
            <Check ok={view.r2.publicBucket} label="R2_PUBLIC_BUCKET (images)" />
            <Check ok={view.r2.publicBaseUrl} label={`R2_PUBLIC_BASE_URL (https://…)${view.publicBaseUrl ? ` — ${view.publicBaseUrl}` : ''}`} />
            <Check ok={view.r2.privateBucket} label="R2_PRIVATE_BUCKET (ticket PDFs, must NOT be public)" />
          </ul>
          <p className="text-sm text-muted-foreground">
            Images ready: <b>{view.r2.imagesReady ? 'yes' : 'no'}</b> · Ticket PDFs ready: <b>{view.r2.ticketPdfReady ? 'yes' : 'no'}</b>.
            If R2 is active but the private bucket is missing, ticket generation pauses with a clear error instead of falling back silently.
          </p>
          <Button variant="outline" onClick={test} disabled={!canEdit || testing || !view.r2.credentials}>
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Test connection
          </Button>
          {testResult && (
            <ul className="space-y-1 text-sm">
              {testResult.map((t) => (
                <li key={t.bucket} className={t.ok ? 'text-green-700' : 'text-destructive'}>
                  {t.bucket}: {t.ok ? 'reachable' : `failed — ${t.error}`}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
