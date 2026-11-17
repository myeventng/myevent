-- CreateTable
CREATE TABLE "MajorCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MajorCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "majorCategoryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MajorCategory_name_key" ON "MajorCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MajorCategory_slug_key" ON "MajorCategory"("slug");

-- CreateIndex
CREATE INDEX "MajorCategory_sortOrder_idx" ON "MajorCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "Category_majorCategoryId_idx" ON "Category"("majorCategoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_majorCategoryId_fkey" FOREIGN KEY ("majorCategoryId") REFERENCES "MajorCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
