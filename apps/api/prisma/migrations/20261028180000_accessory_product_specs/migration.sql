ALTER TABLE "Product"
    ADD COLUMN "specs" JSONB NOT NULL DEFAULT '{}'::jsonb;
