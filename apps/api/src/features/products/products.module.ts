import { Module } from '@nestjs/common';
import { AdminProductsController, PublicProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { ImagesModule } from '../images/images.module.js';

@Module({ imports: [ImagesModule], controllers: [AdminProductsController, PublicProductsController], providers: [ProductsService] })
export class ProductsModule {}
