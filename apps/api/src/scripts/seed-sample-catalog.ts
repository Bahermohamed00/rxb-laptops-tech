import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma-client/client.js';

const sampleNote = 'SAMPLE / TEST LISTING - No physical inventory has been verified. This placeholder record is for catalog and search testing only.';
const samples = [
  { slug: 'sample-test-dell-latitude-5440', brand: 'Dell', model: 'Latitude 5440', useCase: 'WORK', priceMinor: 42_900_00, cpu: 'Intel Core i5-1345U', gpu: 'Intel Iris Xe Graphics', ramGB: 16, ramType: 'DDR5', storageGB: 512, storageType: 'NVME', screen: 14, resolution: '1920 x 1080', panel: 'IPS', refresh: 60 },
  { slug: 'sample-test-lenovo-thinkpad-e14', brand: 'Lenovo', model: 'ThinkPad E14 Gen 5', useCase: 'STUDY', priceMinor: 38_500_00, cpu: 'AMD Ryzen 5 7530U', gpu: 'AMD Radeon Graphics', ramGB: 16, ramType: 'DDR4', storageGB: 512, storageType: 'NVME', screen: 14, resolution: '1920 x 1200', panel: 'IPS', refresh: 60 },
  { slug: 'sample-test-hp-elitebook-840', brand: 'HP', model: 'EliteBook 840 G10', useCase: 'WORK', priceMinor: 54_900_00, cpu: 'Intel Core i7-1355U', gpu: 'Intel Iris Xe Graphics', ramGB: 16, ramType: 'DDR5', storageGB: 1_024, storageType: 'NVME', screen: 14, resolution: '1920 x 1200', panel: 'IPS', refresh: 60 },
  { slug: 'sample-test-asus-tuf-a15', brand: 'ASUS', model: 'TUF Gaming A15', useCase: 'GAMING', priceMinor: 67_900_00, cpu: 'AMD Ryzen 7 7735HS', gpu: 'NVIDIA GeForce RTX 4060', ramGB: 16, ramType: 'DDR5', storageGB: 1_024, storageType: 'NVME', screen: 15, resolution: '1920 x 1080', panel: 'IPS', refresh: 144 },
  { slug: 'sample-test-acer-swift-go-14', brand: 'Acer', model: 'Swift Go 14', useCase: 'STUDY', priceMinor: 49_500_00, cpu: 'Intel Core Ultra 5 125H', gpu: 'Intel Arc Graphics', ramGB: 16, ramType: 'LPDDR5X', storageGB: 512, storageType: 'NVME', screen: 14, resolution: '2880 x 1800', panel: 'OLED', refresh: 90 },
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (process.env.RXB_ALLOW_SAMPLE_CATALOG_SEED !== 'YES' || process.env.NODE_ENV === 'production' || !connectionString) {
    throw new Error('Sample seed blocked. Explicit opt-in and a non-production development database are required.');
  }
  const database = new URL(connectionString);
  const databaseName = decodeURIComponent(database.pathname.slice(1).split('?')[0]);
  if (databaseName !== 'rxb_dev') throw new Error('Sample seed is restricted to the verified local rxb_dev database.');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await prisma.$connect();
    const target = await prisma.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
    if (target[0]?.database !== 'rxb_dev') throw new Error('Connected database did not match the verified local seed target.');

    for (const sample of samples) {
      await prisma.$transaction(async tx => {
        const existing = await tx.product.findUnique({ where: { slug: sample.slug }, include: { inventoryAdjustments: true } });
        if (existing && (!existing.description.startsWith('SAMPLE / TEST LISTING') || existing.stockQuantity !== 0 || existing.inventoryAdjustments.length > 0)) {
          throw new Error(`Refusing to overwrite non-sample or inventoried product "${sample.slug}".`);
        }
        const baseData = {
          brand: sample.brand,
          model: sample.model,
          description: sampleNote,
          condition: 'NEW' as const,
          conditionNotes: sampleNote,
          useCase: sample.useCase,
          status: 'ACTIVE' as const,
          currency: 'EGP',
          priceMinor: sample.priceMinor,
          cpu: sample.cpu,
          gpu: sample.gpu,
          baseRamGB: sample.ramGB,
          baseRamType: sample.ramType,
          baseStorageGB: sample.storageGB,
          baseStorageType: sample.storageType,
          displaySizeInches: sample.screen,
          displayResolution: sample.resolution,
          displayPanel: sample.panel,
          refreshRateHz: sample.refresh,
          stockQuantity: 0,
        };
        const ramOptions = [{ capacityGB: sample.ramGB, type: sample.ramType, priceDeltaMinor: 0, isBase: true, isAvailable: true }];
        const storageOptions = [{ capacityGB: sample.storageGB, type: sample.storageType, priceDeltaMinor: 0, isBase: true, isAvailable: true }];
        if (!existing) {
          const created = await tx.product.create({
            data: {
              slug: sample.slug,
              ...baseData,
              ramOptions: { create: ramOptions },
              storageOptions: { create: storageOptions },
            },
          });
          await tx.productUpgradeCombination.create({
            data: { productId: created.id, ramCapacityGB: sample.ramGB, ramType: sample.ramType, storageCapacityGB: sample.storageGB, storageType: sample.storageType, isAvailable: true },
          });
          return;
        }
        await tx.productUpgradeCombination.deleteMany({ where: { productId: existing.id } });
        await tx.productRamOption.deleteMany({ where: { productId: existing.id } });
        await tx.productStorageOption.deleteMany({ where: { productId: existing.id } });
        await tx.product.update({ where: { id: existing.id }, data: { ...baseData, ramOptions: { create: ramOptions }, storageOptions: { create: storageOptions } } });
        await tx.productUpgradeCombination.create({
          data: { productId: existing.id, ramCapacityGB: sample.ramGB, ramType: sample.ramType, storageCapacityGB: sample.storageGB, storageType: sample.storageType, isAvailable: true },
        });
      });
    }
    console.log(`Seeded ${samples.length} clearly marked sample listings with zero stock in ${target[0].database}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : '';
  if (message.startsWith('Sample seed blocked.') || message.startsWith('Sample seed is restricted.') || message.startsWith('Connected database did not match') || message.startsWith('Refusing to overwrite')) {
    console.error(message);
  } else {
    const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? ` (${error.code})` : '';
    console.error(`Sample seed failed${code}; inspect local database/API logs for details.`);
  }
  process.exitCode = 1;
});
