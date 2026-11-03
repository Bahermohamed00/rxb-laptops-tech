import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { ApiEnvironment } from './config/environment.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { SafeExceptionFilter } from './safe-exception.filter.js';

export function configureApiApp(app: INestApplication, config: ApiEnvironment): void {
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  const allowedOrigins = new Set(config.CORS_ORIGINS);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.vary('Origin');
      if (request.path.startsWith('/api/auth/') || request.path.startsWith('/api/admin/')) {
        response.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
        response.status(204).end();
        return;
      }
    } else if (request.method === 'OPTIONS') {
      response.status(403).end();
      return;
    }
    next();
  });
  app.use('/api/admin/images', express.raw({ type: 'application/octet-stream', limit: config.PRODUCT_IMAGE_MAX_BYTES }),
    (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
      const tooLarge = typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large';
      response.status(tooLarge ? 413 : 400).json({ statusCode: tooLarge ? 413 : 400, message: tooLarge ? 'Image exceeds the configured upload limit.' : 'Invalid image request body.' });
    });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new SafeExceptionFilter());
  (app.getHttpAdapter().getInstance() as { set: (key: string, value: number | false) => void }).set('trust proxy', config.TRUST_PROXY_HOPS || false);
}
