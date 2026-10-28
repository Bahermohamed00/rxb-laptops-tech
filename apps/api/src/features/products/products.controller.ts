import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminRole } from '../../generated/prisma-client/client.js';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../../auth/auth.types.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CsrfGuard } from '../../auth/guards/csrf.guard.js';
import { OriginGuard } from '../../auth/guards/origin.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { SessionGuard } from '../../auth/guards/session.guard.js';
import { PriceQuoteDto, ProductDto, ProductSearchDto, UpdateInventoryDto } from './products.dto.js';
import { ProductsService } from './products.service.js';

@Controller('admin/products')
@UseGuards(SessionGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get() list(@Query() query: ProductSearchDto) { return this.products.adminList(query); }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) { return this.products.adminDetail(id); }
  @Post() @UseGuards(SessionGuard, RolesGuard, OriginGuard, CsrfGuard) create(@Body() body: ProductDto) { return this.products.create(body); }
  @Patch(':id') @UseGuards(SessionGuard, RolesGuard, OriginGuard, CsrfGuard) update(@Param('id', ParseUUIDPipe) id: string, @Body() body: ProductDto) { return this.products.update(id, body); }
  @Patch(':id/inventory') @UseGuards(SessionGuard, RolesGuard, OriginGuard, CsrfGuard) updateInventory(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateInventoryDto, @CurrentAdmin() admin: AuthenticatedAdmin) { return this.products.updateInventory(id, body, admin.id); }
  @Delete(':id') @UseGuards(SessionGuard, RolesGuard, OriginGuard, CsrfGuard) archive(@Param('id', ParseUUIDPipe) id: string) { return this.products.archive(id); }
}

@Controller('public/products')
export class PublicProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get() list() { return this.products.publicList(); }
  @Get(':slug') detail(@Param('slug') slug: string) { return this.products.publicDetail(slug); }
  @Post(':slug/quote') quote(@Param('slug') slug: string, @Body() body: PriceQuoteDto) { return this.products.quote(slug, body.ramOptionId, body.storageOptionId); }
}
