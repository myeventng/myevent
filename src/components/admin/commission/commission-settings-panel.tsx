'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Loader2, Percent, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getGeneralCommissionSettings, updateCommissionVisibility, updateGeneralCommission,
} from '@/actions/commission.actions';
import { percentToBps, applyBps, formatNaira } from '@/lib/money';

type Visibility = { checkout: boolean; organizerDashboard: boolean; customerFacing: boolean };

const SAMPLE_AMOUNTS = [5000, 10000, 50000];

export function CommissionSettingsPanel({ canEdit }: { canEdit: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [input, setInput] = useState('');
  const [visibility, setVisibility] = useState<Visibility>({ checkout: true, organizerDashboard: true, customerFacing: true });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, startSave] = useTransition();
  const [savingVis, startVis] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getGeneralCommissionSettings();
    if (res.success) {
      setSaved(res.data.percentage);
      setInput(String(res.data.percentage));
      setVisibility(res.data.visibility);
      setIsConfigured(res.data.isConfigured);
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const parsed = input.trim() === '' ? NaN : Number(input);
  const validationError = useMemo(() => {
    if (Number.isNaN(parsed)) return 'Enter a percentage';
    if (parsed < 0) return 'Commission cannot be negative';
    if (parsed > 100) return 'Commission cannot exceed 100%';
    if (Math.abs(parsed * 100 - Math.round(parsed * 100)) > 1e-9) return 'Use at most 2 decimal places';
    return null;
  }, [parsed]);
  const dirty = saved !== null && !validationError && parsed !== saved;

  // Local, arithmetic-only preview: same integer/basis-point rounding the server uses.
  const preview = (amount: number) => {
    if (validationError) return null;
    const kobo = amount * 100;
    const fee = applyBps(kobo, percentToBps(parsed));
    return { fee: fee / 100, proceeds: (kobo - fee) / 100 };
  };

  const save = () =>
    startSave(async () => {
      const res = await updateGeneralCommission({ percentage: parsed });
      setConfirmOpen(false);
      if (res.success) {
        setSaved(res.data.percentage);
        setIsConfigured(true);
        toast.success(res.message ?? 'Saved');
      } else {
        toast.error(res.message);
      }
    });

  const toggle = (key: keyof Visibility, value: boolean) => {
    const next = { ...visibility, [key]: value };
    setVisibility(next);
    startVis(async () => {
      const res = await updateCommissionVisibility(next);
      if (res.success) toast.success('Visibility updated');
      else {
        setVisibility(visibility);
        toast.error(res.message);
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          {error}
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-2 h-3 w-3" />Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" />Default platform commission</CardTitle>
          <CardDescription>
            Applied to every order unless an event rule or an organizer rule overrides it (event rule → organizer rule → this default).
            Changes apply to <strong>new orders only</strong>; existing orders keep the rate they were created with.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!isConfigured && (
            <Alert>
              <AlertDescription>No default has been saved yet, so the built-in starting value is in use. Save a value to make it explicit.</AlertDescription>
            </Alert>
          )}
          <div className="max-w-xs space-y-2">
            <Label htmlFor="general-commission">Commission (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="general-commission"
                inputMode="decimal"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!canEdit}
                aria-invalid={!!validationError}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            {validationError && <p className="text-sm text-destructive">{validationError}</p>}
            {!canEdit && <p className="text-xs text-muted-foreground">Only a super admin can change the default commission.</p>}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Preview</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {SAMPLE_AMOUNTS.map((a) => {
                const p = preview(a);
                return (
                  <div key={a} className="rounded-lg border p-3 text-sm">
                    <div className="text-muted-foreground">On a {formatNaira(a * 100)} order</div>
                    <div className="mt-1 font-semibold">{p ? formatNaira(p.fee * 100) : '—'} commission</div>
                    <div className="text-muted-foreground">{p ? formatNaira(p.proceeds * 100) : '—'} to organizer</div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button disabled={!canEdit || !dirty || saving} onClick={() => setConfirmOpen(true)}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save commission
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission visibility</CardTitle>
          <CardDescription>
            Choose where the commission is shown. Hiding it never removes it — it is still calculated, recorded and deducted exactly the same.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            ['checkout', 'Ticket booking & checkout', 'Show the platform fee to buyers while they book.'],
            ['organizerDashboard', 'Organizer dashboards', 'Show fee lines and percentages in organizer analytics and orders.'],
            ['customerFacing', 'Other customer-facing pages', 'Receipts, order pages and emails sent to customers.'],
          ] as const).map(([key, title, desc]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor={`vis-${key}`}>{title}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch id={`vis-${key}`} checked={visibility[key]} onCheckedChange={(v) => toggle(key, v)} disabled={!canEdit || savingVis} />
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change default commission to {Number.isNaN(parsed) ? '' : `${parsed}%`}?</AlertDialogTitle>
            <AlertDialogDescription>
              From now on, new orders without an event or organizer rule will be charged {parsed}% (currently {saved}%). Past orders are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); save(); }} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
