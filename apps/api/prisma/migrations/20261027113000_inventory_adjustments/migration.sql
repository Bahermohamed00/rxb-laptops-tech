-- Persist the reason and actor for each real inventory quantity change.
CREATE TABLE "InventoryAdjustment" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryAdjustment_productId_createdAt_idx" ON "InventoryAdjustment"("productId", "createdAt");
CREATE INDEX "InventoryAdjustment_adminUserId_createdAt_idx" ON "InventoryAdjustment"("adminUserId", "createdAt");

ALTER TABLE "InventoryAdjustment"
    ADD CONSTRAINT "InventoryAdjustment_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryAdjustment"
    ADD CONSTRAINT "InventoryAdjustment_adminUserId_fkey"
    FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
