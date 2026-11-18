-- New default scanner mode is INBUILT_ONLY (camera scanner in the app).
-- Events that have no explicit setting today behave as UNIVERSAL, so pin them to UNIVERSAL
-- first. Only events created from now on (and organisers who choose it) get INBUILT_ONLY.
INSERT INTO "EventScannerSettings" ("id", "eventId", "mode", "updatedAt")
SELECT gen_random_uuid()::text, e."id", 'UNIVERSAL'::"ScannerMode", CURRENT_TIMESTAMP
FROM "Event" e
WHERE NOT EXISTS (SELECT 1 FROM "EventScannerSettings" s WHERE s."eventId" = e."id");

ALTER TABLE "EventScannerSettings" ALTER COLUMN "mode" SET DEFAULT 'INBUILT_ONLY';
ALTER TABLE "TicketGenerationBatch" ALTER COLUMN "scannerMode" SET DEFAULT 'INBUILT_ONLY';
