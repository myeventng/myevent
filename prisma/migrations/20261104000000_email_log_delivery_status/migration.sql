-- New statuses
ALTER TYPE "EmailLogStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "EmailLogStatus" ADD VALUE IF NOT EXISTS 'BOUNCED';
ALTER TYPE "EmailLogStatus" ADD VALUE IF NOT EXISTS 'COMPLAINED';

-- Delivery tracking columns
ALTER TABLE "EmailLog"
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "bouncedAt" TIMESTAMP(3),
  ADD COLUMN "complainedAt" TIMESTAMP(3),
  ADD COLUMN "bounceType" TEXT,
  ADD COLUMN "bounceReason" TEXT;

CREATE INDEX "EmailLog_messageId_idx" ON "EmailLog"("messageId");
