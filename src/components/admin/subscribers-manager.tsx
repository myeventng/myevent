'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Download, UserPlus, Send, Trash2, Loader2, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatLagosTime } from '@/lib/utils';
import {
  addSubscribers, deleteSubscriber, exportSubscribersCsv, sendNewsletter, setSubscriberStatus,
} from '@/actions/newsletter-actions';

interface Sub {
  id: string;
  email: string;
  status: 'ACTIVE' | 'UNSUBSCRIBED';
  source: string | null;
  subscribedAt: string;
  unsubscribedAt: string | null;
}
interface Campaign {
  id: string;
  createdAt: string;
  subject: string;
  sentCount: number;
  failedCount: number;
}
interface Props {
  data: {
    subscribers: Sub[];
    campaigns: Campaign[];
    total: number;
    active: number;
    unsubscribed: number;
    page: number;
    totalPages: number;
  };
  filters: { status?: string; search?: string };
}

export function SubscribersManager({ data, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState(filters.search ?? '');
  const [addOpen, setAddOpen] = useState(false);
  const [addText, setAddText] = useState('');
  const [sendOpen, setSendOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);
  const [toDelete, setToDelete] = useState<Sub | null>(null);

  const go = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { status: filters.status, search: filters.search, ...patch };
    Object.entries(next).forEach(([k, v]) => {
      if (v && v !== 'ALL') p.set(k, v);
    });
    router.push(`${pathname}?${p.toString()}`);
  };

  const run = (fn: () => Promise<{ success: boolean; message?: string }>, ok: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.success) {
        toast.success(r.message || ok);
        after?.();
        router.refresh();
      } else {
        toast.error(r.message || 'Something went wrong');
      }
    });

  const exportCsv = () =>
    start(async () => {
      const r = await exportSubscribersCsv();
      if (!r.success || !r.data) {
        toast.error(r.success ? 'Nothing to export' : r.message);
        return;
      }
      const blob = new Blob([r.data.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `myevent-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });

  const payload = { subject, body, buttonLabel, buttonUrl };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{data.active}</div><div className="text-sm text-muted-foreground">Active subscribers</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{data.unsubscribed}</div><div className="text-sm text-muted-foreground">Unsubscribed</div></CardContent></Card>
        <Card className="col-span-2 md:col-span-1"><CardContent className="p-4"><div className="text-2xl font-bold">{data.campaigns.length}</div><div className="text-sm text-muted-foreground">Recent newsletters</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setSendOpen(true)}><Send className="h-4 w-4" /> Send newsletter</Button>
        <Button variant="outline" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" /> Add emails</Button>
        <Button variant="outline" onClick={exportCsv} disabled={pending}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); go({ search: search.trim() || undefined, page: undefined }); }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email" className="pl-9" />
        </div>
        <Select value={filters.status || 'ALL'} onValueChange={(v) => go({ status: v, page: undefined })}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="UNSUBSCRIBED">Unsubscribed</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Search</Button>
      </form>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="hidden md:table-cell">Subscribed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.subscribers.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No subscribers found.</TableCell></TableRow>
            )}
            {data.subscribers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.email}</TableCell>
                <TableCell>
                  <Badge className={s.status === 'ACTIVE' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-100'}>
                    {s.status === 'ACTIVE' ? 'active' : 'unsubscribed'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{s.source ?? '-'}</TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm">{formatLagosTime(s.subscribedAt, 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button
                    size="sm" variant="ghost" disabled={pending}
                    onClick={() => run(() => setSubscriberStatus(s.id, s.status === 'ACTIVE' ? 'UNSUBSCRIBED' : 'ACTIVE'), 'Updated')}
                  >
                    {s.status === 'ACTIVE' ? <><UserX className="h-4 w-4" /> Unsubscribe</> : <><UserCheck className="h-4 w-4" /> Resubscribe</>}
                  </Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${s.email}`} onClick={() => setToDelete(s)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data.total} subscriber{data.total === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => go({ page: String(data.page - 1) })}>Previous</Button>
          <span>Page {data.page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={data.page >= data.totalPages} onClick={() => go({ page: String(data.page + 1) })}>Next</Button>
        </div>
      </div>

      {data.campaigns.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Sent newsletters</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                <span className="font-medium">{c.subject}</span>
                <span className="text-muted-foreground">
                  {formatLagosTime(c.createdAt, 'MMM d, yyyy h:mm a')} · {c.sentCount} sent{c.failedCount ? `, ${c.failedCount} failed` : ''}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add emails */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add subscribers</DialogTitle>
            <DialogDescription>Paste one or more email addresses, separated by commas, spaces or new lines. Only add people who agreed to receive emails.</DialogDescription>
          </DialogHeader>
          <Textarea rows={6} value={addText} onChange={(e) => setAddText(e.target.value)} placeholder="name@example.com" />
          <Button disabled={pending || !addText.trim()} onClick={() => run(() => addSubscribers(addText), 'Added', () => { setAddText(''); setAddOpen(false); })}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add to list
          </Button>
        </DialogContent>
      </Dialog>

      {/* Compose */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Send newsletter</DialogTitle>
            <DialogDescription>Goes to all {data.active} active subscribers. Each email has its own unsubscribe link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nl-subject">Subject</Label>
              <Input id="nl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nl-body">Message</Label>
              <Textarea id="nl-body" rows={9} value={body} onChange={(e) => setBody(e.target.value)} placeholder={'Leave a blank line between paragraphs.'} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="nl-btn">Button text (optional)</Label>
                <Input id="nl-btn" value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} placeholder="Get tickets" />
              </div>
              <div>
                <Label htmlFor="nl-url">Button link (optional)</Label>
                <Input id="nl-url" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://myevent.com.ng/events" />
              </div>
            </div>

            <div className="rounded-md border p-3">
              <Label htmlFor="nl-test">Send a test first</Label>
              <div className="mt-1 flex gap-2">
                <Input id="nl-test" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="your@email.com" />
                <Button variant="outline" disabled={pending}
                  onClick={() => run(() => sendNewsletter({ ...payload, testOnly: true, testEmail }), 'Test sent')}>
                  Send test
                </Button>
              </div>
            </div>

            <Button className="w-full" disabled={pending || data.active === 0 || subject.trim().length < 3 || body.trim().length < 10} onClick={() => setConfirmSend(true)}>
              <Send className="h-4 w-4" /> Send to {data.active} subscriber{data.active === 1 ? '' : 's'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {data.active} subscribers?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Keep this page open until it finishes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => run(() => sendNewsletter(payload), 'Newsletter sent', () => { setSendOpen(false); setSubject(''); setBody(''); setButtonLabel(''); setButtonUrl(''); })}>
              Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.email}?</AlertDialogTitle>
            <AlertDialogDescription>They are removed from the list. If they only want to stop emails, unsubscribe them instead so they are not re-added by mistake.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && run(() => deleteSubscriber(toDelete.id), 'Deleted', () => setToDelete(null))}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
