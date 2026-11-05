# Commission, staff, physical tickets, share thumbnails — implementation notes

## Setup
1. `npx prisma migrate deploy` (applies `20261105000000_commission_staff_physical_tickets`; it seeds the general commission (10%, only if no row exists) and the six ticket-pricing tiers idempotently).
2. `npm run seed:ticket-pricing` (optional, only seeds when the tier table is empty).
3. Env vars: `TICKET_TOKEN_SECRET` (HMAC for ticket codes + scan sessions), `CRON_SECRET`, `UPLOADTHING_TOKEN`, `NEXT_PUBLIC_APP_URL`, `PAYSTACK_SECRET_KEY` (+ existing keys).
4. Vercel: `vercel.json` registers `/api/cron/ticket-generation` every 5 minutes (needs Pro; Hobby allows daily only). Generation is also driven from the browser, so the cron is the safety net.
5. Tests: `TEST_DATABASE_URL=postgresql://… npm test` (needs a scratch Postgres).

## Codes-only option
In *Generate physical tickets* choose **Codes only (for your designer)**: the PDF contains only the QR/barcode (+ optional serial). Completed codes-only batches also offer **SVG** downloads: a ZIP per part with one vector file per ticket (named by serial) and `manifest.csv`.
