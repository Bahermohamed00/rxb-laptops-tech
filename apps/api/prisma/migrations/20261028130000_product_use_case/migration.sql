CREATE TYPE "LaptopUseCase" AS ENUM ('WORK', 'STUDY', 'GAMING');

ALTER TABLE "Product"
    ADD COLUMN "useCase" "LaptopUseCase";
