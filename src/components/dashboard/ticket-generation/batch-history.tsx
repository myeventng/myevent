'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Download, FileArchive, Loader2, RefreshCw, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  advanceGeneration, cancelGenerationBatch, confirmBatchPayment, getBatchDownloadLinks, listGenerationBatches, resumeBatchPayment,
} from '@/actions/ticket-generation.actions';

type Batch = {
  id: string; createdAt: string; eventId: string; eventTitle: string; ticketType: string; quantity: number; design: 'BRANDED' | 'CODES_ONLY';
  codeFormat: 'QR' | 'BARCODE'; ticketsPerPage: number; status: string; partsDone: number; partsTotal: number; lastError: string | null;
  feeKobo: number; paymentStatus: string | null; stats: { generated: number; unused: number; validated: number; cancelled: number };
};

const STATUS: Record<string, { label: string; tone: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', tone: 'outline' }, READY: { label: 'Queued', tone: 'outline' }, GENERATING: { label: 'Generating…', tone: 'outline' },
  COMPLETED: { label: 'Ready', tone: 'default' }, FAILED: { label: 'Needs retry', tone: 'destructive' }, CANCELLED: { label: 'Cancelled', tone: 'secondary' },
};

/**
 * Lists batches and, for any that are queued/generating, drives them forward one part at a time
 * (each call is short, so it works within serverless time limits; the cron route covers closed tabs).
 */
export function BatchHistory({ eventId, highlightBatchId, refreshKey = 0 }: { eventId?: string; highlightBatchId?: string; refreshKey?: number }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const driving = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const r = await listGenerationBatches({ eventId, page, pageSize });
    if (!mounted.current) return;
    if (r.success) { setBatches(r.data.batches as Batch[]); setTotal(r.data.total); setError(null); } else setError(r.message);
    setLoading(false);
  }, [eventId, page]);
  useEffect(() => { load(); }, [load, refreshKey]);

  // Drive unfinished batches.
  useEffect(() => {
    const work = batches.filter((b) => ['READY', 'GENERATING'].includes(b.status) && !driving.current.has(b.id));
    work.forEach(async (b) => {
      driving.current.add(b.id);
      try {
        for (let i = 0; i < 2000 && mounted.current; i++) {
          const r = await advanceGeneration(b.id);
          if (!r.success) { toast.error(r.message); break; }
          setBatches((cur) => cur.map((x) => (x.id === b.id ? { ...x, status: r.data.status, partsDone: r.data.partsDone, partsTotal: r.data.partsTotal } : x)));
          if (r.data.error) { toast.error(`Generation paused: ${r.data.error}`); break; }
          if (r.data.done) { toast.success('Your tickets are ready to download'); break; }
          if (r.data.busy) await new Promise((res) => setTimeout(res, 3000));
        }
      } finally {
        driving.current.delete(b.id);
        if (mounted.current) load(true);
      }
    });
  }, [batches, load]);

  // A batch just paid for may still be PENDING_PAYMENT until verification completes.
  useEffect(() => {
    const pendingPay = batches.filter((b) => b.status === 'PENDING_PAYMENT' && b.id === highlightBatchId);
    if (pendingPay.length === 0) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      await Promise.all(pendingPay.map((b) => confirmBatchPayment(b.id)));
      await load(true);
      if (tries >= 10) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
  }, [batches, highlightBatchId, load]);

  const download = (b: Batch) => start(async () => {
    setBusyId(b.id);
    const r = await getBatchDownloadLinks(b.id);
    setBusyId(null);
    if (!r.success) { toast.error(r.message); return; }
    // Links are short-lived and private; open each part (browsers may ask to allow multiple downloads).
    r.data.parts.forEach((p, i) => setTimeout(() => window.open(p.url, '_blank', 'noopener'), i * 400));
    toast.success(`Opening ${r.data.parts.length} PDF file${r.data.parts.length === 1 ? '' : 's'}`);
  });
  const pay = (b: Batch) => start(async () => {
    const r = await resumeBatchPayment(b.id);
    if (r.success) window.location.href = r.data.authorizationUrl; else toast.error(r.message);
  });
  const cancel = (b: Batch) => start(async () => {
    const r = await cancelGenerationBatch(b.id);
    if (r.success) { toast.success(r.message); load(true); } else toast.error(r.message);
  });

  if (loading) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="flex items-center justify-between">{error}<Button size="sm" variant="outline" onClick={() => load()}><RefreshCw className="mr-2 h-3 w-3" />Retry</Button></AlertDescription></Alert>;
  if (batches.length === 0) return <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No batches yet. Generated batches will appear here with their progress and downloads.</div>;

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Created</TableHead>{!eventId && <TableHead>Event</TableHead>}<TableHead>Batch</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Generated</TableHead><TableHead className="text-right">Unused</TableHead><TableHead className="text-right">Validated</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {batches.map((b) => {
              const st = STATUS[b.status] ?? { label: b.status, tone: 'secondary' as const };
              const inProgress = b.status === 'GENERATING' || b.status === 'READY';
              return (
                <TableRow key={b.id} className={b.id === highlightBatchId ? 'bg-muted/50' : undefined}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(b.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                  {!eventId && <TableCell className="max-w-40 truncate" title={b.eventTitle}>{b.eventTitle}</TableCell>}
                  <TableCell>
                    <div className="font-medium">{b.quantity.toLocaleString('en-NG')} × {b.ticketType}</div>
                    <div className="text-xs text-muted-foreground">{b.design === 'CODES_ONLY' ? 'Codes only' : 'Branded'} · {b.codeFormat === 'QR' ? 'QR' : 'Barcode'} · {b.ticketsPerPage}/page{b.feeKobo > 0 ? ' · paid' : ' · free'}</div>
                  </TableCell>
                  <TableCell className="min-w-40">
                    <Badge variant={st.tone}>{st.label}</Badge>
                    {inProgress && b.partsTotal > 0 && <div className="mt-2"><Progress value={(b.partsDone / b.partsTotal) * 100} /><div className="mt-1 text-xs text-muted-foreground">{b.partsDone}/{b.partsTotal} files</div></div>}
                    {b.status === 'FAILED' && b.lastError && <div className="mt-1 max-w-48 truncate text-xs text-destructive" title={b.lastError}>{b.lastError}</div>}
                  </TableCell>
                  <TableCell className="text-right">{b.stats.generated.toLocaleString('en-NG')}</TableCell>
                  <TableCell className="text-right">{b.stats.unused.toLocaleString('en-NG')}</TableCell>
                  <TableCell className="text-right">{b.stats.validated.toLocaleString('en-NG')}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {b.status === 'PENDING_PAYMENT' && (<>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => pay(b)}><CreditCard className="mr-1 h-3 w-3" />Pay</Button>{' '}
                      <Button size="icon" variant="ghost" aria-label="Cancel batch" disabled={pending} onClick={() => cancel(b)}><Trash2 className="h-4 w-4" /></Button>
                    </>)}
                    {b.status === 'FAILED' && <Button size="sm" variant="outline" onClick={() => load(true).then(() => advanceGeneration(b.id).then(() => load(true)))}><RefreshCw className="mr-1 h-3 w-3" />Retry</Button>}
                    {(b.status === 'COMPLETED' || (b.partsDone > 0 && b.status !== 'PENDING_PAYMENT')) && (<>
                      <Button size="sm" variant="outline" disabled={pending && busyId === b.id} onClick={() => download(b)}>{busyId === b.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}PDF</Button>
                      {b.design === 'CODES_ONLY' && Array.from({ length: Math.min(b.partsDone, 6) }, (_, i) => (
                        <Button key={i} size="sm" variant="ghost" asChild title={`Download vector codes (SVG) – file ${i + 1}`}><a href={`/api/ticket-generation/${b.id}/svg?part=${i}`}><FileArchive className="mr-1 h-3 w-3" />SVG {b.partsTotal > 1 ? i + 1 : ''}</a></Button>
                      ))}
                    </>)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button></div>
        </div>
      )}
    </div>
  );
}
