import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedAdmin } from '../auth.types.js';

export const CurrentAdmin = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedAdmin => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().admin!;
});
