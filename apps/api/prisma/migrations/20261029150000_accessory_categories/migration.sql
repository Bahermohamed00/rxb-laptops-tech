CREATE TABLE "AccessoryCategory" (
  "id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "normalizedName" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "description" VARCHAR(2000) NOT NULL DEFAULT '',
  "imageUrl" VARCHAR(2048),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "AccessoryCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccessoryCategory_normalizedName_check" CHECK ("normalizedName" = lower(btrim("name")) AND "normalizedName" <> ''),
  CONSTRAINT "AccessoryCategory_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
CREATE UNIQUE INDEX "AccessoryCategory_normalizedName_key" ON "AccessoryCategory"("normalizedName");
CREATE UNIQUE INDEX "AccessoryCategory_slug_key" ON "AccessoryCategory"("slug");
CREATE INDEX "AccessoryCategory_isActive_name_idx" ON "AccessoryCategory"("isActive", "name");

INSERT INTO "AccessoryCategory" ("id", "name", "normalizedName", "slug", "description", "isActive", "updatedAt") VALUES
  ('52f5398e-c79b-4caa-b6c5-f2d60db7a101', 'Mice', 'mice', 'mice', '', true, CURRENT_TIMESTAMP),
  ('52f5398e-c79b-4caa-b6c5-f2d60db7a102', 'Keyboards', 'keyboards', 'keyboards', '', true, CURRENT_TIMESTAMP),
  ('52f5398e-c79b-4caa-b6c5-f2d60db7a103', 'Headsets & Audio', 'headsets & audio', 'headsets-audio', '', true, CURRENT_TIMESTAMP),
  ('52f5398e-c79b-4caa-b6c5-f2d60db7a104', 'Monitors', 'monitors', 'monitors', '', true, CURRENT_TIMESTAMP),
  ('52f5398e-c79b-4caa-b6c5-f2d60db7a105', 'Cables & Adapters', 'cables & adapters', 'cables-adapters', '', true, CURRENT_TIMESTAMP),
  ('52f5398e-c79b-4caa-b6c5-f2d60db7a106', 'Other Accessories', 'other accessories', 'other-accessories', '', true, CURRENT_TIMESTAMP);

ALTER TABLE "Product"
  ADD COLUMN "sku" VARCHAR(80),
  ADD COLUMN "skuNormalized" VARCHAR(80),
  ADD COLUMN "accessoryCategoryId" UUID,
  ADD CONSTRAINT "Product_sku_normalized_check" CHECK (("sku" IS NULL AND "skuNormalized" IS NULL) OR ("sku" IS NOT NULL AND "skuNormalized" = upper(btrim("sku")) AND "skuNormalized" ~ '^[A-Z0-9][A-Z0-9._/-]{0,79}$')),
  ADD CONSTRAINT "Product_accessory_category_check" CHECK ("productType" <> 'LAPTOP' OR "accessoryCategoryId" IS NULL);
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX "Product_skuNormalized_key" ON "Product"("skuNormalized");
CREATE INDEX "Product_accessoryCategoryId_idx" ON "Product"("accessoryCategoryId");
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_accessoryCategoryId_fkey"
  FOREIGN KEY ("accessoryCategoryId") REFERENCES "AccessoryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
