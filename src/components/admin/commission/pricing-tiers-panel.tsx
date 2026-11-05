'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createPricingTier, deletePricingTier, listPricingTiers, updatePricingTier } from '@/actions/admin-ticket-generation.actions';
import { describeRange } from '@/lib/ticket-generation/pricing';

type Tier = { id: string; label: string | null; minQuantity: number; maxQuantity: number | null; feeNaira: number; isActive: boolean };
type Gap = { from: number; to: number | null };

const naira = (n: number) => (n === 0 ? 'Free' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n));

export function PricingTiersPanel({ canEdit }: { canEdit: boolean }) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Tier | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Tier | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ label: '', min: '', max: '', fee: '', active: true });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await listPricingTiers();
    if (r.success) { setTiers(r.data.tiers); setGaps(r.data.gaps); } else setError(r.message);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (t: Tier | 'new') => {
    setFormError(null);
    setForm(t === 'new' ? { label: '', min: '', max: '', fee: '0', active: true } : { label: t.label ?? '', min: String(t.minQuantity), max: t.maxQuantity === null ? '' : String(t.maxQuantity), fee: String(t.feeNaira), active: t.isActive });
    setEditing(t);
  };

  const submit = () =>
    start(async () => {
      setFormError(null);
      const payload = {
        label: form.label || null,
        minQuantity: Number(form.min),
        maxQuantity: form.max.trim() === '' ? null : Number(form.max),
        feeNaira: Number(form.fee),
        isActive: form.active,
      };
      if (!Number.isInteger(payload.minQuantity) || payload.minQuantity < 1) return setFormError('Minimum quantity must be a whole number of at least 1');
      if (payload.maxQuantity !== null && (!Number.isInteger(payload.maxQuantity) || payload.maxQuantity < payload.minQuantity)) return setFormError('Maximum must be a whole number not lower than the minimum (leave empty for no limit)');
      if (!Number.isFinite(payload.feeNaira) || payload.feeNaira < 0) return setFormError('Fee must be 0 or more');
      const r = editing === 'new' ? await createPricingTier(payload) : await updatePricingTier((editing as Tier).id, payload);
      if (r.success) { toast.success(r.message ?? 'Saved'); setEditing(null); load(); } else setFormError(r.message);
    });

  const remove = () =>
    start(async () => {
      if (!deleting) return;
      const r = await deletePricingTier(deleting.id);
      if (r.success) { toast.success(r.message ?? 'Deleted'); setDeleting(null); load(); } else toast.error(r.message);
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Physical ticket generation pricing</CardTitle>
          <CardDescription>
            What an organizer pays (to the platform) to generate a batch, based on how many codes. Ranges may not overlap. Changes affect new batches only.
          </CardDescription>
        </div>
        {canEdit && <Button size="sm" onClick={() => open('new')}><Plus className="mr-1 h-4 w-4" />Add tier</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : error ? (
          <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="flex items-center justify-between">{error}<Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-2 h-3 w-3" />Retry</Button></AlertDescription></Alert>
        ) : tiers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No pricing tiers yet. Organizers cannot generate tickets until at least one active tier covers a quantity. Run <code>npm run seed:ticket-pricing</code> or add tiers here.
          </div>
        ) : (
          <>
            {gaps.length > 0 && (
              <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>
                Quantities not covered by an active tier: {gaps.map((g) => describeRange({ minQuantity: g.from, maxQuantity: g.to })).join('; ')}. Organizers cannot generate those amounts.
              </AlertDescription></Alert>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Range</TableHead><TableHead>Label</TableHead><TableHead>Fee</TableHead><TableHead>Status</TableHead>{canEdit && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
                <TableBody>
                  {tiers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">{describeRange(t)}</TableCell>
                      <TableCell>{t.label ?? '—'}</TableCell>
                      <TableCell className="font-medium">{naira(t.feeNaira)}</TableCell>
                      <TableCell><Badge variant={t.isActive ? 'default' : 'secondary'}>{t.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      {canEdit && (
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="icon" variant="ghost" aria-label="Edit tier" onClick={() => open(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label="Delete tier" onClick={() => setDeleting(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && !pending && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Add pricing tier' : 'Edit pricing tier'}</DialogTitle>
            <DialogDescription>Leave the maximum empty for “and above”. A fee of 0 makes the range free.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5"><Label htmlFor="t-label">Label (optional)</Label><Input id="t-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label htmlFor="t-min">From (codes)</Label><Input id="t-min" inputMode="numeric" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label htmlFor="t-max">To (codes)</Label><Input id="t-max" inputMode="numeric" placeholder="No limit" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label htmlFor="t-fee">Fee (₦)</Label><Input id="t-fee" inputMode="decimal" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch id="t-active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label htmlFor="t-active">Active</Label></div>
            {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={pending}>Cancel</Button>
            <Button onClick={submit} disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && !pending && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tier?</AlertDialogTitle>
            <AlertDialogDescription>{deleting && `${describeRange(deleting)} (${naira(deleting.feeNaira)})`}. Past batches and payments keep their recorded price. Quantities in this range can’t be generated until another tier covers them.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} disabled={pending}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
