-- OPTIONAL, run once by hand (NOT a migration). Only needed if you generated physical tickets BEFORE
-- the online/physical stock split: those batches reduced the ONLINE quantity. This gives that stock
-- back to online sales. Physical stock stays at 0 until the organizer sets "Physical quantity".
--
-- 1) Preview what would change:
SELECT t."id", t."name", t."quantity" AS online_now, t."quantity" + x.n AS online_after, x.n AS returned
FROM "TicketType" t
JOIN (
  SELECT "ticketTypeId", SUM("quantity")::int AS n
  FROM "TicketGenerationBatch"
  WHERE "inventoryReserved" = true AND "createdAt" < TIMESTAMP '2026-11-07 00:00:00'
  GROUP BY "ticketTypeId"
) x ON x."ticketTypeId" = t."id";

-- 2) Apply (uncomment, run once only):
-- BEGIN;
-- UPDATE "TicketType" t
-- SET "quantity" = t."quantity" + x.n
-- FROM (
--   SELECT "ticketTypeId", SUM("quantity")::int AS n
--   FROM "TicketGenerationBatch"
--   WHERE "inventoryReserved" = true AND "createdAt" < TIMESTAMP '2026-11-07 00:00:00'
--   GROUP BY "ticketTypeId"
-- ) x
-- WHERE x."ticketTypeId" = t."id";
-- -- Stop those old batches from releasing into the wrong pool if they are cancelled later:
-- UPDATE "TicketGenerationBatch" SET "inventoryReserved" = false
--   WHERE "inventoryReserved" = true AND "createdAt" < TIMESTAMP '2026-11-07 00:00:00';
-- COMMIT;
