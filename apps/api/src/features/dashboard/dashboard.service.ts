import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [productCount, activeProductCount, legacyStock, individualAvailableCount] = await this.prisma.$transaction([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.product.aggregate({
        where: { trackingMode: 'LEGACY_QUANTITY' },
        _sum: { stockQuantity: true },
      }),
      this.prisma.product.count({ where: { trackingMode: 'INDIVIDUAL', unitStatus: 'AVAILABLE' } }),
    ]);
    const legacyAvailableCount = legacyStock._sum.stockQuantity ?? 0;

    return {
      generatedAt: new Date().toISOString(),
      products: { total: productCount, active: activeProductCount },
      inventory: {
        availableUnits: legacyAvailableCount + individualAvailableCount,
        legacyQuantityUnits: legacyAvailableCount,
        individuallyTrackedAvailableUnits: individualAvailableCount,
      },
      unavailable: {
        salesAndRevenue: 'No persisted order, payment, or refund records are available.',
        lowStock: 'No low-stock threshold is configured.',
      },
    };
  }
}
