import { BadRequestException, ConflictException, Injectable, NotFoundException, PayloadTooLargeException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';

const imageRoot = () => resolve(process.env.RXB_LOCAL_IMAGE_DIR || join(process.cwd(), '.local-images'));

@Injectable()
export class ImagesService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async upload(request: Request) {
    if (this.config.getOrThrow('NODE_ENV') === 'production') throw new ServiceUnavailableException('Image uploads require configured object storage in production.');
    if (request.headers['content-type'] !== 'application/octet-stream') throw new BadRequestException('Upload the image as application/octet-stream.');
    const maxBytes = this.config.getOrThrow<number>('PRODUCT_IMAGE_MAX_BYTES');
    const chunks: Buffer[] = [];
    let size = 0;
    let bytes: Buffer;
    if (Buffer.isBuffer(request.body)) {
      bytes = request.body;
      size = bytes.byteLength;
      if (size > maxBytes) throw new PayloadTooLargeException(`Images must be ${Math.ceil(maxBytes / 1024 / 1024)} MB or smaller.`);
    } else {
      for await (const chunk of request) {
        const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += part.byteLength;
        if (size > maxBytes) throw new PayloadTooLargeException(`Images must be ${Math.ceil(maxBytes / 1024 / 1024)} MB or smaller.`);
        chunks.push(part);
      }
      bytes = Buffer.concat(chunks, size);
    }
    const format = sniffImage(bytes);
    if (!format) throw new BadRequestException('Use a valid JPEG, PNG, or WebP image.');
    const storageKey = `${randomUUID()}.${format.extension}`;
    const root = imageRoot();
    await mkdir(root, { recursive: true });
    const target = resolve(root, storageKey);
    if (dirname(target) !== root) throw new BadRequestException('Invalid image storage key.');
    // With `wx`, an EEXIST means this generated key already belongs to another
    // file. Never remove the target on a failed create attempt.
    await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    try {
      const image = await this.prisma.productImage.create({ data: { storageKey, contentType: format.contentType, byteSize: size } });
      return { id: image.id, imageUrl: `/api/public/images/${image.id}` };
    } catch (error) {
      await rm(target, { force: true });
      throw error;
    }
  }

  async read(id: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id } });
    if (!image || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(image.storageKey)) throw new NotFoundException('Image not found.');
    try { return { image, bytes: await readFile(resolve(imageRoot(), image.storageKey)) }; }
    catch { throw new NotFoundException('Image not found.'); }
  }

  async deleteUnattached(id: string): Promise<void> {
    const image = await this.prisma.productImage.findUnique({ where: { id } });
    if (!image) return;
    if (image.productId) throw new ConflictException('This image is attached to a product.');
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(image.storageKey)) throw new NotFoundException('Image not found.');
    const removed = await this.prisma.productImage.deleteMany({ where: { id, productId: null } });
    if (removed.count !== 1) throw new ConflictException('This image is attached to a product or has already been removed.');
    // A filesystem cleanup error leaves an orphaned generated file, but cannot
    // leave a product record pointing at a file that was already removed.
    await rm(resolve(imageRoot(), image.storageKey), { force: true });
  }
}

function sniffImage(bytes: Buffer): { extension: string; contentType: string } | null {
  if (isJpeg(bytes)) return { extension: 'jpg', contentType: 'image/jpeg' };
  if (isPng(bytes)) return { extension: 'png', contentType: 'image/png' };
  if (isWebp(bytes)) return { extension: 'webp', contentType: 'image/webp' };
  return null;
}

function isJpeg(bytes: Buffer): boolean {
  if (bytes.length < 16 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return false;
  let hasFrame = false;
  let hasScan = false;
  for (let offset = 2; offset + 4 < bytes.length - 2;) {
    if (bytes[offset] !== 0xff) return false;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) break;
    if (marker === 0xda) { hasScan = true; break; }
    if ([0xd8, 0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7].includes(marker)) continue;
    if (offset + 2 > bytes.length) return false;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return false;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) hasFrame = true;
    offset += length;
  }
  return hasFrame && hasScan;
}

function isPng(bytes: Buffer): boolean {
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return false;
  let offset = 8, first = true, hasData = false, ended = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > bytes.length) return false;
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (first && (type !== 'IHDR' || length !== 13)) return false;
    first = false;
    if (type === 'IDAT') hasData = true;
    if (type === 'IEND') { ended = length === 0 && chunkEnd === bytes.length; break; }
    offset = chunkEnd;
  }
  return hasData && ended;
}

function isWebp(bytes: Buffer): boolean {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') return false;
  if (bytes.readUInt32LE(4) !== bytes.length - 8) return false;
  const chunk = bytes.toString('ascii', 12, 16);
  const size = bytes.readUInt32LE(16);
  return ['VP8 ', 'VP8L', 'VP8X'].includes(chunk) && size > 0 && 20 + size + (size % 2) === bytes.length;
}
