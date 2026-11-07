-- Offline (physical) ticket sales ledger. ADDITIVE ONLY.
ALTER TABLE "TicketGenerationBatch" ADD COLUMN "offlineSold" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "OfflineSale" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "ticketTypeId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceKobo" INTEGER NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "note" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfflineSale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfflineSale_batchId_idx" ON "OfflineSale"("batchId");
CREATE INDEX "OfflineSale_eventId_createdAt_idx" ON "OfflineSale"("eventId", "createdAt");
CREATE INDEX "OfflineSale_ticketTypeId_idx" ON "OfflineSale"("ticketTypeId");

ALTER TABLE "OfflineSale" ADD CONSTRAINT "OfflineSale_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "TicketGenerationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
