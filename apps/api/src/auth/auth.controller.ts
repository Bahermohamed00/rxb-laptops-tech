import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminRole } from '../generated/prisma-client/client.js';
import { Roles } from './decorators/roles.decorator.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { SESSION_COOKIE } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard.js';
import { OriginGuard } from './guards/origin.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { SessionGuard } from './guards/session.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OriginGuard, LoginRateLimitGuard)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(body.email, body.password);
    response.cookie(SESSION_COOKIE, session.token, this.auth.cookieOptions());
    response.setHeader('Cache-Control', 'no-store');
    return { user: session.user, csrfToken: session.csrfToken, expiresAt: session.expiresAt.toISOString() };
  }

  @Get('session')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  session(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(SESSION_COOKIE, request.cookies[SESSION_COOKIE]!, this.auth.cookieOptions());
    return { user: request.admin, csrfToken: request.adminCsrfToken, expiresAt: request.adminSessionExpiresAt?.toISOString() };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard, OriginGuard, CsrfGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.revoke(request.adminSessionId!);
    response.clearCookie(SESSION_COOKIE, { ...this.auth.cookieOptions(), maxAge: undefined });
    response.setHeader('Cache-Control', 'no-store');
  }
}
