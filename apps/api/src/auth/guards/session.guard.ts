import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SESSION_COOKIE } from '../auth.types.js';
import type { AuthenticatedRequest } from '../auth.types.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[SESSION_COOKIE];
    if (!token || token.length > 128) throw new UnauthorizedException();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await this.prisma.adminSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') throw new UnauthorizedException();
    request.admin = { id: session.user.id, email: session.user.email, role: session.user.role, status: session.user.status };
    request.adminSessionId = session.id;
    request.adminCsrfToken = session.csrfToken;
    request.adminSessionExpiresAt = session.expiresAt;
    if (this.config.getOrThrow<'production' | 'development' | 'test'>('NODE_ENV') !== 'test') {
      request.adminSessionExpiresAt = new Date(Date.now() + this.config.getOrThrow<number>('ADMIN_SESSION_TTL_MS'));
      await this.prisma.adminSession.update({ where: { id: session.id }, data: { expiresAt: request.adminSessionExpiresAt } });
    }
    return true;
  }
}
