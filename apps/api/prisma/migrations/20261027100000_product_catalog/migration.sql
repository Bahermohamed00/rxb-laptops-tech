-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'PRE_OWNED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RamType" AS ENUM ('DDR4', 'DDR5', 'LPDDR4X', 'LPDDR5', 'LPDDR5X', 'OTHER');

-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('SSD', 'HDD', 'NVME', 'SATA', 'OTHER');

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "brand" VARCHAR(80) NOT NULL,
    "model" VARCHAR(160) NOT NULL,
    "description" VARCHAR(10000) NOT NULL DEFAULT '',
    "condition" "ProductCondition" NOT NULL,
    "conditionNotes" VARCHAR(1000),
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" CHAR(3) NOT NULL DEFAULT 'EGP',
    "priceMinor" INTEGER NOT NULL,
    "cpu" VARCHAR(200) NOT NULL,
    "gpu" VARCHAR(200) NOT NULL,
    "baseRamGB" INTEGER NOT NULL,
    "baseRamType" "RamType" NOT NULL,
    "baseStorageGB" INTEGER NOT NULL,
    "baseStorageType" "StorageType" NOT NULL,
    "displaySizeInches" DOUBLE PRECISION,
    "displayResolution" VARCHAR(80),
    "displayPanel" VARCHAR(80),
    "refreshRateHz" INTEGER,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRamOption" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "capacityGB" INTEGER NOT NULL,
    "type" "RamType" NOT NULL,
    "priceDeltaMinor" INTEGER NOT NULL DEFAULT 0,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductRamOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStorageOption" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "capacityGB" INTEGER NOT NULL,
    "type" "StorageType" NOT NULL,
    "priceDeltaMinor" INTEGER NOT NULL DEFAULT 0,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductStorageOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" UUID NOT NULL,
    "productId" UUID,
    "storageKey" VARCHAR(100) NOT NULL,
    "contentType" VARCHAR(32) NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_condition_createdAt_idx" ON "Product"("status", "condition", "createdAt");

-- CreateIndex
CREATE INDEX "Product_brand_model_idx" ON "Product"("brand", "model");

-- CreateIndex
CREATE INDEX "ProductRamOption_productId_isAvailable_idx" ON "ProductRamOption"("productId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRamOption_productId_capacityGB_type_key" ON "ProductRamOption"("productId", "capacityGB", "type");

-- CreateIndex
CREATE INDEX "ProductStorageOption_productId_isAvailable_idx" ON "ProductStorageOption"("productId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStorageOption_productId_capacityGB_type_key" ON "ProductStorageOption"("productId", "capacityGB", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_key" ON "ProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_storageKey_key" ON "ProductImage"("storageKey");

-- CreateIndex
CREATE INDEX "ProductImage_createdAt_idx" ON "ProductImage"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductRamOption" ADD CONSTRAINT "ProductRamOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStorageOption" ADD CONSTRAINT "ProductStorageOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
