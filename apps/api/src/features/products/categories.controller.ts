import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminRole } from '../../generated/prisma-client/client.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CsrfGuard } from '../../auth/guards/csrf.guard.js';
import { OriginGuard } from '../../auth/guards/origin.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { SessionGuard } from '../../auth/guards/session.guard.js';
import { AccessoryCategoryDto } from './categories.dto.js';
import { AccessoryCategoriesService } from './categories.service.js';

@Controller('admin/categories')
@UseGuards(SessionGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
export class AccessoryCategoriesController {
  constructor(private readonly categories: AccessoryCategoriesService) {}
  @Get() list() { return this.categories.list(); }
  @Post() @UseGuards(OriginGuard, CsrfGuard) create(@Body() input: AccessoryCategoryDto) { return this.categories.create(input); }
  @Patch(':id') @UseGuards(OriginGuard, CsrfGuard) update(@Param('id', ParseUUIDPipe) id: string, @Body() input: AccessoryCategoryDto) { return this.categories.update(id, input); }
  @Delete(':id') @UseGuards(OriginGuard, CsrfGuard) archive(@Param('id', ParseUUIDPipe) id: string) { return this.categories.archive(id); }
}
