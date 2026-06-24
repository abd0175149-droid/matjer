import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('admin/reports')
export class ReportsController {
  constructor(private prisma: PrismaService) {}

  private range(from?: string, to?: string): Prisma.OrderWhereInput {
    const w: Prisma.OrderWhereInput = { deletedAt: null };
    if (from || to) {
      w.createdAt = {};
      if (from) (w.createdAt as any).gte = new Date(from);
      if (to) (w.createdAt as any).lte = new Date(to + 'T23:59:59');
    }
    return w;
  }

  @Get('sales')
  @RequirePermissions('accounting.read')
  async sales(@Query('from') from?: string, @Query('to') to?: string) {
    const range = this.range(from, to);
    const [paid, byDay, byStatus, total] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { ...range, paymentStatus: 'PAID' } }),
      this.prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS orders, COALESCE(SUM(total),0)::float AS revenue
        FROM orders WHERE created_at > now() - interval '30 days' AND deleted_at IS NULL
        GROUP BY day ORDER BY day`),
      this.prisma.order.groupBy({ by: ['status'], _count: true, where: range }),
      this.prisma.order.aggregate({ _sum: { total: true, subtotal: true, discount: true, taxAmount: true, shippingCost: true }, _count: true, where: range }),
    ]);
    return {
      paidRevenue: paid._sum.total ?? 0,
      paidOrders: paid._count,
      periodOrders: total._count,
      periodRevenue: total._sum.total ?? 0,
      periodDiscount: total._sum.discount ?? 0,
      periodTax: total._sum.taxAmount ?? 0,
      byDay,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    };
  }

  // تقدير الربح: الإيراد المحصّل - تكلفة البضاعة (متوسط تكلفة الشراء لكل متغيّر)
  @Get('profit')
  @RequirePermissions('accounting.read')
  async profit(@Query('from') from?: string, @Query('to') to?: string) {
    const where = from || to ? Prisma.sql`AND o.created_at BETWEEN ${new Date(from || '2000-01-01')} AND ${new Date((to || '2999-01-01') + 'T23:59:59')}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      WITH avg_cost AS (
        SELECT variant_id, AVG(unit_cost) AS cost FROM purchase_order_items GROUP BY variant_id
      )
      SELECT COALESCE(SUM(oi.total),0)::float AS revenue,
             COALESCE(SUM(oi.quantity * COALESCE(ac.cost,0)),0)::float AS cogs
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id AND o.status IN ('CONFIRMED','PROCESSING','SHIPPED','DELIVERED') AND o.deleted_at IS NULL ${where}
      LEFT JOIN avg_cost ac ON ac.variant_id = oi.variant_id`);
    const r = rows[0] || { revenue: 0, cogs: 0 };
    return { revenue: r.revenue, cogs: r.cogs, grossProfit: +(r.revenue - r.cogs).toFixed(2) };
  }

  // تصدير الطلبات CSV
  @Get('orders.csv')
  @RequirePermissions('accounting.export')
  async ordersCsv(@Res() res: Response, @Query('from') from?: string, @Query('to') to?: string) {
    const orders = await this.prisma.order.findMany({ where: this.range(from, to), orderBy: { createdAt: 'desc' }, take: 5000 });
    const header = 'order_number,status,payment_method,payment_status,subtotal,discount,tax,shipping,total,created_at\n';
    const rows = orders
      .map((o) => [o.orderNumber, o.status, o.paymentMethod, o.paymentStatus, o.subtotal, o.discount, o.taxAmount, o.shippingCost, o.total, o.createdAt.toISOString()].join(','))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send('﻿' + header + rows);
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
