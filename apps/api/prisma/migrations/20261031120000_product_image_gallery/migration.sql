-- DropIndex
DROP INDEX "ProductImage_productId_key";

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");
