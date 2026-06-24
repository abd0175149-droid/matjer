import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  // يُرجع { couponId, discount } أو يرمي خطأ
  async validate(code: string, subtotal: number) {
    const c = await this.prisma.coupon.findUnique({ where: { code: code.trim() } });
    if (!c || !c.isActive) throw new BadRequestException('كوبون غير صالح');
    if (c.expiresAt && c.expiresAt < new Date()) throw new BadRequestException('انتهت صلاحية الكوبون');
    if (c.usageLimit != null && c.usedCount >= c.usageLimit) throw new BadRequestException('انتهى عدد استخدامات الكوبون');
    if (subtotal < Number(c.minOrder)) throw new BadRequestException(`الحد الأدنى للطلب ${c.minOrder}`);

    const discount =
      c.type === 'PERCENT'
        ? +((subtotal * Number(c.value)) / 100).toFixed(2)
        : Math.min(Number(c.value), subtotal);
    return { couponId: c.id, code: c.code, discount };
  }

  list() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(data: Prisma.CouponCreateInput) {
    return this.prisma.coupon.create({ data });
  }

  async update(id: number, data: Prisma.CouponUpdateInput) {
    return this.prisma.coupon.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.prisma.coupon.delete({ where: { id } });
    return { id, deleted: true };
  }

  incrementUsage(tx: Prisma.TransactionClient, id: number) {
    return tx.coupon.update({ where: { id }, data: { usedCount: { increment: 1 } } });
  }
}
