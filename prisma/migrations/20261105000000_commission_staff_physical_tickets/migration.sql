-- Commission rules, organizer staff, physical ticket generation, scanner settings,
-- event share thumbnails. ADDITIVE ONLY: no existing column, table or row is dropped,
-- altered in type, or rewritten. Safe to run on a populated production database.

-- ─── Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE "CommissionScope" AS ENUM ('ORGANIZER', 'EVENT');
CREATE TYPE "CommissionSource" AS ENUM ('EVENT_RULE', 'ORGANIZER_RULE', 'ORGANIZER_LEGACY', 'GENERAL');
CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'SCANNER');
CREATE TYPE "StaffPermission" AS ENUM ('VIEW_EVENTS', 'MANAGE_EVENTS', 'VIEW_ANALYTICS', 'MANAGE_TICKETS', 'SCAN_TICKETS', 'VIEW_CHECKIN_STATS', 'GENERATE_TICKETS');
CREATE TYPE "StaffStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');
CREATE TYPE "TicketSource" AS ENUM ('ONLINE', 'ADMIN_PHYSICAL', 'ORGANIZER_PHYSICAL');
CREATE TYPE "TicketCodeFormat" AS ENUM ('QR', 'BARCODE');
CREATE TYPE "TicketPrintDesign" AS ENUM ('BRANDED', 'CODES_ONLY');
CREATE TYPE "GenerationBatchStatus" AS ENUM ('PENDING_PAYMENT', 'READY', 'GENERATING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "ScannerMode" AS ENUM ('INBUILT_ONLY', 'UNIVERSAL');

-- ─── Existing tables: additive, nullable / defaulted columns only ───────────
ALTER TABLE "Order"
  ADD COLUMN "commissionBps" INTEGER,
  ADD COLUMN "commissionSource" "CommissionSource",
  ADD COLUMN "commissionRuleId" TEXT,
  ADD COLUMN "organizerProceeds" DOUBLE PRECISION;

ALTER TABLE "Ticket"
  ADD COLUMN "source" "TicketSource" NOT NULL DEFAULT 'ONLINE',
  ADD COLUMN "tokenHash" TEXT,
  ADD COLUMN "batchId" TEXT,
  ADD COLUMN "batchIndex" INTEGER;

ALTER TABLE "Event"
  ADD COLUMN "shareImageUrl" TEXT,
  ADD COLUMN "shareImageWidth" INTEGER,
  ADD COLUMN "shareImageHeight" INTEGER;

-- ─── Commission rules ───────────────────────────────────────────────────────
CREATE TABLE "CommissionRule" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "scope" "CommissionScope" NOT NULL,
  "percentageBps" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommissionRule_percentageBps_range" CHECK ("percentageBps" >= 0 AND "percentageBps" <= 10000),
  CONSTRAINT "CommissionRule_window_order" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt")
);

CREATE TABLE "CommissionRuleOrganizer" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionRuleOrganizer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionRuleEvent" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionRuleEvent_pkey" PRIMARY KEY ("id")
);

-- ─── Organizer staff ────────────────────────────────────────────────────────
CREATE TABLE "OrganizerStaff" (
  "id" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "role" "StaffRole" NOT NULL,
  "permissions" "StaffPermission"[] DEFAULT ARRAY[]::"StaffPermission"[],
  "allEvents" BOOLEAN NOT NULL DEFAULT true,
  "status" "StaffStatus" NOT NULL DEFAULT 'PENDING',
  "inviteTokenHash" TEXT,
  "inviteExpiresAt" TIMESTAMP(3),
  "invitedById" TEXT,
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastInvitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizerStaff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizerStaffEvent" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  CONSTRAINT "OrganizerStaffEvent_pkey" PRIMARY KEY ("id")
);

-- ─── Physical ticket generation ─────────────────────────────────────────────
CREATE TABLE "TicketGenerationPricingTier" (
  "id" TEXT NOT NULL,
  "label" TEXT,
  "minQuantity" INTEGER NOT NULL,
  "maxQuantity" INTEGER,
  "feeKobo" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedById" TEXT,
  CONSTRAINT "TicketGenerationPricingTier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketGenerationPricingTier_range_check" CHECK ("minQuantity" >= 1 AND ("maxQuantity" IS NULL OR "maxQuantity" >= "minQuantity") AND "feeKobo" >= 0)
);

CREATE TABLE "TicketGenerationBatch" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "ticketTypeId" TEXT NOT NULL,
  "source" "TicketSource" NOT NULL DEFAULT 'ORGANIZER_PHYSICAL',
  "quantity" INTEGER NOT NULL,
  "codeFormat" "TicketCodeFormat" NOT NULL DEFAULT 'QR',
  "design" "TicketPrintDesign" NOT NULL DEFAULT 'BRANDED',
  "ticketsPerPage" INTEGER NOT NULL DEFAULT 4,
  "showSerial" BOOLEAN NOT NULL DEFAULT true,
  "organizerLabel" TEXT,
  "status" "GenerationBatchStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "pricingTierId" TEXT,
  "feeKobo" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "inventoryReserved" BOOLEAN NOT NULL DEFAULT false,
  "partSize" INTEGER NOT NULL DEFAULT 500,
  "partsTotal" INTEGER NOT NULL DEFAULT 0,
  "partsDone" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketGenerationBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketGenerationBatch_quantity_positive" CHECK ("quantity" > 0)
);

CREATE TABLE "TicketGenerationFile" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "partIndex" INTEGER NOT NULL,
  "fromIndex" INTEGER NOT NULL,
  "toIndex" INTEGER NOT NULL,
  "fileKey" TEXT,
  "bytes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketGenerationFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketGenerationPayment" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "pricingTierId" TEXT,
  "pricingTierLabel" TEXT,
  "amountKobo" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedAmountKobo" INTEGER,
  "paidAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketGenerationPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizerTicketGenerationSettings" (
  "id" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "eventId" TEXT,
  "scopeKey" TEXT NOT NULL,
  "codeFormat" "TicketCodeFormat" NOT NULL DEFAULT 'QR',
  "design" "TicketPrintDesign" NOT NULL DEFAULT 'BRANDED',
  "ticketsPerPage" INTEGER NOT NULL DEFAULT 4,
  "showSerial" BOOLEAN NOT NULL DEFAULT true,
  "organizerLabel" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizerTicketGenerationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventScannerSettings" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "mode" "ScannerMode" NOT NULL DEFAULT 'UNIVERSAL',
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventScannerSettings_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "Ticket_tokenHash_key" ON "Ticket"("tokenHash");
CREATE UNIQUE INDEX "Ticket_batchId_batchIndex_key" ON "Ticket"("batchId", "batchIndex");
CREATE INDEX "Ticket_batchId_status_idx" ON "Ticket"("batchId", "status");

CREATE INDEX "CommissionRule_scope_isActive_idx" ON "CommissionRule"("scope", "isActive");
CREATE INDEX "CommissionRule_startsAt_endsAt_idx" ON "CommissionRule"("startsAt", "endsAt");
CREATE UNIQUE INDEX "CommissionRuleOrganizer_ruleId_organizerId_key" ON "CommissionRuleOrganizer"("ruleId", "organizerId");
CREATE INDEX "CommissionRuleOrganizer_organizerId_idx" ON "CommissionRuleOrganizer"("organizerId");
CREATE UNIQUE INDEX "CommissionRuleEvent_ruleId_eventId_key" ON "CommissionRuleEvent"("ruleId", "eventId");
CREATE INDEX "CommissionRuleEvent_eventId_idx" ON "CommissionRuleEvent"("eventId");

CREATE UNIQUE INDEX "OrganizerStaff_inviteTokenHash_key" ON "OrganizerStaff"("inviteTokenHash");
CREATE UNIQUE INDEX "OrganizerStaff_organizerId_email_key" ON "OrganizerStaff"("organizerId", "email");
CREATE INDEX "OrganizerStaff_userId_status_idx" ON "OrganizerStaff"("userId", "status");
CREATE INDEX "OrganizerStaff_organizerId_status_idx" ON "OrganizerStaff"("organizerId", "status");
CREATE UNIQUE INDEX "OrganizerStaffEvent_staffId_eventId_key" ON "OrganizerStaffEvent"("staffId", "eventId");
CREATE INDEX "OrganizerStaffEvent_eventId_idx" ON "OrganizerStaffEvent"("eventId");

CREATE INDEX "TicketGenerationPricingTier_isActive_minQuantity_idx" ON "TicketGenerationPricingTier"("isActive", "minQuantity");
CREATE INDEX "TicketGenerationBatch_organizerId_createdAt_idx" ON "TicketGenerationBatch"("organizerId", "createdAt");
CREATE INDEX "TicketGenerationBatch_eventId_createdAt_idx" ON "TicketGenerationBatch"("eventId", "createdAt");
CREATE INDEX "TicketGenerationBatch_status_updatedAt_idx" ON "TicketGenerationBatch"("status", "updatedAt");
CREATE UNIQUE INDEX "TicketGenerationFile_batchId_partIndex_key" ON "TicketGenerationFile"("batchId", "partIndex");
CREATE UNIQUE INDEX "TicketGenerationPayment_batchId_key" ON "TicketGenerationPayment"("batchId");
CREATE UNIQUE INDEX "TicketGenerationPayment_reference_key" ON "TicketGenerationPayment"("reference");
CREATE INDEX "TicketGenerationPayment_organizerId_createdAt_idx" ON "TicketGenerationPayment"("organizerId", "createdAt");
CREATE INDEX "TicketGenerationPayment_eventId_idx" ON "TicketGenerationPayment"("eventId");
CREATE INDEX "TicketGenerationPayment_status_createdAt_idx" ON "TicketGenerationPayment"("status", "createdAt");
CREATE UNIQUE INDEX "OrganizerTicketGenerationSettings_organizerId_scopeKey_key" ON "OrganizerTicketGenerationSettings"("organizerId", "scopeKey");
CREATE UNIQUE INDEX "EventScannerSettings_eventId_key" ON "EventScannerSettings"("eventId");

-- ─── Foreign keys ───────────────────────────────────────────────────────────
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TicketGenerationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionRuleOrganizer" ADD CONSTRAINT "CommissionRuleOrganizer_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionRuleOrganizer" ADD CONSTRAINT "CommissionRuleOrganizer_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionRuleEvent" ADD CONSTRAINT "CommissionRuleEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionRuleEvent" ADD CONSTRAINT "CommissionRuleEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizerStaff" ADD CONSTRAINT "OrganizerStaff_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerStaff" ADD CONSTRAINT "OrganizerStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerStaffEvent" ADD CONSTRAINT "OrganizerStaffEvent_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "OrganizerStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerStaffEvent" ADD CONSTRAINT "OrganizerStaffEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketGenerationBatch" ADD CONSTRAINT "TicketGenerationBatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketGenerationBatch" ADD CONSTRAINT "TicketGenerationBatch_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketGenerationBatch" ADD CONSTRAINT "TicketGenerationBatch_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketGenerationBatch" ADD CONSTRAINT "TicketGenerationBatch_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "TicketGenerationPricingTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketGenerationFile" ADD CONSTRAINT "TicketGenerationFile_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TicketGenerationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketGenerationPayment" ADD CONSTRAINT "TicketGenerationPayment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TicketGenerationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketGenerationPayment" ADD CONSTRAINT "TicketGenerationPayment_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketGenerationPayment" ADD CONSTRAINT "TicketGenerationPayment_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "TicketGenerationPricingTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizerTicketGenerationSettings" ADD CONSTRAINT "OrganizerTicketGenerationSettings_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerTicketGenerationSettings" ADD CONSTRAINT "OrganizerTicketGenerationSettings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventScannerSettings" ADD CONSTRAINT "EventScannerSettings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rate limiting buckets (fixed window, shared across serverless instances)
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

-- ─── Idempotent defaults (never overwrite values an admin already set) ──────
-- The ONE authoritative default platform commission. Existing installs that
-- already have this key keep their value.
INSERT INTO "PlatformSettings" ("id", "key", "value", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'financial.defaultPlatformFeePercentage', '10', NOW(), NOW()),
  (gen_random_uuid()::text, 'commission.visibility.checkout', 'true', NOW(), NOW()),
  (gen_random_uuid()::text, 'commission.visibility.organizerDashboard', 'true', NOW(), NOW()),
  (gen_random_uuid()::text, 'commission.visibility.customerFacing', 'true', NOW(), NOW()),
  (gen_random_uuid()::text, 'ticketGeneration.maxBatchQuantity', '50000', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- Default physical-ticket generation pricing, only when no tiers exist yet.
INSERT INTO "TicketGenerationPricingTier" ("id", "label", "minQuantity", "maxQuantity", "feeKobo", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.label, v.min_q, v.max_q, v.fee, true, NOW(), NOW()
FROM (VALUES
  ('1 – 999 codes',        1,     999,   0),
  ('1,000 – 1,999 codes',  1000,  1999,  500000),
  ('2,000 – 4,999 codes',  2000,  4999,  1000000),
  ('5,000 – 9,999 codes',  5000,  9999,  2000000),
  ('10,000 – 19,999 codes',10000, 19999, 3500000),
  ('20,000+ codes',        20000, NULL::integer, 5000000)
) AS v(label, min_q, max_q, fee)
WHERE NOT EXISTS (SELECT 1 FROM "TicketGenerationPricingTier");
