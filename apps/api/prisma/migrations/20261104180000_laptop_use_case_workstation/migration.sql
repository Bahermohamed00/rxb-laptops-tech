-- Add WORKSTATION as a laptop use case. Additive only: existing enum values and rows are unchanged,
-- and no existing product is reclassified.
ALTER TYPE "LaptopUseCase" ADD VALUE IF NOT EXISTS 'WORKSTATION';
