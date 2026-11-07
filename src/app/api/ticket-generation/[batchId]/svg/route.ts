import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { zipSync, strToU8 } from 'fflate';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can, resolveEventAccess } from '@/lib/staff/access';
import { codeToSvg } from '@/lib/ticket-generation/codes';
import { describeScan } from '@/lib/ticket-generation/pdf';
import { partRange, printTicketsForRange } from '@/lib/ticket-generation/service';
import { checkRateLimit } from '@/lib/rate-limit';

// Codes-only vector export for graphic designers: one plain SVG per ticket (no branding, no text),
// named by serial, plus a manifest. Designers place each SVG into their own ticket artwork.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await ctx.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await checkRateLimit(`gen:svg:${session.user.id}`, 20, 60);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const part = Number(req.nextUrl.searchParams.get('part') ?? '0');
  if (!Number.isInteger(part) || part < 0) return NextResponse.json({ error: 'Invalid part' }, { status: 400 });

  const batch = await prisma.ticketGenerationBatch.findUnique({
    where: { id: batchId },
    select: { id: true, eventId: true, quantity: true, partSize: true, partsTotal: true, codeFormat: true, scannerMode: true, design: true, ticketsPerPage: true, showSerial: true, files: { select: { partIndex: true } } },
  });
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const access = await resolveEventAccess({ id: session.user.id, role: session.user.role as string }, batch.eventId);
  if (!can(access, 'GENERATE_TICKETS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Only parts that exist (i.e. were paid for and generated) can be exported.
  if (part >= batch.partsTotal || !batch.files.some((f) => f.partIndex === part)) {
    return NextResponse.json({ error: 'This part has not been generated yet' }, { status: 409 });
  }

  const { from, to } = partRange(batch, part);
  const tickets = printTicketsForRange(batch.id, from, to);
  const files: Record<string, Uint8Array> = {};
  const manifest = ['serial,index'];
  tickets.forEach((t, i) => {
    files[`${t.serial}.svg`] = strToU8(codeToSvg(t.token, batch.codeFormat));
    manifest.push(`${t.serial},${from + i + 1}`);
  });
  files['manifest.csv'] = strToU8(manifest.join('\n') + '\n');
  // The SVGs carry no text by design, so the options chosen at generation time are recorded here.
  files['README.txt'] = strToU8(
    [
      `Batch: ${batch.id}`,
      `Part: ${part + 1} of ${batch.partsTotal} (tickets ${from + 1}-${to})`,
      `Print design: ${batch.design === 'CODES_ONLY' ? 'Codes only' : 'Branded'}`,
      `Code type: ${describeScan(batch.codeFormat, batch.scannerMode)}`,
      `Layout: ${batch.ticketsPerPage} per page`,
      `Serial numbers: ${batch.showSerial ? 'shown on the PDF version' : 'not shown'}`,
      '',
      'Each SVG is the code only. Keep the code type and a clear quiet zone when placing it in your artwork.',
      batch.scannerMode === 'INBUILT_ONLY'
        ? 'These tickets are valid ONLY with the MyEvent app scanner for this event.'
        : 'These tickets can be scanned by the MyEvent app or any compatible scanner.',
    ].join('\n') + '\n',
  );

  const zip = zipSync(files, { level: 0 });
  return new NextResponse(Buffer.from(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="codes-${batch.id}-part-${String(part + 1).padStart(3, '0')}.zip"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
