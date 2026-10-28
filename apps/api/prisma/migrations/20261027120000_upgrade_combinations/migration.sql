-- An allowed pair is explicit per product; independent RAM/storage options do
-- not imply that every cross-product combination is supported by the laptop.
CREATE TABLE "ProductUpgradeCombination" (
    "productId" UUID NOT NULL,
    "ramCapacityGB" INTEGER NOT NULL,
    "ramType" "RamType" NOT NULL,
    "storageCapacityGB" INTEGER NOT NULL,
    "storageType" "StorageType" NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductUpgradeCombination_pkey" PRIMARY KEY ("productId", "ramCapacityGB", "ramType", "storageCapacityGB", "storageType")
);

CREATE INDEX "ProductUpgradeCombination_productId_isAvailable_idx" ON "ProductUpgradeCombination"("productId", "isAvailable");

ALTER TABLE "ProductUpgradeCombination"
    ADD CONSTRAINT "ProductUpgradeCombination_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductUpgradeCombination"
    ADD CONSTRAINT "ProductUpgradeCombination_productId_ramCapacityGB_ramType_fkey"
    FOREIGN KEY ("productId", "ramCapacityGB", "ramType") REFERENCES "ProductRamOption"("productId", "capacityGB", "type") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductUpgradeCombination"
    ADD CONSTRAINT "ProductUpgradeCombination_productId_storageCapacityGB_storageType_fkey"
    FOREIGN KEY ("productId", "storageCapacityGB", "storageType") REFERENCES "ProductStorageOption"("productId", "capacityGB", "type") ON DELETE RESTRICT ON UPDATE CASCADE;
