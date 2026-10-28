import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApiApp } from './app-config.js';
import { validateEnvironment } from './config/environment.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const environment = validateEnvironment(process.env);
  configureApiApp(app, environment);
  app.enableShutdownHooks();
  await app.listen(environment.PORT, '127.0.0.1');
}

void bootstrap();
