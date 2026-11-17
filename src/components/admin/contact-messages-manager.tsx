'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Mail, Loader2, Trash2, Send, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
  updateContactMessage, replyToContactMessage, deleteContactMessage,
} from '@/actions/contact-actions';

type Status = 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';

interface Msg {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string | null;
  topic: string;
  subject: string;
  message: string;
  status: Status;
  adminNote: string | null;
  repliedAt: string | null;
}

interface Props {
  data: {
    messages: Msg[];
    total: number;
    counts: Record<Status, number>;
    page: number;
    totalPages: number;
  };
  filters: { status?: string; search?: string };
  openId?: string;
}

const STATUS_STYLE: Record<Status, string> = {
  NEW: 'bg-red-100 text-red-800 hover:bg-red-100',
  READ: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  REPLIED: 'bg-green-100 text-green-800 hover:bg-green-100',
  ARCHIVED: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
};

export function ContactMessagesManager({ data, filters, openId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState(filters.search ?? '');
  const [selected, setSelected] = useState<Msg | null>(null);
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const go = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { status: filters.status, search: filters.search, ...patch };
    Object.entries(next).forEach(([k, v]) => {
      if (v && v !== 'ALL') p.set(k, v);
    });
    router.push(`${pathname}?${p.toString()}`);
  };

  const open = (m: Msg) => {
    setSelected(m);
    setNote(m.adminNote ?? '');
    setReply('');
    if (m.status === 'NEW') {
      updateContactMessage(m.id, { status: 'READ' }).then(() => router.refresh());
    }
  };

  // Deep link from the notification email
  useEffect(() => {
    if (!openId) return;
    const m = data.messages.find((x) => x.id === openId);
    if (m) open(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

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

  const cards: { key: 'ALL' | Status; label: string; value: number }[] = [
    { key: 'NEW', label: 'New', value: data.counts.NEW },
    { key: 'READ', label: 'Read', value: data.counts.READ },
    { key: 'REPLIED', label: 'Replied', value: data.counts.REPLIED },
    { key: 'ARCHIVED', label: 'Archived', value: data.counts.ARCHIVED },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => go({ status: filters.status === c.key ? 'ALL' : c.key, page: undefined })}
            className="text-left"
          >
            <Card className={filters.status === c.key ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="text-sm text-muted-foreground">{c.label}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          go({ search: search.trim() || undefined, page: undefined });
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, subject or message" className="pl-9" />
        </div>
        <Select value={filters.status || 'ALL'} onValueChange={(v) => go({ status: v, page: undefined })}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="READ">Read</SelectItem>
            <SelectItem value="REPLIED">Replied</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Search</Button>
      </form>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="hidden md:table-cell">Topic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.messages.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No messages found.
                </TableCell>
              </TableRow>
            )}
            {data.messages.map((m) => (
              <TableRow key={m.id} className="cursor-pointer" onClick={() => open(m)}>
                <TableCell>
                  <div className={m.status === 'NEW' ? 'font-semibold' : ''}>{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <div className={`truncate ${m.status === 'NEW' ? 'font-semibold' : ''}`}>{m.subject}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.message}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{m.topic}</TableCell>
                <TableCell><Badge className={STATUS_STYLE[m.status]}>{m.status.toLowerCase()}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell whitespace-nowrap text-sm">
                  {formatLagosTime(m.createdAt, 'MMM d, h:mm a')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data.total} message{data.total === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => go({ page: String(data.page - 1) })}>Previous</Button>
          <span>Page {data.page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={data.page >= data.totalPages} onClick={() => go({ page: String(data.page + 1) })}>Next</Button>
        </div>
      </div>

      {/* Message detail */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{selected.subject}</DialogTitle>
                <DialogDescription>
                  {selected.name} ({selected.email}
                  {selected.phone ? `, ${selected.phone}` : ''}) · {selected.topic} · {formatLagosTime(selected.createdAt, 'MMM d, yyyy h:mm a')}
                </DialogDescription>
              </DialogHeader>

              <div className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">{selected.message}</div>

              <div className="grid gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Status</span>
                  <Select
                    value={selected.status}
                    onValueChange={(v) =>
                      run(() => updateContactMessage(selected.id, { status: v as Status }), 'Status updated', () =>
                        setSelected({ ...selected, status: v as Status })
                      )
                    }
                  >
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="READ">Read</SelectItem>
                      <SelectItem value="REPLIED">Replied</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  {selected.repliedAt && (
                    <span className="text-xs text-muted-foreground">
                      Replied {formatLagosTime(selected.repliedAt, 'MMM d, h:mm a')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="reply">Reply by email</label>
                  <Textarea id="reply" rows={5} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Write your reply to ${selected.name}`} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      disabled={pending || reply.trim().length < 2}
                      onClick={() =>
                        run(() => replyToContactMessage(selected.id, reply), 'Reply sent', () => {
                          setReply('');
                          setSelected({ ...selected, status: 'REPLIED' });
                        })
                      }
                    >
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send reply
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}>
                        <Mail className="h-4 w-4" /> Open in mail app
                      </a>
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="note">Private note</label>
                  <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only admins can see this" />
                  <Button className="mt-2" variant="outline" disabled={pending || note === (selected.adminNote ?? '')}
                    onClick={() => run(() => updateContactMessage(selected.id, { adminNote: note }), 'Note saved', () => setSelected({ ...selected, adminNote: note }))}>
                    Save note
                  </Button>
                </div>

                <div className="flex justify-between border-t pt-4">
                  <Button variant="outline" disabled={pending || selected.status === 'ARCHIVED'}
                    onClick={() => run(() => updateContactMessage(selected.id, { status: 'ARCHIVED' }), 'Archived', () => setSelected(null))}>
                    <Archive className="h-4 w-4" /> Archive
                  </Button>
                  <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>This removes it permanently. Archive it instead if you may need it later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selected && run(() => deleteContactMessage(selected.id), 'Message deleted', () => { setSelected(null); setConfirmDelete(false); })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
