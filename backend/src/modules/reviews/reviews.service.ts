import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  approvedByProduct(productId: number) {
    return this.prisma.review.findMany({
      where: { productId, isApproved: true },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(customerId: number, productId: number, rating: number, comment?: string) {
    return this.prisma.review.create({
      data: { customerId, productId, rating: Math.max(1, Math.min(5, rating)), comment },
    });
  }

  pending() {
    return this.prisma.review.findMany({
      where: { isApproved: false },
      include: { customer: { select: { name: true } }, product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: number) {
    const r = await this.prisma.review.update({ where: { id }, data: { isApproved: true } });
    await this.recompute(r.productId);
    return r;
  }

  async remove(id: number) {
    const r = await this.prisma.review.delete({ where: { id } });
    await this.recompute(r.productId);
    return { id, deleted: true };
  }

  // إعادة حساب متوسط التقييم (errata G2)
  private async recompute(productId: number) {
    const agg = await this.prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: { avgRating: agg._avg.rating ?? null },
    });
  }
}
