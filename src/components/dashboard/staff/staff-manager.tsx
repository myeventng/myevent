'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Ban, Loader2, Mail, Pencil, Plus, RefreshCw, Send, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  inviteStaffAction, listMyEventsForStaffAction, listMyStaffAction, removeStaffAction, resendInviteAction,
  revokeStaffAction, updateStaffAction,
} from '@/actions/staff.actions';
import { PERMISSION_LABELS, ROLE_ALLOWED_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, ROLE_LABELS } from '@/lib/staff/permissions';

type Role = 'MANAGER' | 'SCANNER';
type Perm = keyof typeof PERMISSION_LABELS;
type Member = {
  id: string; email: string; name: string | null; role: Role; permissions: string[]; allEvents: boolean;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED'; events: { id: string; title: string }[]; invitedAt: string; expiresAt: string | null;
};
type EventOpt = { id: string; title: string };

const statusTone = (s: Member['status']) => (s === 'ACTIVE' ? 'default' : s === 'PENDING' ? 'outline' : 'secondary');
const ROLE_BLURB: Record<Role, string> = {
  MANAGER: 'Can edit assigned events, view analytics, scan tickets, view check-in stats and (if allowed) generate tickets. Never sees payouts, commission, or your team settings.',
  SCANNER: 'Can only scan tickets and view check-in counts for assigned events.',
};

export function StaffManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Member | 'new' | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'revoke' | 'remove'; m: Member } | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [m, e] = await Promise.all([listMyStaffAction(), listMyEventsForStaffAction()]);
    if (m.success) setMembers(m.data as Member[]); else setError(m.message);
    if (e.success) setEvents(e.data.map((x) => ({ id: x.id, title: x.title })));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const resend = (m: Member) => start(async () => { const r = await resendInviteAction(m.id); if (r.success) { toast.success(r.message); load(); } else toast.error(r.message); });
  const doConfirm = () => start(async () => {
    if (!confirm) return;
    const r = confirm.kind === 'revoke' ? await revokeStaffAction(confirm.m.id) : await removeStaffAction(confirm.m.id);
    if (r.success) { toast.success(r.message); setConfirm(null); load(); } else toast.error(r.message);
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Your team</CardTitle>
          <CardDescription>Invite people by email to help with your events. Access is limited to your own events and never changes their account type.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing('new')}><Plus className="mr-1 h-4 w-4" />Invite</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : error ? (
          <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="flex items-center justify-between">{error}<Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-2 h-3 w-3" />Retry</Button></AlertDescription></Alert>
        ) : members.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <Mail className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No team members yet</p>
            <p className="mb-4 text-sm text-muted-foreground">Invite a scanner for door duty or a manager to help run your events.</p>
            <Button onClick={() => setEditing('new')}><Plus className="mr-1 h-4 w-4" />Invite someone</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Person</TableHead><TableHead>Role</TableHead><TableHead>Events</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><div className="font-medium">{m.name ?? m.email}</div>{m.name && <div className="text-xs text-muted-foreground">{m.email}</div>}</TableCell>
                    <TableCell>{ROLE_LABELS[m.role]}</TableCell>
                    <TableCell className="max-w-56 truncate" title={m.allEvents ? 'All events' : m.events.map((e) => e.title).join(', ')}>{m.allEvents ? 'All my events' : `${m.events.length} event${m.events.length === 1 ? '' : 's'}: ${m.events.map((e) => e.title).join(', ')}`}</TableCell>
                    <TableCell><Badge variant={statusTone(m.status)}>{m.status === 'PENDING' ? 'Invited' : m.status === 'ACTIVE' ? 'Active' : 'Revoked'}</Badge>{m.status === 'PENDING' && m.expiresAt && <div className="text-xs text-muted-foreground">expires {new Date(m.expiresAt).toLocaleDateString('en-NG')}</div>}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {m.status === 'PENDING' && <Button size="icon" variant="ghost" aria-label="Resend invitation" disabled={pending} onClick={() => resend(m)}><Send className="h-4 w-4" /></Button>}
                      {m.status !== 'REVOKED' && <Button size="icon" variant="ghost" aria-label="Edit access" onClick={() => setEditing(m)}><Pencil className="h-4 w-4" /></Button>}
                      {m.status !== 'REVOKED' && <Button size="icon" variant="ghost" aria-label="Revoke access" onClick={() => setConfirm({ kind: 'revoke', m })}><Ban className="h-4 w-4" /></Button>}
                      <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => setConfirm({ kind: 'remove', m })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {editing && <StaffDialog member={editing === 'new' ? null : editing} events={events} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && !pending && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === 'revoke' ? 'Revoke access?' : 'Remove from team?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'revoke'
                ? `${confirm.m.name ?? confirm.m.email} will lose access immediately, even mid-event. You can invite them again later.`
                : `${confirm?.m.name ?? confirm?.m.email} will be removed and any pending invitation cancelled. Their past check-ins stay in your records.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doConfirm(); }} disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{confirm?.kind === 'revoke' ? 'Revoke' : 'Remove'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function StaffDialog({ member, events, onClose, onSaved }: { member: Member | null; events: EventOpt[]; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(member?.email ?? '');
  const [role, setRole] = useState<Role>(member?.role ?? 'SCANNER');
  const [perms, setPerms] = useState<Perm[]>((member?.permissions as Perm[]) ?? ROLE_DEFAULT_PERMISSIONS.SCANNER);
  const [allEvents, setAllEvents] = useState(member?.allEvents ?? true);
  const [eventIds, setEventIds] = useState<string[]>(member?.events.map((e) => e.id) ?? []);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pickRole = (r: Role) => { setRole(r); setPerms(ROLE_DEFAULT_PERMISSIONS[r] as Perm[]); };
  const allowed = ROLE_ALLOWED_PERMISSIONS[role] as Perm[];
  const toggleEvent = (id: string) => setEventIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const togglePerm = (p: Perm) => { if (p === 'VIEW_EVENTS') return; setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p])); };

  const submit = () => start(async () => {
    setErr(null);
    if (!member && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Enter a valid email address'); return; }
    if (!allEvents && eventIds.length === 0) { setErr('Choose at least one event, or give access to all events'); return; }
    const common = { role, permissions: perms.filter((p) => allowed.includes(p)) as never, allEvents, eventIds: allEvents ? [] : eventIds };
    const r = member ? await updateStaffAction(member.id, common as never) : await inviteStaffAction({ email: email.trim(), ...common } as never);
    if (r.success) { toast.success(r.message ?? 'Saved'); onSaved(); } else setErr(r.message);
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit access' : 'Invite a team member'}</DialogTitle>
          <DialogDescription>{member ? member.email : 'They’ll get an email with a link to accept. The link works once, for that email address only.'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          {!member && <div className="grid gap-1.5"><Label htmlFor="s-email">Email</Label><Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" /></div>}

          <div className="grid gap-2">
            <Label>Role</Label>
            <RadioGroup value={role} onValueChange={(v) => pickRole(v as Role)} className="gap-2">
              {(['SCANNER', 'MANAGER'] as Role[]).map((r) => (
                <label key={r} htmlFor={`role-${r}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                  <RadioGroupItem id={`role-${r}`} value={r} className="mt-1" />
                  <div><div className="font-medium">{ROLE_LABELS[r]}</div><div className="text-xs text-muted-foreground">{ROLE_BLURB[r]}</div></div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {role === 'MANAGER' && (
            <div className="grid gap-2">
              <Label>Permissions</Label>
              {allowed.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <Checkbox id={`p-${p}`} checked={perms.includes(p)} disabled={p === 'VIEW_EVENTS'} onCheckedChange={() => togglePerm(p)} />
                  <Label htmlFor={`p-${p}`} className="font-normal">{PERMISSION_LABELS[p]}</Label>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Which events?</Label>
            <RadioGroup value={allEvents ? 'all' : 'some'} onValueChange={(v) => setAllEvents(v === 'all')} className="gap-2">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="all" id="ev-all" />All my events (including future ones)</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="some" id="ev-some" />Only selected events</label>
            </RadioGroup>
            {!allEvents && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {events.length === 0 ? <p className="p-2 text-sm text-muted-foreground">You have no events yet.</p> : events.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"><Checkbox checked={eventIds.includes(e.id)} onCheckedChange={() => toggleEvent(e.id)} />{e.title}</label>
                ))}
              </div>
            )}
          </div>
          {err && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{err}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{member ? 'Save changes' : 'Send invitation'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
