import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface POItemInput {
  variantId: number;
  quantity: number;
  unitCost: number;
}

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService) {}

  // ─── الموردون ───
  listSuppliers() {
    return this.prisma.supplier.findMany({ orderBy: { id: 'desc' } });
  }
  createSupplier(data: { name: string; contact?: string; notes?: string }) {
    return this.prisma.supplier.create({ data });
  }
  updateSupplier(id: number, data: any) {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  // ─── أوامر الشراء ───
  listOrders() {
    return this.prisma.purchaseOrder.findMany({
      orderBy: { id: 'desc' },
      include: { supplier: { select: { name: true } }, items: true },
      take: 200,
    });
  }

  async getOrder(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: { include: { variant: { include: { product: { select: { name: true } } } } } } },
    });
    if (!po) throw new NotFoundException('أمر الشراء غير موجود');
    return po;
  }

  async createOrder(supplierId: number, items: POItemInput[], notes?: string) {
    if (!items?.length) throw new BadRequestException('لا عناصر');
    const totalCost = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    return this.prisma.purchaseOrder.create({
      data: {
        supplierId,
        status: 'PENDING',
        totalCost,
        notes,
        items: { create: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, unitCost: i.unitCost })) },
      },
      include: { items: true },
    });
  }

  // استلام أمر الشراء → زيادة المخزون + حركة IN + تحديث سعر التكلفة
  async receive(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!po) throw new NotFoundException('أمر الشراء غير موجود');
      if (po.status === 'RECEIVED') throw new BadRequestException('تم الاستلام مسبقاً');

      const sorted = [...po.items].sort((a, b) => a.variantId - b.variantId);
      for (const it of sorted) {
        await tx.productVariant.update({
          where: { id: it.variantId },
          data: { stockQuantity: { increment: it.quantity } },
        });
        await tx.stockMovement.create({
          data: { variantId: it.variantId, type: 'IN', quantity: it.quantity, reference: `PO-${po.id}`, note: 'استلام شراء', createdBy: userId },
        });
      }
      return tx.purchaseOrder.update({ where: { id }, data: { status: 'RECEIVED', receivedAt: new Date() } });
    });
  }
}
