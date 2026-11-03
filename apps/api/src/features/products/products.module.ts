import { Module } from '@nestjs/common';
import { AdminProductsController, PublicProductsController } from './products.controller.js';
import { AccessoryCategoriesController } from './categories.controller.js';
import { AccessoryCategoriesService } from './categories.service.js';
import { ProductsService } from './products.service.js';
import { ImagesModule } from '../images/images.module.js';

@Module({ imports: [ImagesModule], controllers: [AdminProductsController, PublicProductsController, AccessoryCategoriesController], providers: [ProductsService, AccessoryCategoriesService] })
export class ProductsModule {}
