import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma-client/client.js';
import { ProductSearchDto } from './products.dto.js';
import type { ProductDto, UpdateInventoryDto } from './products.dto.js';
import { ImagesService } from '../images/images.service.js';

const include = {
  ramOptions: true, storageOptions: true, combinations: true,
  images: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.ProductInclude;
type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof include }>;

function invalidProduct(message: string, fieldErrors: Record<string, string>): never {
  throw new BadRequestException({ message, fieldErrors });
}

type AccessorySpecRule =
  | { kind: 'choice'; required: boolean; values: readonly string[] }
  | { kind: 'text'; required: boolean; maxLength: number }
  | { kind: 'integer'; required: boolean; min: number; max: number };

const accessorySpecRules = {
  KEYBOARD: {
    keyboardType: { kind: 'choice', required: true, values: ['Mechanical', 'Membrane'] },
    connection: { kind: 'choice', required: true, values: ['Wired', 'Wireless'] },
    layout: { kind: 'choice', required: true, values: ['EN', 'AR', 'EN+AR'] },
    backlight: { kind: 'choice', required: true, values: ['RGB', 'None'] },
  },
  MOUSE: {
    connection: { kind: 'choice', required: true, values: ['Wired', 'Wireless'] },
    dpi: { kind: 'integer', required: true, min: 1, max: 100_000 },
    buttonCount: { kind: 'integer', required: true, min: 1, max: 50 },
    color: { kind: 'text', required: true, maxLength: 80 },
  },
  MOUSE_PAD: {
    size: { kind: 'choice', required: true, values: ['Small', 'Medium', 'Large', 'XL'] },
    material: { kind: 'text', required: true, maxLength: 100 },
    color: { kind: 'text', required: true, maxLength: 80 },
  },
  OTHER_ACCESSORY: {
    categoryName: { kind: 'text', required: true, maxLength: 80 },
    additionalNotes: { kind: 'text', required: false, maxLength: 500 },
  },
} as const satisfies Record<Exclude<ProductDto['productType'], 'LAPTOP'>, Record<string, AccessorySpecRule>>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly images: ImagesService) {}

  private validateOptions(input: ProductDto): Record<string, string | number> {
    const productType = input.productType ?? 'LAPTOP';
    const invalidSlug = !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim().toLowerCase());
    if (invalidSlug || !input.brand.trim() || !input.model.trim()) {
      invalidProduct('Correct the highlighted product fields.', {
        ...(invalidSlug ? { slug: 'Use lowercase letters, numbers, and single hyphens in the URL slug.' } : {}),
        ...(!input.brand.trim() ? { brand: 'Brand is required.' } : {}),
        ...(!input.model.trim() ? { model: 'Product name and model are required.' } : {}),
      });
    }
    if (!Number.isSafeInteger(input.priceMinor) || input.priceMinor < 1 || !Number.isSafeInteger(input.stockQuantity) || input.stockQuantity < 0) {
      invalidProduct('Correct the highlighted product fields.', {
        ...(!Number.isSafeInteger(input.priceMinor) || input.priceMinor < 1 ? { priceMinor: 'Enter a valid price greater than zero.' } : {}),
        ...(!Number.isSafeInteger(input.stockQuantity) || input.stockQuantity < 0 ? { stockQuantity: 'Enter a non-negative whole-number quantity.' } : {}),
      });
    }
    if (productType !== 'LAPTOP') {
      const hasLaptopFields = input.useCase != null || Boolean(input.cpu?.trim()) || Boolean(input.gpu?.trim())
        || input.baseRamGB != null || input.baseRamType != null || input.baseStorageGB != null || input.baseStorageType != null
        || input.displaySizeInches != null || Boolean(input.displayResolution?.trim()) || Boolean(input.displayPanel?.trim())
        || input.refreshRateHz != null || (input.ramOptions?.length ?? 0) > 0 || (input.storageOptions?.length ?? 0) > 0
        || (input.combinations?.length ?? 0) > 0;
      if (hasLaptopFields) invalidProduct('Accessory products cannot have laptop specifications or upgrade options.', {
        productType: 'Remove laptop-only specifications and RAM/storage options from this accessory.',
      });
      return this.validateAccessorySpecs(productType, input.specs ?? {});
    }
    if (Object.keys(input.specs ?? {}).length) invalidProduct('Laptop products cannot have accessory specifications.', {
      specs: 'Remove accessory-only specifications from this laptop.',
    });
    const laptopErrors: Record<string, string> = {};
    if (!input.cpu?.trim()) laptopErrors.cpu = 'Enter the installed processor.';
    if (!input.gpu?.trim()) laptopErrors.gpu = 'Enter installed graphics or specify integrated graphics.';
    if (input.baseRamGB == null) laptopErrors.baseRamGB = 'Enter the installed laptop RAM capacity.';
    if (!input.baseRamType) laptopErrors.baseRamType = 'Select the installed laptop RAM type.';
    if (input.baseStorageGB == null) laptopErrors.baseStorageGB = 'Enter the installed laptop storage capacity.';
    if (!input.baseStorageType) laptopErrors.baseStorageType = 'Select the installed laptop storage type.';
    if (!input.ramOptions?.length) laptopErrors.ramOptions = 'Add supported RAM options for this laptop.';
    if (!input.storageOptions?.length) laptopErrors.storageOptions = 'Add supported storage options for this laptop.';
    if (Object.keys(laptopErrors).length) invalidProduct('Complete the required laptop specifications.', laptopErrors);

    const baseRamGB = input.baseRamGB!;
    const baseRamType = input.baseRamType!;
    const baseStorageGB = input.baseStorageGB!;
    const baseStorageType = input.baseStorageType!;
    const ramOptions = input.ramOptions ?? [];
    const storageOptions = input.storageOptions ?? [];
    const combinationsInput = input.combinations ?? [];
    const ramBase = ramOptions.filter(option => option.isBase);
    const storageBase = storageOptions.filter(option => option.isBase);
    if (ramBase.length !== 1 || storageBase.length !== 1) invalidProduct('Choose exactly one base option for RAM and storage.', {
      ...(ramBase.length !== 1 ? { ramOptions: 'Mark exactly one supported RAM option as the base configuration.' } : {}),
      ...(storageBase.length !== 1 ? { storageOptions: 'Mark exactly one supported storage option as the base configuration.' } : {}),
    });
    const baseErrors: Record<string, string> = {};
    if (ramBase[0].capacityGB !== baseRamGB) baseErrors.baseRamGB = 'The base RAM capacity must match the installed laptop RAM.';
    if (ramBase[0].type !== baseRamType) baseErrors.baseRamType = 'The selected RAM type is not compatible with the installed laptop RAM.';
    if (ramBase[0].priceDeltaMinor !== 0 || !ramBase[0].isAvailable) baseErrors.ramOptions = 'The base RAM option must be available with a zero price difference.';
    if (storageBase[0].capacityGB !== baseStorageGB) baseErrors.baseStorageGB = 'The base storage capacity must match the installed laptop storage.';
    if (storageBase[0].type !== baseStorageType) baseErrors.baseStorageType = 'The selected storage type is not compatible with the installed laptop storage.';
    if (storageBase[0].priceDeltaMinor !== 0 || !storageBase[0].isAvailable) baseErrors.storageOptions = 'The base storage option must be available with a zero price difference.';
    if (Object.keys(baseErrors).length) invalidProduct("The base configuration must match the laptop's installed memory and storage.", baseErrors);
    for (const option of input.ramOptions) if (option.isBase && !option.isAvailable) throw new BadRequestException('Base RAM cannot be unavailable.');
    for (const option of input.storageOptions) if (option.isBase && !option.isAvailable) throw new BadRequestException('Base storage cannot be unavailable.');
    const ramKeys = new Set(ramOptions.map(option => `${option.capacityGB}:${option.type}`));
    const storageKeys = new Set(storageOptions.map(option => `${option.capacityGB}:${option.type}`));
    const combinations = new Set<string>();
    for (const combination of combinationsInput) {
      const key = `${combination.ramCapacityGB}:${combination.ramType}/${combination.storageCapacityGB}:${combination.storageType}`;
      if (combinations.has(key) || !ramKeys.has(`${combination.ramCapacityGB}:${combination.ramType}`) || !storageKeys.has(`${combination.storageCapacityGB}:${combination.storageType}`)) {
        invalidProduct('A supported configuration is duplicated or refers to an option that is not listed.', { combinations: 'Choose a unique RAM/storage pair using existing options.' });
      }
      combinations.add(key);
      if (combination.isAvailable && (!ramOptions.some(option => option.capacityGB === combination.ramCapacityGB && option.type === combination.ramType && option.isAvailable) || !storageOptions.some(option => option.capacityGB === combination.storageCapacityGB && option.type === combination.storageType && option.isAvailable))) {
        invalidProduct('An available configuration must use available RAM and storage options.', { combinations: 'Mark the RAM and storage options available, or mark this combination unavailable.' });
      }
    }
    if (!combinationsInput.some(combination => combination.isAvailable && combination.ramCapacityGB === ramBase[0].capacityGB && combination.ramType === ramBase[0].type && combination.storageCapacityGB === storageBase[0].capacityGB && combination.storageType === storageBase[0].type)) {
      invalidProduct('The base configuration must be available.', { combinations: 'Add the matching base RAM and storage pair as an available combination.' });
    }
    return {};
  }

  private validateAccessorySpecs(
    productType: Exclude<ProductDto['productType'], 'LAPTOP'>,
    specs: Record<string, unknown>,
  ): Record<string, string | number> {
    const rules = accessorySpecRules[productType];
    const errors: Record<string, string> = {};
    const normalized: Record<string, string | number> = {};
    for (const key of Object.keys(specs)) {
      if (!(key in rules)) errors[`specs.${key}`] = 'This specification is not supported for the selected product type.';
    }
    for (const [key, rule] of Object.entries(rules)) {
      const value = specs[key];
      if (value === undefined || value === null || value === '') {
        if (rule.required) errors[`specs.${key}`] = 'This specification is required.';
        continue;
      }
      if (rule.kind === 'choice') {
        if (typeof value !== 'string' || !rule.values.includes(value)) errors[`specs.${key}`] = 'Choose a supported value.';
        else normalized[key] = value;
      } else if (rule.kind === 'integer') {
        if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < rule.min || value > rule.max) {
          errors[`specs.${key}`] = `Enter a whole number between ${rule.min} and ${rule.max}.`;
        } else normalized[key] = value;
      } else if (typeof value !== 'string' || !value.trim() || value.length > rule.maxLength) {
        errors[`specs.${key}`] = `Enter text with at most ${rule.maxLength} characters.`;
      } else normalized[key] = value.trim();
    }
    if (Object.keys(errors).length) invalidProduct('Complete the required specifications for this product type.', errors);
    return normalized;
  }

  // `imageIds` is the ordered gallery; the legacy single `imageId` is accepted
  // when no gallery is sent. The first image is the product's main image.
  private async checkedImages(input: ProductDto, currentProductId?: string): Promise<string[]> {
    const imageIds = input.imageIds ?? (input.imageId ? [input.imageId] : []);
    if (new Set(imageIds).size !== imageIds.length) invalidProduct('Each product image can only be used once.', { imageIds: 'Remove the duplicated image.' });
    if (!imageIds.length) return [];
    const images = await this.prisma.productImage.findMany({ where: { id: { in: imageIds } } });
    if (images.length !== imageIds.length || images.some(image => image.productId && image.productId !== currentProductId)) {
      invalidProduct('A selected product image is unavailable.', { imageIds: 'Upload a JPEG, PNG, or WebP image and select it again.' });
    }
    return imageIds;
  }

  private async attachImages(tx: Prisma.TransactionClient, productId: string, imageIds: string[]) {
    for (const [position, id] of imageIds.entries()) {
      const attached = await tx.productImage.updateMany({ where: { id, productId: null }, data: { productId, position } });
      if (attached.count !== 1) throw new ConflictException('A selected product image is already attached elsewhere.');
    }
  }

  async create(input: ProductDto) {
    const specs = this.validateOptions(input);
    const imageIds = await this.checkedImages(input);
    const productType = input.productType ?? 'LAPTOP';
    const laptop = productType === 'LAPTOP';
    const ramOptions = input.ramOptions ?? [];
    const storageOptions = input.storageOptions ?? [];
    const combinations = input.combinations ?? [];
    try {
      const product = await this.prisma.$transaction(async tx => {
        const created = await tx.product.create({
        data: {
          slug: input.slug.trim().toLowerCase(), productType, brand: input.brand.trim(), model: input.model.trim(), description: input.description?.trim() ?? '',
          condition: input.condition, conditionNotes: input.conditionNotes?.trim(), useCase: laptop ? input.useCase ?? null : null, status: input.status, priceMinor: input.priceMinor,
          specs,
          cpu: laptop ? input.cpu!.trim() : null, gpu: laptop ? input.gpu!.trim() : null,
          baseRamGB: laptop ? input.baseRamGB! : null, baseRamType: laptop ? input.baseRamType! : null,
          baseStorageGB: laptop ? input.baseStorageGB! : null, baseStorageType: laptop ? input.baseStorageType! : null,
          displaySizeInches: laptop ? input.displaySizeInches ?? null : null,
          displayResolution: laptop ? input.displayResolution?.trim() ?? null : null, displayPanel: laptop ? input.displayPanel?.trim() ?? null : null, refreshRateHz: laptop ? input.refreshRateHz ?? null : null,
          stockQuantity: input.stockQuantity,
          ramOptions: { create: ramOptions.map(({ id: _id, ...option }) => option) },
          storageOptions: { create: storageOptions.map(({ id: _id, ...option }) => option) },
        }, include });
        if (combinations.length) await tx.productUpgradeCombination.createMany({ data: combinations.map(combination => ({ ...combination, productId: created.id })) });
        await this.attachImages(tx, created.id, imageIds);
        return tx.product.findUniqueOrThrow({ where: { id: created.id }, include });
      });
      return this.adminProduct(product);
    } catch (error) {
      if (isUniqueError(error)) throw uniqueConflict(error);
      throw error;
    }
  }

  async update(id: string, input: ProductDto) {
    const specs = this.validateOptions(input);
    const existing = await this.prisma.product.findUnique({ where: { id }, include });
    if (!existing) throw new NotFoundException('Product not found.');
    const imageIds = await this.checkedImages(input, id);
    const productType = input.productType ?? 'LAPTOP';
    const laptop = productType === 'LAPTOP';
    const ramOptions = input.ramOptions ?? [];
    const storageOptions = input.storageOptions ?? [];
    const combinations = input.combinations ?? [];
    try {
      const updated = await this.prisma.$transaction(async tx => {
        await tx.productUpgradeCombination.deleteMany({ where: { productId: id } });
        await tx.productRamOption.deleteMany({ where: { productId: id } });
        await tx.productStorageOption.deleteMany({ where: { productId: id } });
        await tx.productImage.updateMany({ where: { productId: id }, data: { productId: null, position: 0 } });
        await this.attachImages(tx, id, imageIds);
        const product = await tx.product.update({ where: { id }, data: {
          slug: input.slug.trim().toLowerCase(), productType, brand: input.brand.trim(), model: input.model.trim(), description: input.description?.trim() ?? '',
          condition: input.condition, conditionNotes: input.conditionNotes?.trim(), useCase: laptop ? input.useCase ?? null : null, status: input.status, priceMinor: input.priceMinor,
          specs,
          cpu: laptop ? input.cpu!.trim() : null, gpu: laptop ? input.gpu!.trim() : null,
          baseRamGB: laptop ? input.baseRamGB! : null, baseRamType: laptop ? input.baseRamType! : null,
          baseStorageGB: laptop ? input.baseStorageGB! : null, baseStorageType: laptop ? input.baseStorageType! : null,
          displaySizeInches: laptop ? input.displaySizeInches ?? null : null,
          displayResolution: laptop ? input.displayResolution?.trim() ?? null : null, displayPanel: laptop ? input.displayPanel?.trim() ?? null : null, refreshRateHz: laptop ? input.refreshRateHz ?? null : null,
          stockQuantity: input.stockQuantity,
          ramOptions: { create: ramOptions.map(({ id: _id, ...option }) => option) },
          storageOptions: { create: storageOptions.map(({ id: _id, ...option }) => option) },
        }, include });
        if (combinations.length) await tx.productUpgradeCombination.createMany({ data: combinations.map(combination => ({ ...combination, productId: id })) });
        return this.adminProduct(await tx.product.findUniqueOrThrow({ where: { id }, include }));
      });
      for (const image of existing.images) {
        if (!imageIds.includes(image.id)) await this.images.deleteUnattached(image.id).catch(() => undefined);
      }
      return updated;
    } catch (error) {
      if (isUniqueError(error)) throw uniqueConflict(error);
      throw error;
    }
  }

  async archive(id: string) {
    try { return await this.prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } }); }
    catch (error) { if (isMissingError(error)) throw new NotFoundException('Product not found.'); throw error; }
  }

  async updateInventory(id: string, input: UpdateInventoryDto, adminUserId: string) {
    const reason = input.reason.trim();
    if (!reason) throw new BadRequestException('Enter a reason for this stock adjustment.');
    try {
      return await this.prisma.$transaction(async tx => {
        const current = await tx.product.findUnique({ where: { id }, select: { stockQuantity: true } });
        if (!current) throw new NotFoundException('Product not found.');
        if (current.stockQuantity === input.stockQuantity) {
          return tx.product.findUniqueOrThrow({ where: { id }, select: { id: true, slug: true, stockQuantity: true, status: true, updatedAt: true } });
        }
        const changed = await tx.product.updateMany({ where: { id, stockQuantity: current.stockQuantity }, data: { stockQuantity: input.stockQuantity } });
        if (changed.count !== 1) throw new ConflictException('Inventory changed. Refresh and try again.');
        await tx.inventoryAdjustment.create({ data: { productId: id, adminUserId, previousQuantity: current.stockQuantity, newQuantity: input.stockQuantity, reason } });
        return tx.product.findUniqueOrThrow({ where: { id }, select: { id: true, slug: true, stockQuantity: true, status: true, updatedAt: true } });
      });
    } catch (error) { if (isMissingError(error)) throw new NotFoundException('Product not found.'); throw error; }
  }

  async adminList(query: ProductSearchDto = new ProductSearchDto()) {
    if (query.minPriceMinor !== undefined && query.maxPriceMinor !== undefined && query.minPriceMinor > query.maxPriceMinor) {
      throw new BadRequestException({ message: 'Maximum price must be greater than or equal to minimum price.', fieldErrors: { maxPriceMinor: 'Maximum price cannot be lower than minimum price.' } });
    }
    const text = query.q?.trim();
    const number = text && /^\d+$/.test(text) ? Number(text) : undefined;
    const ramType = text && ['DDR4', 'DDR5', 'LPDDR4X', 'LPDDR5', 'LPDDR5X', 'OTHER'].includes(text.toUpperCase()) ? text.toUpperCase() as ProductSearchDto['ramType'] : undefined;
    const storageType = text && ['SSD', 'HDD', 'NVME', 'SATA', 'OTHER'].includes(text.toUpperCase()) ? text.toUpperCase() as ProductSearchDto['storageType'] : undefined;
    const where: Prisma.ProductWhereInput = {
      ...(query.condition ? { condition: query.condition } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.productType ? { productType: query.productType } : {}),
      ...(query.useCase === 'UNCATEGORIZED' ? { useCase: null } : query.useCase ? { useCase: query.useCase } : {}),
      ...(query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined ? {
        priceMinor: {
          ...(query.minPriceMinor !== undefined ? { gte: query.minPriceMinor } : {}),
          ...(query.maxPriceMinor !== undefined ? { lte: query.maxPriceMinor } : {}),
        },
      } : {}),
      ...(query.cpu?.trim() ? { cpu: { contains: query.cpu.trim(), mode: 'insensitive' } } : {}),
      ...(query.gpu?.trim() ? { gpu: { contains: query.gpu.trim(), mode: 'insensitive' } } : {}),
      ...(query.ramGB !== undefined || query.ramType ? {
        ramOptions: { some: { ...(query.ramGB !== undefined ? { capacityGB: query.ramGB } : {}), ...(query.ramType ? { type: query.ramType } : {}) } },
      } : {}),
      ...(query.storageGB !== undefined || query.storageType ? {
        storageOptions: { some: { ...(query.storageGB !== undefined ? { capacityGB: query.storageGB } : {}), ...(query.storageType ? { type: query.storageType } : {}) } },
      } : {}),
      ...(query.displaySizeInches !== undefined ? { displaySizeInches: query.displaySizeInches } : {}),
      ...(query.displayResolution?.trim() ? { displayResolution: { contains: query.displayResolution.trim(), mode: 'insensitive' } } : {}),
      ...(text ? {
        OR: [
          { brand: { contains: text, mode: 'insensitive' } },
          { model: { contains: text, mode: 'insensitive' } },
          { slug: { contains: text, mode: 'insensitive' } },
          { description: { contains: text, mode: 'insensitive' } },
          { cpu: { contains: text, mode: 'insensitive' } },
          { gpu: { contains: text, mode: 'insensitive' } },
          { displayResolution: { contains: text, mode: 'insensitive' } },
          ...(number !== undefined && Number.isSafeInteger(number) ? [{ baseRamGB: number }, { baseStorageGB: number }, { displaySizeInches: number }] : []),
          ...(ramType ? [{ baseRamType: ramType }, { ramOptions: { some: { type: ramType } } }] : []),
          ...(storageType ? [{ baseStorageType: storageType }, { storageOptions: { some: { type: storageType } } }] : []),
        ],
      } : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = query.sort === 'PRICE_ASC' ? [{ priceMinor: 'asc' }, { id: 'asc' }]
      : query.sort === 'PRICE_DESC' ? [{ priceMinor: 'desc' }, { id: 'asc' }]
        : query.sort === 'NAME_ASC' ? [{ brand: 'asc' }, { model: 'asc' }]
          : query.sort === 'NAME_DESC' ? [{ brand: 'desc' }, { model: 'desc' }]
            : query.sort === 'CREATED_DESC' ? [{ createdAt: 'desc' }]
              : [{ updatedAt: 'desc' }];
    const page = query.page || 1;
    const pageSize = query.pageSize || 12;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, include, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { items: items.map(product => this.adminProduct(product)), total, page, pageSize };
  }
  async adminDetail(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include });
    if (!product) throw new NotFoundException('Product not found.');
    return this.adminProduct(product);
  }

  async publicList() {
    const products = await this.prisma.product.findMany({ where: { status: 'ACTIVE' }, include, orderBy: { createdAt: 'desc' }, take: 100 });
    return products.map(product => this.publicProduct(product));
  }
  async publicDetail(slug: string) {
    const product = await this.prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, include });
    if (!product) throw new NotFoundException('Product not found.');
    return this.publicProduct(product);
  }

  private adminProduct(product: ProductWithRelations) {
    const { images: records, ...fields } = product;
    const images = records.map(image => ({ id: image.id, contentType: image.contentType, byteSize: image.byteSize, imageUrl: `/api/public/images/${image.id}` }));
    return { ...fields, image: images[0] ?? null, images };
  }

  private publicProduct(product: ProductWithRelations) {
    const compatible = product.combinations.filter(combination => combination.isAvailable &&
      product.ramOptions.some(option => option.isAvailable && option.capacityGB === combination.ramCapacityGB && option.type === combination.ramType) &&
      product.storageOptions.some(option => option.isAvailable && option.capacityGB === combination.storageCapacityGB && option.type === combination.storageType));
    const ramIds = new Set(compatible.flatMap(combination => product.ramOptions.filter(option => option.capacityGB === combination.ramCapacityGB && option.type === combination.ramType).map(option => option.id)));
    const storageIds = new Set(compatible.flatMap(combination => product.storageOptions.filter(option => option.capacityGB === combination.storageCapacityGB && option.type === combination.storageType).map(option => option.id)));
    return {
      id: product.id, slug: product.slug, productType: product.productType, brand: product.brand, model: product.model, description: product.description,
      condition: product.condition, conditionNotes: product.conditionNotes, useCase: product.useCase, currency: product.currency, priceMinor: product.priceMinor,
      specs: product.specs,
      cpu: product.cpu, gpu: product.gpu, baseRamGB: product.baseRamGB, baseRamType: product.baseRamType,
      baseStorageGB: product.baseStorageGB, baseStorageType: product.baseStorageType, displaySizeInches: product.displaySizeInches,
      displayResolution: product.displayResolution, displayPanel: product.displayPanel, refreshRateHz: product.refreshRateHz,
      available: product.stockQuantity > 0, imageUrl: product.images[0] ? `/api/public/images/${product.images[0].id}` : null,
      imageUrls: product.images.map(image => `/api/public/images/${image.id}`),
      ramOptions: product.ramOptions.filter(option => ramIds.has(option.id)).map(({ id, capacityGB, type, priceDeltaMinor, isBase }) => ({ id, capacityGB, type, priceDeltaMinor, isBase })),
      storageOptions: product.storageOptions.filter(option => storageIds.has(option.id)).map(({ id, capacityGB, type, priceDeltaMinor, isBase }) => ({ id, capacityGB, type, priceDeltaMinor, isBase })),
      combinations: compatible.flatMap(combination => {
        const ramOption = product.ramOptions.find(option => option.capacityGB === combination.ramCapacityGB && option.type === combination.ramType);
        const storageOption = product.storageOptions.find(option => option.capacityGB === combination.storageCapacityGB && option.type === combination.storageType);
        return ramOption && storageOption ? [{ ramOptionId: ramOption.id, storageOptionId: storageOption.id }] : [];
      }),
    };
  }

  async quote(slug: string, ramOptionId: string, storageOptionId: string) {
    const product = await this.prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, include: { ramOptions: true, storageOptions: true, combinations: true } });
    if (!product) throw new NotFoundException('Product not found.');
    if (product.productType !== 'LAPTOP') throw new BadRequestException('RAM and storage quotes are only available for laptops.');
    const ram = product.ramOptions.find(option => option.id === ramOptionId && option.isAvailable);
    const storage = product.storageOptions.find(option => option.id === storageOptionId && option.isAvailable);
    const compatible = product.combinations.some(combination => combination.isAvailable && combination.ramCapacityGB === ram?.capacityGB && combination.ramType === ram?.type && combination.storageCapacityGB === storage?.capacityGB && combination.storageType === storage?.type);
    const baseRam = product.ramOptions.filter(option => option.isBase);
    const baseStorage = product.storageOptions.filter(option => option.isBase);
    if (!ram || !storage || !compatible || baseRam.length !== 1 || baseStorage.length !== 1 ||
      baseRam[0].capacityGB !== product.baseRamGB || baseRam[0].type !== product.baseRamType || baseRam[0].priceDeltaMinor !== 0 || !baseRam[0].isAvailable ||
      baseStorage[0].capacityGB !== product.baseStorageGB || baseStorage[0].type !== product.baseStorageType || baseStorage[0].priceDeltaMinor !== 0 || !baseStorage[0].isAvailable) {
      throw new BadRequestException('Choose available RAM and storage options for this laptop.');
    }
    const priceMinor = product.priceMinor + ram.priceDeltaMinor + storage.priceDeltaMinor;
    if (!Number.isSafeInteger(priceMinor) || priceMinor < 1) throw new BadRequestException('The selected configuration has an invalid price.');
    return { currency: product.currency, priceMinor, ramOptionId: ram.id, storageOptionId: storage.id };
  }
}

function isUniqueError(error: unknown): error is { code: 'P2002'; meta?: { target?: unknown } } { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'; }
function uniqueConflict(error: { code: 'P2002'; meta?: { target?: unknown } }): ConflictException {
  const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target ?? '');
  if (target.toLowerCase().includes('slug')) {
    return new ConflictException({ message: 'A product with this URL slug already exists.', fieldErrors: { slug: 'Choose a unique URL slug.' } });
  }
  if (target.toLowerCase().includes('capacity') || target.toLowerCase().includes('type')) return new ConflictException('An option with this capacity and type already exists for the product.');
  return new ConflictException('The product conflicts with an existing catalog record.');
}
function isMissingError(error: unknown): error is { code: 'P2025' } { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025'; }
