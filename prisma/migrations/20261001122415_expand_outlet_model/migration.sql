/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Store` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[storeId,weekday]` on the table `StoreHour` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "StoreHour" DROP CONSTRAINT "StoreHour_storeId_fkey";

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "city" TEXT NOT NULL DEFAULT 'Depok',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "mapsUrl" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "Store_city_idx" ON "Store"("city");

-- CreateIndex
CREATE INDEX "Store_active_featured_idx" ON "Store"("active", "featured");

-- CreateIndex
CREATE INDEX "StoreHour_storeId_idx" ON "StoreHour"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreHour_storeId_weekday_key" ON "StoreHour"("storeId", "weekday");

-- AddForeignKey
ALTER TABLE "StoreHour" ADD CONSTRAINT "StoreHour_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
