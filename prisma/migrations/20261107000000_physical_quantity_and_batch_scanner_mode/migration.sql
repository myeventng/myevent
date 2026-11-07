-- Separate physical ticket stock from online stock, and record the scanner mode used when a batch
-- was generated. ADDITIVE ONLY: existing columns and rows are untouched (new columns are defaulted).

ALTER TABLE "TicketType" ADD COLUMN "physicalQuantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TicketGenerationBatch" ADD COLUMN "scannerMode" "ScannerMode" NOT NULL DEFAULT 'UNIVERSAL';

-- Backfill the new column for batches generated before this migration, from the event's current setting.
UPDATE "TicketGenerationBatch" b
SET "scannerMode" = s."mode"
FROM "EventScannerSettings" s
WHERE s."eventId" = b."eventId";
