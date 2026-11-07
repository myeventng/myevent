'use client';

import { Printer } from 'lucide-react';

const n = (v: number | undefined) => (v ?? 0).toLocaleString('en-NG');

type TypeStats = {
  physicalRemaining?: number;
  physicalIssued?: number;
  physicalUsed?: number;
  soldOffline?: number;
  unsoldPhysical?: number;
  offlineRevenue?: number;
};

/**
 * Offline / physical inventory for one ticket type. Shown next to the online figures wherever the
 * organizer looks at ticket-type stats. Offline numbers are organizer-recorded and are NOT part of
 * online sales, platform revenue or payouts.
 */
export function PhysicalInventoryRow({ t, formatMoney }: { t: TypeStats; formatMoney?: (v: number) => string }) {
  const hasAny = (t.physicalIssued ?? 0) > 0 || (t.physicalRemaining ?? 0) > 0;
  if (!hasAny) return null;
  return (
    <div className="mt-3 rounded-md bg-muted/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Printer className="h-3.5 w-3.5" /> Physical / offline tickets
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <div><span className="text-muted-foreground">Left to print</span><div className="font-medium">{n(t.physicalRemaining)}</div></div>
        <div><span className="text-muted-foreground">Generated</span><div className="font-medium">{n(t.physicalIssued)}</div></div>
        <div><span className="text-muted-foreground">Sold offline</span><div className="font-medium">{n(t.soldOffline)}</div></div>
        <div><span className="text-muted-foreground">Unsold in hand</span><div className="font-medium">{n(t.unsoldPhysical)}</div></div>
        <div><span className="text-muted-foreground">Scanned</span><div className="font-medium">{n(t.physicalUsed)}</div></div>
      </div>
      {t.offlineRevenue !== undefined && t.offlineRevenue > 0 && formatMoney && (
        <p className="mt-2 text-xs text-muted-foreground">Offline sales recorded: {formatMoney(t.offlineRevenue)} (not included in online revenue or payouts)</p>
      )}
    </div>
  );
}
