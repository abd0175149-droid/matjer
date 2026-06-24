import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto, UpdateStatusDto } from './dto/orders.dto';

// آلة حالات الطلب (mds/06)
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
  ) {}

  private async nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ nextval: bigint }>>(
      Prisma.sql`SELECT nextval('order_number_seq') AS nextval`,
    );
    const seq = Number(rows[0].nextval);
    const year = new Date().getFullYear();
    return `MJ-${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(dto: CreateOrderDto, customerId: number | null) {
    if (!dto.items?.length) throw new BadRequestException('السلة فارغة');

    return this.prisma.$transaction(async (tx) => {
      // اجلب المتغيرات (لقطة الأسعار + الأسماء)
      const variantIds = dto.items.map((i) => i.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds }, isActive: true },
        include: { product: { select: { name: true, salesCount: true } } },
      });
      if (variants.length !== new Set(variantIds).size) {
        throw new BadRequestException('بعض المنتجات غير متوفّرة');
      }
      const vMap = new Map(variants.map((v) => [v.id, v]));

      // حجز الكمية (يقفل ويتحقق من التوفّر — mds/06 §3)
      await this.inventory.reserve(tx, dto.items);

      // احسب الإجمالي من لقطة السعر
      let subtotal = 0;
      const itemsData = dto.items.map((it) => {
        const v = vMap.get(it.variantId)!;
        const unit = Number(v.price);
        const total = unit * it.quantity;
        subtotal += total;
        return {
          variantId: it.variantId,
          productName: v.product.name,
          sku: v.sku,
          quantity: it.quantity,
          unitPrice: unit,
          total,
        };
      });

      const shippingCost = 0; // MVP: شحن ثابت (errata G4/G5: قابل للتوسعة عبر SettingsModule)
      const taxAmount = 0;
      const discount = 0;
      const total = subtotal + shippingCost + taxAmount - discount;

      const address = await tx.address.create({
        data: {
          customerId,
          fullName: dto.shipping.fullName,
          phone: dto.shipping.phone,
          city: dto.shipping.city,
          area: dto.shipping.area,
          street: dto.shipping.street,
          details: dto.shipping.details,
        },
      });

      const orderNumber = await this.nextOrderNumber(tx);
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          status: 'NEW',
          subtotal,
          discount,
          shippingCost,
          taxAmount,
          total,
          paymentMethod: dto.paymentMethod,
          paymentStatus: 'UNPAID',
          shippingAddressId: address.id,
          notes: dto.notes,
          items: { create: itemsData },
          statusHistory: { create: [{ status: 'NEW', changedBy: customerId, note: 'تم إنشاء الطلب' }] },
        },
        include: { items: true },
      });

      return { id: order.id, orderNumber: order.orderNumber, uuid: order.uuid, total: order.total, status: order.status };
    });
  }

  // ─────────── الانتقال بين الحالات ───────────
  async transition(orderId: number, dto: UpdateStatusDto, userId?: number) {
    return this.prisma.$transaction(async (tx) => {
      // اقفل الطلب أولاً ثم المتغيرات (ترتيب قفل ثابت — errata R-2)
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);

      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new NotFoundException('الطلب غير موجود');

      const allowed = TRANSITIONS[order.status];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(`انتقال غير مسموح: ${order.status} → ${dto.status}`);
      }

      const items = order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
      const ref = order.orderNumber;

      // أثر المخزون حسب الانتقال (mds/06 §2,§3)
      if (order.status === 'NEW' && dto.status === 'CONFIRMED') {
        await this.inventory.confirm(tx, items, userId, ref);
        // زيادة عدّاد المبيعات (errata G2)
        for (const it of order.items) {
          await tx.product.updateMany({
            where: { variants: { some: { id: it.variantId } } },
            data: { salesCount: { increment: it.quantity } },
          });
        }
      } else if (order.status === 'NEW' && dto.status === 'CANCELLED') {
        await this.inventory.release(tx, items); // تحرير الحجز
      } else if (['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status) && dto.status === 'CANCELLED') {
        await this.inventory.restock(tx, items, userId, ref); // إعادة للمخزون
      } else if (order.status === 'DELIVERED' && dto.status === 'RETURNED') {
        await this.inventory.restock(tx, items, userId, ref);
      }

      // تحديث حالة الدفع: COD يُحصّل عند التسليم
      let paymentStatus: PaymentStatus | undefined;
      if (dto.status === 'DELIVERED' && order.paymentMethod === PaymentMethod.COD) paymentStatus = 'PAID';
      if (dto.status === 'RETURNED' && order.paymentStatus === 'PAID') paymentStatus = 'REFUNDED';

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
          ...(paymentStatus ? { paymentStatus } : {}),
          ...(dto.trackingNumber ? { trackingNumber: dto.trackingNumber } : {}),
          ...(dto.shippingCarrier ? { shippingCarrier: dto.shippingCarrier } : {}),
          statusHistory: { create: [{ status: dto.status, changedBy: userId, note: dto.note }] },
        },
      });
      return { id: updated.id, status: updated.status, paymentStatus: updated.paymentStatus };
    });
  }

  // ─────────── استعلامات ───────────
  async trackByUuid(uuid: string) {
    const order = await this.prisma.order.findUnique({
      where: { uuid },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    return order;
  }

  myOrders(customerId: number) {
    return this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async getMine(customerId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, customerId },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    return order;
  }

  adminList(status?: OrderStatus, q?: string) {
    const where: Prisma.OrderWhereInput = { deletedAt: null };
    if (status) where.status = status;
    if (q) where.OR = [{ orderNumber: { contains: q, mode: 'insensitive' } }];
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { items: true, address: true },
    });
  }

  async adminGet(id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id },
      include: { items: true, address: true, statusHistory: { orderBy: { createdAt: 'asc' } }, customer: { select: { name: true, email: true } } },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    return order;
  }

  async dashboardStats() {
    const [orders, products, lowStock, byStatus, revenue] = await Promise.all([
      this.prisma.order.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.$queryRaw<any[]>(Prisma.sql`SELECT COUNT(*)::int AS c FROM product_variants WHERE stock_quantity - reserved_quantity <= min_stock_alert`),
      this.prisma.order.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID' } }),
    ]);
    return {
      totalOrders: orders,
      totalProducts: products,
      lowStockCount: lowStock[0]?.c ?? 0,
      ordersByStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      paidRevenue: revenue._sum.total ?? 0,
    };
  }
}
