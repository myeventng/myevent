-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserSubRole" AS ENUM ('ORDINARY', 'ORGANIZER', 'STAFF', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "WaitingStatus" AS ENUM ('WAITING', 'OFFERED', 'PURCHASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('INITIATED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgeRestriction" AS ENUM ('ALL_AGES', 'AGE_14_PLUS', 'AGE_18_PLUS', 'AGE_21_PLUS', 'AGE_25_PLUS', 'KIDS_ONLY', 'SENIORS_ONLY');

-- CreateEnum
CREATE TYPE "DressCode" AS ENUM ('CASUAL', 'BUSINESS_CASUAL', 'FORMAL', 'BLACK_TIE', 'THEMED_COSTUME', 'SMART_CASUAL', 'ALL_WHITE', 'NO_DRESS_CODE');

-- CreateEnum
CREATE TYPE "PublishedStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('UNUSED', 'USED', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "OrganizerProfile" (
    "id" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "bio" TEXT,
    "website" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OrganizerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "impersonatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitingList" (
    "id" TEXT NOT NULL,
    "offerExpiresAt" TIMESTAMP(3),
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "WaitingStatus" NOT NULL DEFAULT 'WAITING',

    CONSTRAINT "WaitingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paystackId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "refundStatus" "RefundStatus",
    "eventId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "purchaseNotes" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "banned" BOOLEAN,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "gender" "Gender",
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "subRole" "UserSubRole" NOT NULL DEFAULT 'ORDINARY',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL,
    "slug" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rating" DECIMAL(65,30) NOT NULL,
    "comment" TEXT,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "ticketTypeId" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'UNUSED',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentIntentId" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "quantity" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "population" INTEGER,
    "state" TEXT NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "contactInfo" TEXT,
    "capacity" INTEGER,
    "venueImageUrl" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coverImageUrl" TEXT,
    "startDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "lateEntry" TIMESTAMP(3),
    "idRequired" BOOLEAN DEFAULT false,
    "attendeeLimit" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "embeddedVideoUrl" TEXT,
    "dressCode" "DressCode",
    "age" "AgeRestriction",
    "imageUrls" TEXT[],
    "userId" TEXT,
    "categoryId" TEXT,
    "venueId" TEXT NOT NULL,
    "cityId" TEXT,
    "isCancelled" BOOLEAN DEFAULT false,
    "publishedStatus" "PublishedStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerProfile_userId_key" ON "OrganizerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "twoFactor_userId_key" ON "twoFactor"("userId");

-- CreateIndex
CREATE INDEX "WaitingList_eventId_status_idx" ON "WaitingList"("eventId", "status");

-- CreateIndex
CREATE INDEX "WaitingList_userId_eventId_idx" ON "WaitingList"("userId", "eventId");

-- CreateIndex
CREATE INDEX "WaitingList_userId_idx" ON "WaitingList"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paystackId_key" ON "Order"("paystackId");

-- CreateIndex
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Rating_eventId_idx" ON "Rating"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketId_key" ON "Ticket"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_paymentIntentId_key" ON "Ticket"("paymentIntentId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "TicketType_eventId_idx" ON "TicketType"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE INDEX "City_name_idx" ON "City"("name");

-- CreateIndex
CREATE INDEX "Venue_cityId_idx" ON "Venue"("cityId");

-- CreateIndex
CREATE INDEX "Event_title_idx" ON "Event"("title");

-- CreateIndex
CREATE INDEX "_EventToTag_B_index" ON "_EventToTag"("B");

-- AddForeignKey
ALTER TABLE "OrganizerProfile" ADD CONSTRAINT "OrganizerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingList" ADD CONSTRAINT "WaitingList_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingList" ADD CONSTRAINT "WaitingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToTag" ADD CONSTRAINT "_EventToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToTag" ADD CONSTRAINT "_EventToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
