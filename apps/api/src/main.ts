// Load .env into process.env before validating it below. ConfigModule only
// copies string values back to process.env, so parsed lists such as
// CORS_ORIGINS would otherwise silently fall back to their defaults.
import 'dotenv/config';
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
  const host = environment.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  await app.listen(environment.PORT, host);
}

void bootstrap().catch(error => {
  const failureType = error instanceof Error ? error.constructor.name : typeof error;
  console.error(`API startup failed (${failureType}). Check service configuration and database availability.`);
  process.exitCode = 1;
});
