import { SetMetadata } from '@nestjs/common';
import type { AdminRole } from '../../generated/prisma-client/client.js';

export const ADMIN_ROLES_KEY = 'admin-roles';
export const Roles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);
