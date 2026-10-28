import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { ApiEnvironment } from './config/environment.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

export function configureApiApp(app: INestApplication, config: ApiEnvironment): void {
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    maxAge: 600,
  });
  app.use('/api/admin/images', express.raw({ type: 'application/octet-stream', limit: config.PRODUCT_IMAGE_MAX_BYTES }),
    (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
      const tooLarge = typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large';
      response.status(tooLarge ? 413 : 400).json({ statusCode: tooLarge ? 413 : 400, message: tooLarge ? 'Image exceeds the configured upload limit.' : 'Invalid image request body.' });
    });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  (app.getHttpAdapter().getInstance() as { set: (key: string, value: number | false) => void }).set('trust proxy', config.TRUST_PROXY_HOPS || false);
}
