import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { AdminUserStatus } from '../generated/prisma-client/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SESSION_COOKIE_PATH, type AuthenticatedAdmin } from './auth.types.js';

const argonOptions = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async login(emailInput: string, password: string): Promise<{ user: AuthenticatedAdmin; token: string; csrfToken: string; expiresAt: Date }> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!user || user.status !== AdminUserStatus.ACTIVE) {
      await argon2.hash(password, argonOptions);
      throw new UnauthorizedException('Invalid email or password.');
    }
    const valid = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.getOrThrow<number>('ADMIN_SESSION_TTL_MS'));
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.adminSession.create({ data: { userId: user.id, tokenHash, csrfToken, expiresAt } });
    await this.prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: now } });
    return { user: this.publicUser(user), token, csrfToken, expiresAt };
  }

  publicUser(user: AuthenticatedAdmin): AuthenticatedAdmin {
    return { id: user.id, email: user.email, role: user.role, status: user.status };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.adminSession.update({ where: { id: sessionId }, data: { revokedAt: new Date(), expiresAt: new Date() } });
  }

  cookieOptions(): { httpOnly: true; secure: boolean; sameSite: 'lax'; path: string; maxAge: number } {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow<'production' | 'development' | 'test'>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: SESSION_COOKIE_PATH,
      maxAge: this.config.getOrThrow<number>('ADMIN_SESSION_TTL_MS'),
    };
  }
}
