# Commission, staff, physical tickets, share thumbnails — implementation notes

## Setup
1. `npx prisma migrate deploy` (applies `20261105000000_commission_staff_physical_tickets`; it seeds the general commission (10%, only if no row exists) and the six ticket-pricing tiers idempotently).
2. `npm run seed:ticket-pricing` (optional, only seeds when the tier table is empty).
3. Env vars: `TICKET_TOKEN_SECRET` (HMAC for ticket codes + scan sessions), `CRON_SECRET`, `UPLOADTHING_TOKEN`, `NEXT_PUBLIC_APP_URL`, `PAYSTACK_SECRET_KEY` (+ existing keys).
4. Vercel (Hobby-compatible): `vercel.json` runs `/api/cron/ticket-generation` once daily (03:30 UTC), the most Hobby allows. It is only a safety net. Generation is driven by the Paystack webhook and by the open Generate / History page, which resumes any unfinished batch on load, so a batch left half-done is finished the next time the organizer opens the page (or at the daily run).
5. Tests: `TEST_DATABASE_URL=postgresql://… npm test` (needs a scratch Postgres).

## Codes-only option
In *Generate physical tickets* choose **Codes only (for your designer)**: the PDF contains only the QR/barcode (+ optional serial). Completed codes-only batches also offer **SVG** downloads: a ZIP per part with one vector file per ticket (named by serial) and `manifest.csv`.

## File storage: UploadThing or Cloudflare R2 (super-admin switch)

**Admin → Settings → Storage** (Super Admin only) selects the provider for *new* uploads. Default is UploadThing, so nothing changes until you switch.

- Existing files are never migrated or broken. Image URLs are stored as full URLs, so old `utfs.io` / `*.ufs.sh` URLs keep working; new ones are on your R2 domain. The delete route inspects the URL and deletes from the right provider.
- Ticket PDFs: new parts go to the selected provider. R2 keys are prefixed `r2/`; every other key is treated as UploadThing, so batches generated before the switch still download.
- If R2 is selected but `R2_PRIVATE_BUCKET` is missing, generation pauses with a clear error (no silent fallback). If R2 image env vars are incomplete the switch cannot be saved, and uploaders fall back to UploadThing.
- Images upload browser → R2 with a server-issued presigned PUT (`/api/storage/presign`): signed-in users only, rate limited, server picks the key, content type (JPG/PNG/WebP/GIF/AVIF, no SVG) and the exact size, per-endpoint limits in `src/lib/storage/rules.ts`.

### Environment variables (Vercel)
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BUCKET=myevent-public
R2_PUBLIC_BASE_URL=https://files.myevent.com.ng
R2_PRIVATE_BUCKET=myevent-private
```
`R2_PUBLIC_BASE_URL` is read at build time for `next/image`, so redeploy after setting it.

### Cloudflare setup
1. R2 → create two buckets: `myevent-public` and `myevent-private`.
2. `myevent-public` → Settings → Custom Domain (e.g. `files.myevent.com.ng`). Do NOT make `myevent-private` public.
3. `myevent-public` → Settings → CORS policy:
```json
[{"AllowedOrigins":["https://myevent.com.ng","https://www.myevent.com.ng","http://localhost:3000"],
  "AllowedMethods":["PUT"],"AllowedHeaders":["content-type"],"MaxAgeSeconds":3600}]
```
4. R2 → Manage API tokens → Create token with *Object Read & Write*, scoped to those two buckets. Copy the Access Key ID / Secret into Vercel.
5. Redeploy, open Settings → Storage, press **Test connection**, then choose Cloudflare R2 and Save.

## "Event has ended" rule

One shared check, `src/lib/event-status.ts` (`hasEventEnded`: now > end time, falling back to start time if the end is missing/earlier). Enforced **server-side** in:
- physical ticket batch creation (`prepareBatch`), for owners, staff and admins; the Generate page also shows a banner and disables the button;
- creating invitations (single and bulk) and sending invitation emails for invite-only events.

Intentionally NOT blocked: completing a payment already taken, batches already created/paid (they finish), re-sending or re-downloading tickets already issued, refunds. Online sales were already closed at event start by `initiateOrder`. Events in progress (started, not yet ended) can still print door tickets.

## Online vs physical ticket stock; physical tickets are not sales

- `TicketType.quantity` = ONLINE stock (reduced by online sales, as before). New `TicketType.physicalQuantity` = PHYSICAL stock, set per ticket type in the create/edit ticket form ("Physical quantity (optional)", default 0). Generating a batch reserves from `physicalQuantity` only; cancelling a batch returns it there. The two pools never touch each other.
- Editing a ticket type only sends `physicalQuantity` if the organizer changed it, so saving online details can't overwrite stock a batch just reserved.
- Scanning a physical ticket marks it USED (same atomic scanner path as online tickets).
- Sales and revenue exclude physical tickets everywhere (`src/lib/ticket-stats.ts`: `ONLINE_SOLD_WHERE`). Event stats show physical issued/used separately. Revenue per ticket type is now `online sold × price`; order-based revenue was already correct.
- The batch records the scanner mode at generation time (`TicketGenerationBatch.scannerMode`). Branded tickets print an "Entry" line, e.g. "QR code · Any scanner" or "Barcode · MyEvent app scanner only". Codes-only PDFs stay clean for designers; their options appear in the batch list and in a README.txt inside the SVG zip.
- Migration `20261107000000_physical_quantity_and_batch_scanner_mode` is additive. `prisma/optional-restore-online-stock.sql` (manual, optional) returns online stock consumed by batches generated before the split.

## Offline (physical) sales inventory

Physical tickets sold outside the platform are recorded per batch ("Record sales" on the Generate page's batch list; sold / correct-or-returned, optional price and note). Append-only ledger `OfflineSale`; the atomic counter `TicketGenerationBatch.offlineSold` can never go below 0 or above the batch size, even under concurrent clicks. Permission = same as generating (owner, admin, or staff with GENERATE_TICKETS on that event).

Shown in: batch list (sold offline / unsold / scanned), ticket-type cards when editing an event, event analytics (per-type "Physical / offline tickets" block + overview line), organizer dashboard (Tickets Sold card + per-event rows), organizer events table, admin ticket stats (`physical`). A scanned physical ticket counts as sold even if never recorded.

Offline figures are inventory + organizer-recorded revenue only: they never feed online sales, platform revenue, commission or payouts. All numbers come from one place (`src/lib/ticket-generation/offline-sales.ts`).

Also fixed: the organizer events table computed revenue/sold from ALL tickets (so printed tickets inflated it); it now uses online tickets only. Scanner overview cards still count online + physical (both are scannable).
Migration: `20261107120000_offline_sales` (additive).
