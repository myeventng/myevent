'use client';

// src/components/admin/email-log-table.tsx
import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import {
  XCircle,
  Mail,
  Search,
  RotateCcw,
  Paperclip,
  Loader2,
  MailCheck,
  MailWarning,
  ShieldAlert,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatLagosTime } from '@/lib/utils';
import { retryEmailFromLog } from '@/actions/email-log.actions';

interface LogRow {
  id: string;
  createdAt: string;
  type: string;
  status: 'SENT' | 'DELIVERED' | 'BOUNCED' | 'COMPLAINED' | 'FAILED';
  provider: string | null;
  toEmail: string;
  subject: string;
  orderId: string | null;
  eventTitle: string | null;
  ticketIds: string[];
  attachmentCount: number;
  messageId: string | null;
  error: string | null;
  deliveredAt: string | null;
  bouncedAt: string | null;
  complainedAt: string | null;
  bounceType: string | null;
  bounceReason: string | null;
}

interface Props {
  data: {
    logs: LogRow[];
    total: number;
    counts: {
      SENT: number;
      DELIVERED: number;
      BOUNCED: number;
      COMPLAINED: number;
      FAILED: number;
    };
    page: number;
    totalPages: number;
  };
  filters: {
    status?: string;
    type?: string;
    search?: string;
    from?: string;
    to?: string;
  };
}

const TYPE_LABEL: Record<string, string> = {
  ORDER_TICKETS: 'Purchase / order',
  TICKET_RESEND: 'Single ticket resend',
};

function StatusCell({ log }: { log: LogRow }) {
  if (log.status === 'DELIVERED') {
    return (
      <div>
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <MailCheck className="mr-1 h-3 w-3" /> Delivered
        </Badge>
        {log.deliveredAt && (
          <div className="mt-1 text-xs text-muted-foreground">
            {formatLagosTime(log.deliveredAt, 'MMM d, h:mm a')}
          </div>
        )}
      </div>
    );
  }

  if (log.status === 'SENT') {
    return (
      <div>
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <Clock className="mr-1 h-3 w-3" /> Sent
        </Badge>
        <div className="mt-1 text-xs text-muted-foreground">
          {log.provider === 'ses'
            ? 'Awaiting delivery confirmation'
            : log.provider
              ? `via ${log.provider.toUpperCase()} (no delivery tracking)`
              : ''}
        </div>
      </div>
    );
  }

  if (log.status === 'BOUNCED') {
    return (
      <div>
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          <MailWarning className="mr-1 h-3 w-3" /> Bounced
        </Badge>
        {log.bounceType && (
          <div className="mt-1 text-xs text-muted-foreground">{log.bounceType}</div>
        )}
        {log.bounceReason && (
          <div
            className="mt-1 max-w-[260px] text-xs text-orange-700 line-clamp-3"
            title={log.bounceReason}
          >
            {log.bounceReason}
          </div>
        )}
      </div>
    );
  }

  if (log.status === 'COMPLAINED') {
    return (
      <div>
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          <ShieldAlert className="mr-1 h-3 w-3" /> Spam complaint
        </Badge>
        {log.bounceReason && (
          <div className="mt-1 max-w-[260px] text-xs text-purple-700">{log.bounceReason}</div>
        )}
      </div>
    );
  }

  // FAILED
  return (
    <div>
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        <XCircle className="mr-1 h-3 w-3" /> Failed
      </Badge>
      {log.error && (
        <div className="mt-1 max-w-[260px] text-xs text-red-600 line-clamp-3" title={log.error}>
          {log.error}
        </div>
      )}
    </div>
  );
}

export function EmailLogTable({ data, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [retrying, setRetrying] = useState<string | null>(null);

  const [search, setSearch] = useState(filters.search ?? '');
  const [from, setFrom] = useState(filters.from ?? '');
  const [to, setTo] = useState(filters.to ?? '');

  const go = (patch: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const next = { ...filters, ...patch } as Record<string, any>;
    Object.entries(next).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'ALL' && !(k === 'page' && v === 1)) {
        params.set(k, String(v));
      }
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const applySearch = () => go({ search, from, to, page: 1 });

  const retry = async (id: string) => {
    setRetrying(id);
    try {
      const res = await retryEmailFromLog(id);
      if (res.success) {
        toast.success(res.message || 'Tickets re-sent');
        router.refresh();
      } else {
        toast.error(res.message || 'Retry failed');
        router.refresh();
      }
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Delivered', value: data.counts.DELIVERED, icon: MailCheck, color: 'text-green-600' },
          { label: 'Sent (awaiting)', value: data.counts.SENT, icon: Clock, color: 'text-blue-600' },
          { label: 'Bounced', value: data.counts.BOUNCED, icon: MailWarning, color: 'text-orange-600' },
          { label: 'Spam complaints', value: data.counts.COMPLAINED, icon: ShieldAlert, color: 'text-purple-600' },
          { label: 'Failed', value: data.counts.FAILED, icon: XCircle, color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className={`flex items-center gap-2 text-2xl font-bold ${color}`}>
              <Icon className="h-5 w-5" />
              {value}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Email, ticket ID, order ID or event"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              />
            </div>

            <Select
              value={filters.status || 'ALL'}
              onValueChange={(v) => go({ status: v, page: 1 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="SENT">Sent (awaiting confirmation)</SelectItem>
                <SelectItem value="BOUNCED">Bounced</SelectItem>
                <SelectItem value="COMPLAINED">Spam complaint</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.type || 'ALL'}
              onValueChange={(v) => go({ type: v, page: 1 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="ORDER_TICKETS">Purchase / order</SelectItem>
                <SelectItem value="TICKET_RESEND">Single ticket resend</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={applySearch} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setFrom('');
                setTo('');
                startTransition(() => router.push(pathname));
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sent at (Lagos)</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No ticket emails found.
                  </TableCell>
                </TableRow>
              )}

              {data.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatLagosTime(log.createdAt, 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{log.toEmail}</div>
                    {log.orderId && (
                      <div className="text-xs text-muted-foreground">
                        Order {log.orderId.slice(-8)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {log.eventTitle ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      {log.ticketIds.length}
                      {log.attachmentCount > 0 && (
                        <span title={`${log.attachmentCount} PDF attached`}>
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    <div className="max-w-[160px] truncate text-xs text-muted-foreground">
                      {log.ticketIds.join(', ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABEL[log.type] ?? log.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusCell log={log} />
                  </TableCell>
                  <TableCell className="text-right">
                    {log.status === 'FAILED' && log.orderId && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retrying === log.id}
                        onClick={() => retry(log.id)}
                      >
                        {retrying === log.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-3 w-3" />
                        )}
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {data.page} of {data.totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data.page <= 1 || isPending}
            onClick={() => go({ page: data.page - 1 })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= data.totalPages || isPending}
            onClick={() => go({ page: data.page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
