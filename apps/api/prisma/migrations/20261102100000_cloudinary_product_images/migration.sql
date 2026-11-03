ALTER TABLE "ProductImage"
  ADD COLUMN "cloudinaryPublicId" VARCHAR(255),
  ADD COLUMN "cloudinarySecureUrl" VARCHAR(2048);

CREATE UNIQUE INDEX "ProductImage_cloudinaryPublicId_key"
  ON "ProductImage"("cloudinaryPublicId");

ALTER TABLE "ProductImage"
  ADD CONSTRAINT "ProductImage_cloudinary_metadata_check"
  CHECK (
    ("cloudinaryPublicId" IS NULL AND "cloudinarySecureUrl" IS NULL)
    OR ("cloudinaryPublicId" IS NOT NULL AND "cloudinarySecureUrl" IS NOT NULL)
  );
