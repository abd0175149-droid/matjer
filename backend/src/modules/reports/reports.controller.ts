import { Controller, Get } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('admin/reports')
export class ReportsController {
  constructor(private prisma: PrismaService) {}

  @Get('sales')
  @RequirePermissions('accounting.read')
  async sales() {
    const [paid, byDay, byStatus] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { paymentStatus: 'PAID' } }),
      this.prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS orders, COALESCE(SUM(total),0)::float AS revenue
        FROM orders WHERE created_at > now() - interval '30 days' AND deleted_at IS NULL
        GROUP BY day ORDER BY day`),
      this.prisma.order.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
    ]);
    return {
      paidRevenue: paid._sum.total ?? 0,
      paidOrders: paid._count,
      byDay,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    };
  }

  @Get('top-products')
  @RequirePermissions('accounting.read')
  topProducts() {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { salesCount: 'desc' },
      take: 10,
      select: { id: true, name: true, salesCount: true, avgRating: true },
    });
  }

  @Get('inventory')
  @RequirePermissions('accounting.read')
  async inventory() {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(SUM(stock_quantity * price),0)::float AS stock_value,
             COALESCE(SUM(stock_quantity),0)::int AS total_units,
             COUNT(*)::int AS variants,
             COUNT(*) FILTER (WHERE stock_quantity - reserved_quantity <= min_stock_alert)::int AS low_stock
      FROM product_variants WHERE is_active = true`);
    return rows[0];
  }

  @Get('customers')
  @RequirePermissions('accounting.read')
  async customers() {
    const count = await this.prisma.user.count({ where: { role: { name: 'customer' }, deletedAt: null } });
    const top = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT u.name, u.email, COUNT(o.id)::int AS orders, COALESCE(SUM(o.total),0)::float AS spent
      FROM users u JOIN orders o ON o.customer_id = u.id
      GROUP BY u.id, u.name, u.email ORDER BY spent DESC LIMIT 10`);
    return { totalCustomers: count, topCustomers: top };
  }
}
