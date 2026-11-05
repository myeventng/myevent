'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Download, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportGenerationPaymentsCsv, listGenerationPayments } from '@/actions/admin-ticket-generation.actions';

type Row = {
  id: string; reference: string; createdAt: string; paidAt: string | null; organizer: { id: string; name: string | null; email: string };
  eventId: string; eventTitle: string; batchId: string; batchStatus: string; quantity: number; tier: string | null;
  amountNaira: number; verifiedNaira: number | null; status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'; note: string | null;
};
const money = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(n);
const tone = (s: Row['status']) => (s === 'COMPLETED' ? 'default' : s === 'PENDING' ? 'outline' : 'secondary');

export function GenerationPaymentsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [status, setStatus] = useState<'ALL' | Row['status']>('ALL');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, startExport] = useTransition();

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const filters = useCallback(() => ({
    status, search: debounced || undefined,
    from: from ? new Date(`${from}T00:00:00`) : undefined,
    to: to ? new Date(`${to}T23:59:59.999`) : undefined,
  }), [status, debounced, from, to]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const r = await listGenerationPayments({ ...filters(), page, pageSize });
    if (r.success) { setRows(r.data.payments as Row[]); setTotal(r.data.total); setRevenue(r.data.revenueNaira); setCompleted(r.data.completedCount); } else setError(r.message);
    setLoading(false);
  }, [filters, page]);
  useEffect(() => { load(); }, [load]);

  const download = () =>
    startExport(async () => {
      const r = await exportGenerationPaymentsCsv(filters());
      if (!r.success) {
        toast.error(r.message);
        return;
      }
      const url = URL.createObjectURL(new Blob([r.data.csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = r.data.filename; a.click(); URL.revokeObjectURL(url);
      toast.success('Export ready');
    });

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Revenue (completed, current filters)</div><div className="mt-1 text-2xl font-bold">{loading ? '…' : money(revenue)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Completed payments</div><div className="mt-1 text-2xl font-bold">{loading ? '…' : completed.toLocaleString('en-NG')}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Records matching</div><div className="mt-1 text-2xl font-bold">{loading ? '…' : total.toLocaleString('en-NG')}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Label htmlFor="pg-search" className="sr-only">Search</Label>
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="pg-search" className="pl-8" placeholder="Search reference, organizer, event…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
              <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="COMPLETED">Completed</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="FAILED">Failed</SelectItem><SelectItem value="REFUNDED">Refunded</SelectItem></SelectContent>
            </Select>
            <Input type="date" aria-label="From date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <Input type="date" aria-label="To date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={download} disabled={exporting || total === 0}>{exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download CSV</Button>
          </div>

          {loading ? (
            <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : error ? (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="flex items-center justify-between">{error}<Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-2 h-3 w-3" />Retry</Button></AlertDescription></Alert>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No payments match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Organizer</TableHead><TableHead>Event</TableHead><TableHead className="text-right">Codes</TableHead><TableHead>Tier</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-xs">{new Date(p.paidAt ?? p.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                      <TableCell><div className="font-medium">{p.organizer.name ?? '—'}</div><div className="text-xs text-muted-foreground">{p.organizer.email}</div></TableCell>
                      <TableCell className="max-w-48 truncate" title={p.eventTitle}>{p.eventTitle}</TableCell>
                      <TableCell className="text-right">{p.quantity.toLocaleString('en-NG')}</TableCell>
                      <TableCell className="text-xs">{p.tier ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium">{money(p.verifiedNaira ?? p.amountNaira)}</TableCell>
                      <TableCell><Badge variant={tone(p.status)}>{p.status}</Badge>{p.note && <div className="mt-1 max-w-40 truncate text-xs text-destructive" title={p.note}>{p.note}</div>}</TableCell>
                      <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {total > pageSize && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
