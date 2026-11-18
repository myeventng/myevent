-- Optional mobile-specific feature image for events
ALTER TABLE "Event" ADD COLUMN "mobileImageUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "mobileImageWidth" INTEGER;
ALTER TABLE "Event" ADD COLUMN "mobileImageHeight" INTEGER;
