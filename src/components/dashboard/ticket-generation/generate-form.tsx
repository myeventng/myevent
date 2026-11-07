'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Info, Palette, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { createGenerationBatch, getGenerationQuote } from '@/actions/ticket-generation.actions';
import { formatNaira } from '@/lib/money';
import { BatchHistory } from './batch-history';

export type GenerateFormProps = {
  eventId: string;
  eventTitle: string;
  eventEnded?: boolean;
  attendeeRemaining?: number | null;
  ticketTypes: { id: string; name: string; available: number }[];
  defaults: { codeFormat: 'QR' | 'BARCODE'; design: 'BRANDED' | 'CODES_ONLY'; ticketsPerPage: number; showSerial: boolean; organizerLabel: string | null };
  layouts: { BRANDED: number[]; CODES_ONLY: number[] };
  tiers: { id: string; label: string | null; minQuantity: number; maxQuantity: number | null; feeKobo: number }[];
  max: number;
  highlightBatchId?: string;
  paymentFlag?: string;
};

export function GenerateForm(p: GenerateFormProps) {
  const [ticketTypeId, setTicketTypeId] = useState((p.ticketTypes.find((t) => t.available > 0) ?? p.ticketTypes[0])?.id ?? '');
  const [quantity, setQuantity] = useState('100');
  const [codeFormat, setCodeFormat] = useState<'QR' | 'BARCODE'>(p.defaults.codeFormat);
  const [design, setDesign] = useState<'BRANDED' | 'CODES_ONLY'>(p.defaults.design);
  const [perPage, setPerPage] = useState(p.defaults.ticketsPerPage);
  const [showSerial, setShowSerial] = useState(p.defaults.showSerial);
  const [label, setLabel] = useState(p.defaults.organizerLabel ?? '');
  const [quote, setQuote] = useState<{ feeLabel: string; isFree: boolean; tierLabel: string | null; feeKobo: number } | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, start] = useTransition();

  const qty = Number.parseInt(quantity, 10);
  // Hard ceiling = the smallest of: per-batch cap, stock left on this ticket type, attendee capacity left.
  const selectedType = p.ticketTypes.find((t) => t.id === ticketTypeId);
  const stockLeft = selectedType?.available ?? 0;
  const capacityLeft = p.attendeeRemaining ?? Number.POSITIVE_INFINITY;
  const maxAllowed = Math.max(0, Math.min(p.max, stockLeft, capacityLeft));
  const limitedBy: 'batch' | 'stock' | 'capacity' =
    maxAllowed === capacityLeft && capacityLeft < Math.min(p.max, stockLeft) ? 'capacity'
    : maxAllowed === stockLeft && stockLeft < p.max ? 'stock' : 'batch';
  const fmt = (n: number) => n.toLocaleString('en-NG');
  const qtyError =
    !quantity ? 'Enter how many tickets to generate'
    : !Number.isInteger(qty) || qty < 1 ? 'Quantity must be at least 1'
    : maxAllowed === 0 ? (capacityLeft === 0 ? 'This event has reached its attendee limit' : 'No physical tickets are allocated to this ticket type. Set a physical quantity when editing the event\'s ticket types.')
    : qty > maxAllowed ? (limitedBy === 'capacity' ? `Only ${fmt(maxAllowed)} more attendees fit under this event's limit`
        : limitedBy === 'stock' ? `Only ${fmt(maxAllowed)} physical tickets left for this ticket type`
        : `Maximum per batch is ${fmt(maxAllowed)}`)
    : null;
  const qtyValid = qtyError === null;
  const layouts = p.layouts[design];
  useEffect(() => { if (!layouts.includes(perPage)) setPerPage(layouts.includes(4) ? 4 : layouts[0]); }, [layouts, perPage]);

  // Live price (advisory; the server recalculates when the batch is created).
  useEffect(() => {
    if (!qtyValid) { setQuote(null); setQuoteErr(null); return; }
    setQuoteErr(null);
    const t = setTimeout(async () => {
      const r = await getGenerationQuote(p.eventId, qty);
      if (r.success) setQuote(r.data); else { setQuote(null); setQuoteErr(r.message); }
    }, 300);
    return () => clearTimeout(t);
  }, [qty, qtyValid, p.eventId]);

  useEffect(() => {
    if (p.paymentFlag === 'cancelled') toast.info('Payment was not completed. You can pay from the batch list below.');
  }, [p.paymentFlag]);

  const previewSrc = useMemo(() => {
    if (!ticketTypeId) return null;
    const qs = new URLSearchParams({ eventId: p.eventId, ticketTypeId, codeFormat, design, ticketsPerPage: String(perPage), showSerial: String(showSerial) });
    if (label.trim()) qs.set('organizerLabel', label.trim());
    return `/api/ticket-generation/preview?${qs}#toolbar=0&navpanes=0`;
  }, [p.eventId, ticketTypeId, codeFormat, design, perPage, showSerial, label]);

  const submit = () => start(async () => {
    setConfirmOpen(false);
    const r = await createGenerationBatch({ eventId: p.eventId, ticketTypeId, quantity: qty, codeFormat, design, ticketsPerPage: perPage, showSerial, organizerLabel: label.trim() || null });
    if (!r.success) { toast.error(r.message); return; }
    if (r.data.requiresPayment && r.data.authorizationUrl) { window.location.href = r.data.authorizationUrl; return; }
    toast.success('Batch created – generating now');
    setRefreshKey((k) => k + 1);
  });

  const canSubmit = !p.eventEnded && !!ticketTypeId && qtyValid && !!quote && !pending;

  return (
    <div className="space-y-6">
      {p.eventEnded && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>This event has already ended, so new physical tickets can&apos;t be generated. Your earlier batches and downloads below are unaffected.</AlertDescription>
        </Alert>
      )}
      {p.ticketTypes.length === 0 ? (
        <Alert><Info className="h-4 w-4" /><AlertDescription>This event has no ticket types yet. Add a ticket type before generating physical tickets.</AlertDescription></Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Generate physical tickets</CardTitle><CardDescription>{p.eventTitle}</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ticket type</Label>
                  <Select value={ticketTypeId} onValueChange={setTicketTypeId}>
                    <SelectTrigger><SelectValue placeholder="Select ticket type" /></SelectTrigger>
                    <SelectContent>{p.ticketTypes.map((t) => <SelectItem key={t.id} value={t.id} disabled={t.available < 1}>{t.name} · {t.available < 1 ? 'no physical stock' : `${fmt(t.available)} physical left`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity</Label>
                  <Input id="qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ''))} aria-invalid={!qtyValid} />
                  {qtyError ? (
                    <p className="text-xs text-destructive" role="alert">{qtyError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">You can generate up to <b>{fmt(maxAllowed)}</b> now.</p>
                  )}
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p>Per batch limit: {fmt(p.max)}</p>
                    <p>Physical tickets left for this type: {fmt(stockLeft)}</p>
                    <p>Attendee capacity left: {p.attendeeRemaining == null ? 'no limit' : fmt(p.attendeeRemaining)}</p>
                  </div>
                  {maxAllowed > 0 && qty !== maxAllowed && (
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setQuantity(String(maxAllowed))}>Use maximum ({fmt(maxAllowed)})</Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Code type</Label>
                <RadioGroup value={codeFormat} onValueChange={(v) => setCodeFormat(v as 'QR' | 'BARCODE')} className="grid grid-cols-2 gap-3">
                  {(['QR', 'BARCODE'] as const).map((f) => (
                    <Label key={f} htmlFor={`fmt-${f}`} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 has-[:checked]:border-primary">
                      <RadioGroupItem id={`fmt-${f}`} value={f} />{f === 'QR' ? 'QR code' : 'Barcode (Code 128)'}
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Design</Label>
                <RadioGroup value={design} onValueChange={(v) => setDesign(v as 'BRANDED' | 'CODES_ONLY')} className="space-y-2">
                  <Label htmlFor="d-brand" className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-primary">
                    <RadioGroupItem id="d-brand" value="BRANDED" className="mt-1" />
                    <span><span className="flex items-center gap-2 font-medium"><Palette className="h-4 w-4" />Branded ticket</span><span className="block text-xs font-normal text-muted-foreground">Ready-to-print tickets with event name, ticket type and platform branding.</span></span>
                  </Label>
                  <Label htmlFor="d-codes" className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-primary">
                    <RadioGroupItem id="d-codes" value="CODES_ONLY" className="mt-1" />
                    <span><span className="flex items-center gap-2 font-medium"><Layers className="h-4 w-4" />Codes only (for your designer)</span><span className="block text-xs font-normal text-muted-foreground">No branding, no event text – only the {codeFormat === 'QR' ? 'QR codes' : 'barcodes'} (and optional serial). Also gives you vector SVG files so a graphic designer can drop each code into your own ticket artwork.</span></span>
                  </Label>
                </RadioGroup>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tickets per page</Label>
                  <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{layouts.map((n) => <SelectItem key={n} value={String(n)}>{n} per page</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-end justify-between gap-3 rounded-md border p-3">
                  <Label htmlFor="serial" className="cursor-pointer">Print serial number</Label>
                  <Switch id="serial" checked={showSerial} onCheckedChange={setShowSerial} />
                </div>
              </div>

              {design === 'BRANDED' && (
                <div className="space-y-2">
                  <Label htmlFor="lbl">Organizer name on ticket (optional)</Label>
                  <Input id="lbl" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Acme Events" />
                </div>
              )}

              <div className="rounded-md bg-muted p-4">
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Generation fee</span><span className="text-xl font-semibold">{quote ? quote.feeLabel : '—'}</span></div>
                {quote?.tierLabel && <p className="mt-1 text-xs text-muted-foreground">{quote.tierLabel}</p>}
                {quoteErr && <p className="mt-1 text-xs text-destructive">{quoteErr}</p>}
              </div>

              <Button className="w-full" disabled={!canSubmit} onClick={() => (quote && !quote.isFree ? setConfirmOpen(true) : submit())}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{quote && !quote.isFree ? `Pay ${quote.feeLabel} & generate` : 'Generate tickets'}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Preview</CardTitle><CardDescription>Sample codes only – these cannot be scanned or redeemed.</CardDescription></CardHeader>
              <CardContent>
                {previewSrc ? <iframe key={previewSrc} title="Ticket layout preview" src={previewSrc} className="h-[520px] w-full rounded-md border bg-white" /> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Quantity</TableHead><TableHead className="text-right">Fee</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {p.tiers.map((t) => (
                      <TableRow key={t.id} className={qtyValid && qty >= t.minQuantity && (t.maxQuantity == null || qty <= t.maxQuantity) ? 'bg-muted/60 font-medium' : undefined}>
                        <TableCell>{t.minQuantity.toLocaleString('en-NG')}{t.maxQuantity == null ? '+' : ` – ${t.maxQuantity.toLocaleString('en-NG')}`}</TableCell>
                        <TableCell className="text-right">{t.feeKobo === 0 ? 'Free' : formatNaira(t.feeKobo)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Batches for this event</CardTitle><CardDescription>Progress, downloads and usage of every batch you have generated.</CardDescription></CardHeader>
        <CardContent><BatchHistory eventId={p.eventId} highlightBatchId={p.highlightBatchId} refreshKey={refreshKey} /></CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm payment</AlertDialogTitle>
            <AlertDialogDescription>You will pay {quote?.feeLabel} to generate {qtyValid ? qty.toLocaleString('en-NG') : ''} tickets. Generation starts automatically once Paystack confirms the payment.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Back</AlertDialogCancel><AlertDialogAction onClick={submit}>Continue to Paystack</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
