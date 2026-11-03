import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AccessoryCategoryDto } from './categories.dto.js';

@Injectable()
export class AccessoryCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const categories = await this.prisma.accessoryCategory.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return categories.map(({ _count, ...category }) => ({ ...category, productCount: _count.products }));
  }

  async create(input: AccessoryCategoryDto) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException({ message: 'Enter a category name.', fieldErrors: { name: 'Category name is required.' } });
    const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
    if (!slug) throw new BadRequestException({ message: 'Enter a category name that can form a URL slug.', fieldErrors: { name: 'Use letters or numbers in the category name.' } });
    try {
      return await this.prisma.accessoryCategory.create({ data: {
        name, normalizedName: name.toLowerCase(), slug,
        description: input.description?.trim() ?? '', imageUrl: normalizeImageUrl(input.imageUrl), isActive: input.isActive ?? true,
      } });
    } catch (error) { if (uniqueError(error)) throw categoryConflict(error); throw error; }
  }

  async update(id: string, input: AccessoryCategoryDto) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException({ message: 'Enter a category name.', fieldErrors: { name: 'Category name is required.' } });
    const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
    if (!slug) throw new BadRequestException({ message: 'Enter a category name that can form a URL slug.', fieldErrors: { name: 'Use letters or numbers in the category name.' } });
    try {
      return await this.prisma.accessoryCategory.update({ where: { id }, data: {
        name, normalizedName: name.toLowerCase(), slug,
        description: input.description?.trim() ?? '', imageUrl: normalizeImageUrl(input.imageUrl), isActive: input.isActive ?? true,
      } });
    } catch (error) {
      if (isMissing(error)) throw new NotFoundException('Accessory category not found.');
      if (uniqueError(error)) throw categoryConflict(error);
      throw error;
    }
  }

  async archive(id: string) {
    try { return await this.prisma.accessoryCategory.update({ where: { id }, data: { isActive: false } }); }
    catch (error) { if (isMissing(error)) throw new NotFoundException('Accessory category not found.'); throw error; }
  }
}

function slugify(value: string) { return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120); }
function normalizeImageUrl(value?: string | null) {
  const imageUrl = value?.trim();
  if (!imageUrl) return null;
  try {
    const parsed = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch { throw new BadRequestException({ message: 'Enter an absolute HTTP or HTTPS category image URL.', fieldErrors: { imageUrl: 'Use a valid HTTP or HTTPS image URL.' } }); }
}
function uniqueError(error: unknown): error is { code: 'P2002'; meta?: { target?: unknown } } { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'; }
function isMissing(error: unknown): error is { code: 'P2025' } { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025'; }
function categoryConflict(error: { code: 'P2002'; meta?: { target?: unknown } }) {
  const target = String(error.meta?.target ?? '');
  if (target.toLowerCase().includes('slug')) return new ConflictException({ message: 'A category with this slug already exists.', fieldErrors: { slug: 'Choose a unique slug.' } });
  return new ConflictException({ message: 'A category with this name already exists.', fieldErrors: { name: 'Choose a unique category name.' } });
}
