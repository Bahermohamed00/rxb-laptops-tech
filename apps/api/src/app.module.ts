import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnvironment } from './config/environment.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { CsrfGuard } from './auth/guards/csrf.guard.js';
import { LoginRateLimitGuard } from './auth/guards/login-rate-limit.guard.js';
import { OriginGuard } from './auth/guards/origin.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { SessionGuard } from './auth/guards/session.guard.js';
import { HealthController } from './health.controller.js';
import { ProductsModule } from './features/products/products.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        name: 'default',
        limit: config.getOrThrow<number>('API_RATE_LIMIT'),
        ttl: config.getOrThrow<number>('API_RATE_TTL_MS'),
      }],
    }),
    PrismaModule,
    ProductsModule,
  ],
  controllers: [HealthController, AuthController],
  providers: [
    AuthService,
    SessionGuard,
    OriginGuard,
    CsrfGuard,
    RolesGuard,
    LoginRateLimitGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
