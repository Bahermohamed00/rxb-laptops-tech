import { Module } from '@nestjs/common';
import { AdminImagesController, PublicImagesController } from './images.controller.js';
import { ImagesService } from './images.service.js';

@Module({ controllers: [AdminImagesController, PublicImagesController], providers: [ImagesService], exports: [ImagesService] })
export class ImagesModule {}
