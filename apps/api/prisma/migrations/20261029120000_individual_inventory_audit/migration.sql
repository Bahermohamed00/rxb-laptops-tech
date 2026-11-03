CREATE TYPE "InventoryTrackingMode" AS ENUM ('LEGACY_QUANTITY', 'INDIVIDUAL');
CREATE TYPE "UnitInventoryStatus" AS ENUM ('AVAILABLE', 'SOLD', 'REMOVED');
ALTER TABLE "Product"
  ADD COLUMN "serialNumber" VARCHAR(120),
  ADD COLUMN "serialNumberNormalized" VARCHAR(120),
  ADD COLUMN "trackingMode" "InventoryTrackingMode" NOT NULL DEFAULT 'LEGACY_QUANTITY',
  ADD COLUMN "unitStatus" "UnitInventoryStatus";
ALTER TABLE "Product" ADD CONSTRAINT "Product_serialNumber_normalized_check" CHECK (("serialNumber" IS NULL AND "serialNumberNormalized" IS NULL) OR ("serialNumber" IS NOT NULL AND "serialNumberNormalized" IS NOT NULL AND btrim("serialNumber") <> '' AND "serialNumberNormalized" = upper(btrim("serialNumber")) AND "serialNumberNormalized" ~ '^[A-Z0-9][A-Z0-9._/-]{0,119}$'));
ALTER TABLE "Product" ADD CONSTRAINT "Product_individual_inventory_check" CHECK ("trackingMode" <> 'INDIVIDUAL' OR ("productType" = 'LAPTOP' AND "serialNumber" IS NOT NULL AND "unitStatus" IS NOT NULL AND (("unitStatus" = 'AVAILABLE' AND "stockQuantity" = 1) OR ("unitStatus" IN ('SOLD', 'REMOVED') AND "stockQuantity" = 0))));
CREATE UNIQUE INDEX "Product_serialNumberNormalized_key" ON "Product"("serialNumberNormalized");
CREATE TABLE "AuditEvent" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "adminUserId" UUID,
  "actorEmail" VARCHAR(254),
  "action" VARCHAR(80) NOT NULL,
  "entityType" VARCHAR(80) NOT NULL,
  "entityId" VARCHAR(120),
  "summary" VARCHAR(500) NOT NULL,
  "outcome" VARCHAR(24) NOT NULL DEFAULT 'SUCCESS',
  "reason" VARCHAR(500),
  "changes" JSONB NOT NULL DEFAULT '{}',
  "requestId" VARCHAR(120),
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditEvent_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditEvent_createdAt_id_idx" ON "AuditEvent"("createdAt", "id");
CREATE INDEX "AuditEvent_adminUserId_createdAt_idx" ON "AuditEvent"("adminUserId", "createdAt");
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");
