import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedRequest } from '../auth.types.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const supplied = request.headers['x-csrf-token'];
    if (typeof supplied !== 'string' || !request.adminSessionId) throw new ForbiddenException('CSRF token is required.');
    const session = await this.prisma.adminSession.findUnique({ where: { id: request.adminSessionId }, select: { csrfToken: true } });
    if (!session) throw new ForbiddenException('CSRF token is invalid.');
    const expectedBytes = Buffer.from(session.csrfToken);
    const suppliedBytes = Buffer.from(supplied);
    if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) throw new ForbiddenException('CSRF token is invalid.');
    return true;
  }
}
