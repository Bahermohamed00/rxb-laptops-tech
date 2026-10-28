import type { AdminRole, AdminUserStatus } from '../generated/prisma-client/client.js';
import type { Request } from 'express';

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  role: AdminRole;
  status: AdminUserStatus;
}

export interface AuthenticatedRequest extends Request {
  cookies: Record<string, string | undefined>;
  admin?: AuthenticatedAdmin;
  adminSessionId?: string;
  adminCsrfToken?: string;
  adminSessionExpiresAt?: Date;
}

export const SESSION_COOKIE = 'rxb_admin_session';
export const SESSION_COOKIE_PATH = '/api/auth';
