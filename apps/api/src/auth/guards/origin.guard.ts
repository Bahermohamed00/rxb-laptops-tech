import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedRequest } from '../auth.types.js';

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const origin = request.headers.origin;
    const allowed = this.config.getOrThrow<string[]>('CORS_ORIGINS');
    if (!origin || !allowed.includes(origin)) throw new ForbiddenException('Request origin is not allowed.');
    return true;
  }
}
