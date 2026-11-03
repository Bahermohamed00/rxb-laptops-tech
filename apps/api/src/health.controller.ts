import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReadiness(): Promise<{ status: 'ready' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      this.logger.warn('Database readiness check failed.');
      throw new ServiceUnavailableException('Database is not ready.');
    }
  }
}
