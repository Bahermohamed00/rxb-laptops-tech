import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedRequest } from '../auth.types.js';

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, { startedAt: number; count: number }>();
  private lastSweep = 0;
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const ttl = this.config.getOrThrow<number>('AUTH_LOGIN_TTL_MS');
    const limit = this.config.getOrThrow<number>('AUTH_LOGIN_LIMIT');
    let bucket = this.attempts.get(ip);
    if (!bucket) {
      if (this.attempts.size >= 10_000) {
        for (const [key, entry] of this.attempts) if (now - entry.startedAt >= ttl) this.attempts.delete(key);
        if (this.attempts.size >= 10_000) {
          context.switchToHttp().getResponse().setHeader('Retry-After', String(Math.max(1, Math.ceil(ttl / 1000))));
          throw new HttpException('Login service is busy. Try again later.', 429);
        }
      }
      bucket = { startedAt: now, count: 0 };
    } else if (now - bucket.startedAt >= ttl) bucket = { startedAt: now, count: 0 };
    if (bucket.count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((ttl - (now - bucket.startedAt)) / 1000));
      context.switchToHttp().getResponse().setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException('Too many login attempts. Try again later.', 429);
    }
    bucket.count += 1;
    this.attempts.set(ip, bucket);
    if (now - this.lastSweep > 60_000 || this.attempts.size > 10_000) {
      for (const [key, entry] of this.attempts) if (now - entry.startedAt >= ttl) this.attempts.delete(key);
      this.lastSweep = now;
    }
    return true;
  }
}
