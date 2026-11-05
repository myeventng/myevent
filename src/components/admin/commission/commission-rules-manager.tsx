'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertCircle, History, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  createCommissionRule, deleteCommissionRule, getCommissionRuleAudit, listCommissionRules,
  searchCommissionTargets, setCommissionRuleActive, updateCommissionRule,
} from '@/actions/commission.actions';

type Scope = 'ORGANIZER' | 'EVENT';
type Target = { id: string; label: string; sub?: string };
type Rule = {
  id: string; name: string | null; scope: Scope; percentage: number; startsAt: string | null; endsAt: string | null; isActive: boolean; note: string | null;
  organizers: { id: string; name: string | null; email: string }[]; events: { id: string; title: string; slug: string | null }[];
  createdBy: string | null; updatedBy: string | null; createdAt: string; updatedAt: string;
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : null);
// <input type="datetime-local"> works in local time; the server stores UTC instants.
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function statusOf(r: Rule): { label: string; tone: 'default' | 'secondary' | 'outline' } {
  const now = Date.now();
  if (!r.isActive) return { label: 'Inactive', tone: 'secondary' };
  if (r.startsAt && new Date(r.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'outline' };
  if (r.endsAt && new Date(r.endsAt).getTime() <= now) return { label: 'Expired', tone: 'secondary' };
  return { label: 'Active', tone: 'default' };
}

export function CommissionRulesManager({ scope }: { scope: Scope }) {
  const noun = scope === 'ORGANIZER' ? 'organizer' : 'event';
  const [rules, setRules] = useState<Rule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'scheduled' | 'expired'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Rule | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Rule | null>(null);
  const [audit, setAudit] = useState<{ rule: Rule; rows: any[] | null } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await listCommissionRules({ scope, search: debounced || undefined, status, page, pageSize });
    if (r.success) { setRules(r.data.rules as Rule[]); setTotal(r.data.total); } else setError(r.message);
    setLoading(false);
  }, [scope, debounced, status, page]);
  useEffect(() => { load(); }, [load]);

  const toggleActive = (r: Rule, next: boolean) =>
    start(async () => {
      const res = await setCommissionRuleActive(r.id, next);
      if (res.success) { toast.success(res.message); load(); } else toast.error(res.message);
    });
  const confirmDelete = () =>
    start(async () => {
      if (!deleting) return;
      const res = await deleteCommissionRule(deleting.id);
      if (res.success) { toast.success(res.message); setDeleting(null); load(); } else toast.error(res.message);
    });
  const openAudit = async (rule: Rule) => {
    setAudit({ rule, rows: null });
    const r = await getCommissionRuleAudit(rule.id);
    setAudit({ rule, rows: r.success ? r.data : [] });
    if (!r.success) toast.error(r.message);
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const targetsOf = (r: Rule) => (scope === 'ORGANIZER' ? r.organizers.map((o) => o.name || o.email) : r.events.map((e) => e.title));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{scope === 'ORGANIZER' ? 'Organizer commission rules' : 'Event commission rules'}</CardTitle>
          <CardDescription>
            {scope === 'ORGANIZER'
              ? 'Override the default commission for one or more organizers, optionally for a date range. An event rule beats an organizer rule.'
              : 'Override the commission for specific events. This is the highest-priority rule.'}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing('new')}><Plus className="mr-1 h-4 w-4" />New rule</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder={`Search by rule name or ${noun}…`} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search rules" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active now</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem><SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : error ? (
          <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="flex items-center justify-between">{error}<Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-2 h-3 w-3" />Retry</Button></AlertDescription></Alert>
        ) : rules.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            {debounced || status !== 'all' ? 'No rules match your filters.' : `No ${noun} rules yet. Every ${noun} currently uses ${scope === 'EVENT' ? 'the organizer or default commission' : 'the default commission'}.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Rule</TableHead><TableHead>{scope === 'ORGANIZER' ? 'Organizers' : 'Events'}</TableHead><TableHead>Rate</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rules.map((r) => {
                  const st = statusOf(r);
                  const t = targetsOf(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-48"><div className="truncate font-medium">{r.name || 'Untitled rule'}</div><div className="text-xs text-muted-foreground">by {r.updatedBy ?? r.createdBy ?? 'unknown'}</div></TableCell>
                      <TableCell className="max-w-64"><div className="truncate" title={t.join(', ')}>{t.slice(0, 2).join(', ')}{t.length > 2 ? ` +${t.length - 2} more` : ''}</div></TableCell>
                      <TableCell className="font-semibold">{r.percentage}%</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{r.startsAt || r.endsAt ? <>{fmt(r.startsAt) ?? 'Always'} → {fmt(r.endsAt) ?? 'No end'}</> : 'Always'}</TableCell>
                      <TableCell><Badge variant={st.tone}>{st.label}</Badge></TableCell>
                      <TableCell><Switch checked={r.isActive} disabled={pending} onCheckedChange={(v) => toggleActive(r, v)} aria-label={`Toggle ${r.name ?? 'rule'}`} /></TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button size="icon" variant="ghost" aria-label="History" onClick={() => openAudit(r)}><History className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Edit rule" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Delete rule" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {total > pageSize && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {pages} · {total} rules</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>

      {editing && <RuleDialog scope={scope} rule={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && !pending && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name || 'this rule'}”?</AlertDialogTitle>
            <AlertDialogDescription>Orders already placed keep the commission they were charged. Future orders will fall back to the next rule or the default. Consider deactivating instead to keep the history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!audit} onOpenChange={(o) => !o && setAudit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Change history</DialogTitle><DialogDescription>{audit?.rule.name || 'Rule'} · who changed what, and when.</DialogDescription></DialogHeader>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {audit?.rows === null ? <Skeleton className="h-24 w-full" /> : audit?.rows?.length === 0 ? <p className="text-sm text-muted-foreground">No history recorded.</p> : audit?.rows?.map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">
                <div className="flex justify-between"><Badge variant="outline">{a.action}</Badge><span className="text-xs text-muted-foreground">{fmt(a.at)} · {a.by}</span></div>
                {a.newValues && <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(a.newValues, null, 1)}</pre>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RuleDialog({ scope, rule, onClose, onSaved }: { scope: Scope; rule: Rule | null; onClose: () => void; onSaved: () => void }) {
  const initialTargets: Target[] = rule
    ? scope === 'ORGANIZER' ? rule.organizers.map((o) => ({ id: o.id, label: o.name || o.email, sub: o.email })) : rule.events.map((e) => ({ id: e.id, label: e.title }))
    : [];
  const [name, setName] = useState(rule?.name ?? '');
  const [pct, setPct] = useState(rule ? String(rule.percentage) : '');
  const [startsAt, setStartsAt] = useState(toLocalInput(rule?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(rule?.endsAt ?? null));
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [note, setNote] = useState(rule?.note ?? '');
  const [targets, setTargets] = useState<Target[]>(initialTargets);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Target[]>([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const seq = useRef(0);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const my = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchCommissionTargets({ scope, query: q });
      if (my === seq.current) { setResults(r.success ? r.data : []); setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, scope]);

  const submit = () =>
    start(async () => {
      setErr(null);
      const percentage = pct.trim() === '' ? NaN : Number(pct);
      if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) return setErr('Enter a commission between 0 and 100');
      if (targets.length === 0) return setErr(`Select at least one ${scope === 'ORGANIZER' ? 'organizer' : 'event'}`);
      const payload = { scope, name: name || null, percentage, startsAt: fromLocalInput(startsAt), endsAt: fromLocalInput(endsAt), isActive, note: note || null, targetIds: targets.map((t) => t.id) };
      const res = rule ? await updateCommissionRule(rule.id, payload) : await createCommissionRule(payload);
      if (res.success) { toast.success(res.message ?? 'Saved'); onSaved(); } else setErr(res.message);
    });

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit commission rule' : 'New commission rule'}</DialogTitle>
          <DialogDescription>Applies to orders created while the rule is active. Existing orders are never changed.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label htmlFor="r-name">Name (optional)</Label><Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></div>
          <div className="grid gap-1.5"><Label htmlFor="r-pct">Commission (%)</Label><Input id="r-pct" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} className="max-w-32" /></div>

          <div className="grid gap-1.5">
            <Label>{scope === 'ORGANIZER' ? 'Organizers' : 'Events'}</Label>
            <div className="flex flex-wrap gap-1.5">
              {targets.map((t) => (
                <Badge key={t.id} variant="secondary" className="gap-1">{t.label}<button type="button" aria-label={`Remove ${t.label}`} onClick={() => setTargets(targets.filter((x) => x.id !== t.id))}><X className="h-3 w-3" /></button></Badge>
              ))}
            </div>
            <Input placeholder={`Search ${scope === 'ORGANIZER' ? 'organizers by name or email' : 'events by title'}…`} value={q} onChange={(e) => setQ(e.target.value)} />
            {q.trim() && (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {searching ? <p className="p-3 text-sm text-muted-foreground">Searching…</p> : results.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No matches</p> : results.filter((r) => !targets.some((t) => t.id === r.id)).map((r) => (
                  <button type="button" key={r.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setTargets([...targets, r]); setQ(''); }}>
                    <div className="font-medium">{r.label}</div>{r.sub && <div className="text-xs text-muted-foreground">{r.sub}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="r-start">Starts (optional)</Label><Input id="r-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="r-end">Ends (optional)</Label><Input id="r-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">Leave both empty for “always”. The end moment itself is not included.</p>
          <div className="grid gap-1.5"><Label htmlFor="r-note">Internal note</Label><Textarea id="r-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} /></div>
          <div className="flex items-center gap-2"><Switch id="r-active" checked={isActive} onCheckedChange={setIsActive} /><Label htmlFor="r-active">Active</Label></div>
          {err && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{err}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{rule ? 'Save changes' : 'Create rule'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
