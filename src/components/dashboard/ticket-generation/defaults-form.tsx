'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveGenerationDefaults } from '@/actions/ticket-generation.actions';

type D = { codeFormat: 'QR' | 'BARCODE'; design: 'BRANDED' | 'CODES_ONLY'; ticketsPerPage: number; showSerial: boolean; organizerLabel: string | null };

export function DefaultsForm({ initial, layouts }: { initial: D; layouts: { BRANDED: number[]; CODES_ONLY: number[] } }) {
  const [v, setV] = useState<D>(initial);
  const [pending, start] = useTransition();
  const opts = layouts[v.design];
  useEffect(() => { if (!opts.includes(v.ticketsPerPage)) setV((x) => ({ ...x, ticketsPerPage: opts.includes(4) ? 4 : opts[0] })); }, [opts, v.ticketsPerPage]);
  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Default generation settings</CardTitle><CardDescription>Pre-filled whenever you generate physical tickets. You can still change them per batch.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2"><Label>Code type</Label>
          <RadioGroup value={v.codeFormat} onValueChange={(c) => setV({ ...v, codeFormat: c as D['codeFormat'] })} className="flex gap-4">
            <Label className="flex items-center gap-2"><RadioGroupItem value="QR" />QR code</Label><Label className="flex items-center gap-2"><RadioGroupItem value="BARCODE" />Barcode</Label>
          </RadioGroup></div>
        <div className="space-y-2"><Label>Design</Label>
          <RadioGroup value={v.design} onValueChange={(c) => setV({ ...v, design: c as D['design'] })} className="flex flex-col gap-2">
            <Label className="flex items-center gap-2"><RadioGroupItem value="BRANDED" />Branded ticket</Label>
            <Label className="flex items-center gap-2"><RadioGroupItem value="CODES_ONLY" />Codes only (no branding – for your graphic designer)</Label>
          </RadioGroup></div>
        <div className="space-y-2"><Label>Tickets per page</Label>
          <Select value={String(v.ticketsPerPage)} onValueChange={(n) => setV({ ...v, ticketsPerPage: Number(n) })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{opts.map((n) => <SelectItem key={n} value={String(n)}>{n} per page</SelectItem>)}</SelectContent></Select></div>
        <div className="flex items-center justify-between rounded-md border p-3"><Label htmlFor="ser">Print serial number</Label><Switch id="ser" checked={v.showSerial} onCheckedChange={(c) => setV({ ...v, showSerial: c })} /></div>
        <div className="space-y-2"><Label htmlFor="org">Organizer name on branded tickets</Label><Input id="org" maxLength={80} value={v.organizerLabel ?? ''} onChange={(e) => setV({ ...v, organizerLabel: e.target.value })} /></div>
        <Button disabled={pending} onClick={() => start(async () => {
          const r = await saveGenerationDefaults({ eventId: null, ...v, organizerLabel: v.organizerLabel?.trim() || null });
          if (r.success) toast.success(r.message ?? 'Saved'); else toast.error(r.message);
        })}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save defaults</Button>
      </CardContent>
    </Card>
  );
}
