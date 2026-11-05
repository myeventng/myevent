-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "status" "EmailLogStatus" NOT NULL,
    "provider" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "orderId" TEXT,
    "eventId" TEXT,
    "eventTitle" TEXT,
    "ticketIds" TEXT[],
    "attachmentCount" INTEGER NOT NULL DEFAULT 0,
    "messageId" TEXT,
    "error" TEXT,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");
CREATE INDEX "EmailLog_toEmail_idx" ON "EmailLog"("toEmail");
CREATE INDEX "EmailLog_orderId_idx" ON "EmailLog"("orderId");
