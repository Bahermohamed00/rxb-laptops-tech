import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminRole } from '../../generated/prisma-client/client.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CsrfGuard } from '../../auth/guards/csrf.guard.js';
import { OriginGuard } from '../../auth/guards/origin.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { SessionGuard } from '../../auth/guards/session.guard.js';
import { ImagesService } from './images.service.js';

@Controller('admin/images')
@UseGuards(SessionGuard, RolesGuard, OriginGuard, CsrfGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
export class AdminImagesController {
  constructor(private readonly images: ImagesService) {}
  @Post() upload(@Req() request: Request) { return this.images.upload(request); }
  @Delete(':id') delete(@Param('id', ParseUUIDPipe) id: string) { return this.images.deleteUnattached(id); }
}

@Controller('public/images')
export class PublicImagesController {
  constructor(private readonly images: ImagesService) {}
  @Get(':id') async get(@Param('id', ParseUUIDPipe) id: string, @Res() response: Response): Promise<void> {
    const { image, bytes } = await this.images.read(id);
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Content-Length', image.byteSize);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.send(bytes);
  }
}
