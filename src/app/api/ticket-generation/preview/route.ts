import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can, resolveEventAccess } from '@/lib/staff/access';
import { describeScan, isValidLayout, renderPreviewPdf } from '@/lib/ticket-generation/pdf';
import { checkRateLimit } from '@/lib/rate-limit';
import { formatLagosTime } from '@/lib/utils';

// One-page layout preview with SAMPLE codes that can never be redeemed.
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const q = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
  codeFormat: z.enum(['QR', 'BARCODE']),
  design: z.enum(['BRANDED', 'CODES_ONLY']),
  ticketsPerPage: z.coerce.number().int(),
  showSerial: z.enum(['true', 'false']).transform((v) => v === 'true'),
  organizerLabel: z.string().trim().max(80).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rl = await checkRateLimit(`gen:preview:${session.user.id}`, 30, 60);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const parsed = q.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid options' }, { status: 400 });
  const o = parsed.data;
  if (!isValidLayout(o.design, o.ticketsPerPage)) return NextResponse.json({ error: 'Unsupported layout' }, { status: 400 });

  const access = await resolveEventAccess({ id: session.user.id, role: session.user.role as string }, o.eventId);
  if (!can(access, 'GENERATE_TICKETS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [event, type, scanner] = await Promise.all([
    prisma.event.findUnique({ where: { id: o.eventId }, select: { title: true, startDateTime: true, venue: { select: { name: true, address: true, city: { select: { name: true } } } } } }),
    prisma.ticketType.findFirst({ where: { id: o.ticketTypeId, eventId: o.eventId }, select: { name: true } }),
    prisma.eventScannerSettings.findUnique({ where: { eventId: o.eventId }, select: { mode: true } }),
  ]);
  if (!event || !type) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const v = event.venue;

  const pdf = await renderPreviewPdf({
    design: o.design,
    codeFormat: o.codeFormat,
    ticketsPerPage: o.ticketsPerPage,
    showSerial: o.showSerial,
    event: {
      title: event.title,
      dateText: `${formatLagosTime(event.startDateTime, 'EEE, d MMM yyyy')} · ${formatLagosTime(event.startDateTime, 'p')}`,
      venueText: [v?.name, v?.address, v?.city?.name].filter(Boolean).join(', '),
      ticketTypeName: type.name,
      organizerLabel: o.organizerLabel || null,
      scanText: describeScan(o.codeFormat, scanner?.mode ?? 'UNIVERSAL'),
    },
  });
  return new NextResponse(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="preview.pdf"', 'Cache-Control': 'private, no-store' } });
}
