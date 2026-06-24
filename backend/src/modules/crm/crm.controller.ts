import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('admin/customers')
export class CrmController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions('customers.read')
  async list() {
    // العملاء مع عدد الطلبات وإجمالي الإنفاق (mds/04 §7)
    return this.prisma.$queryRaw(Prisma.sql`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
             COUNT(o.id)::int AS orders,
             COALESCE(SUM(o.total),0)::float AS total_spent,
             MAX(o.created_at) AS last_order
      FROM users u
      JOIN roles r ON r.id = u.role_id AND r.name = 'customer'
      LEFT JOIN orders o ON o.customer_id = u.id AND o.deleted_at IS NULL
      WHERE u.deleted_at IS NULL
      GROUP BY u.id, u.name, u.email, u.phone, u.created_at
      ORDER BY total_spent DESC`);
  }

  @Get(':id')
  @RequirePermissions('customers.read')
  async profile(@Param('id', ParseIntPipe) id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, createdAt: true, addresses: true },
    });
    const orders = await this.prisma.order.findMany({
      where: { customerId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);
    return { user, orders, totalSpent, orderCount: orders.length };
  }
}
