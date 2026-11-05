'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { saveScannerSettings } from '@/actions/scanner-settings.actions';

const ROWS: [string, boolean, boolean][] = [
  ['Camera QR scanning in the in-app scanner', true, true],
  ['Barcode / QR hardware scanners (USB or Bluetooth keyboard-style)', false, true],
  ['Typing a ticket code manually', false, true],
  ['Ticket validated exactly once, server-side', true, true],
  ['Works with physical tickets generated here', true, true],
];

export function ScannerModeForm({ eventId, initialMode, canEdit }: { eventId: string; initialMode: 'INBUILT_ONLY' | 'UNIVERSAL'; canEdit: boolean }) {
  const [mode, setMode] = useState(initialMode);
  const [saved, setSaved] = useState(initialMode);
  const [pending, start] = useTransition();
  const Cell = ({ ok }: { ok: boolean }) => (ok ? <Check className="mx-auto h-4 w-4 text-green-600" aria-label="Supported" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not supported" />);
  return (
    <Card>
      <CardHeader><CardTitle>Scanner mode</CardTitle><CardDescription>Choose how entry tickets can be checked at this event. Enforced on the server for every scan.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} disabled={!canEdit} className="grid gap-3 sm:grid-cols-2">
          <Label htmlFor="m-in" className="flex cursor-pointer items-start gap-3 rounded-md border p-4 has-[:checked]:border-primary">
            <RadioGroupItem id="m-in" value="INBUILT_ONLY" className="mt-1" />
            <span><span className="block font-medium">Inbuilt scanner only</span><span className="block text-xs font-normal text-muted-foreground">Staff must use the camera scanner in the app. Hardware scanners and manual entry are blocked.</span></span>
          </Label>
          <Label htmlFor="m-uni" className="flex cursor-pointer items-start gap-3 rounded-md border p-4 has-[:checked]:border-primary">
            <RadioGroupItem id="m-uni" value="UNIVERSAL" className="mt-1" />
            <span><span className="block font-medium">Universal scanner (default)</span><span className="block text-xs font-normal text-muted-foreground">Camera, hardware barcode/QR scanners and manual code entry are all accepted.</span></span>
          </Label>
        </RadioGroup>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Capability</TableHead><TableHead className="text-center">Inbuilt only</TableHead><TableHead className="text-center">Universal</TableHead></TableRow></TableHeader>
            <TableBody>{ROWS.map(([label, a, b]) => <TableRow key={label}><TableCell>{label}</TableCell><TableCell><Cell ok={a} /></TableCell><TableCell><Cell ok={b} /></TableCell></TableRow>)}</TableBody>
          </Table>
        </div>
        {canEdit ? (
          <Button disabled={pending || mode === saved} onClick={() => start(async () => {
            const r = await saveScannerSettings({ eventId, mode });
            if (r.success) { setSaved(mode); toast.success(r.message ?? 'Saved'); } else toast.error(r.message);
          })}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
        ) : <p className="text-sm text-muted-foreground">Only the event owner can change the scanner mode.</p>}
      </CardContent>
    </Card>
  );
}
