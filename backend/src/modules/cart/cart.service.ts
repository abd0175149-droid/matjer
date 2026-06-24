import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

interface CartLineInput {
  variantId: number;
  quantity: number;
}

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // إعادة تحقق الأسعار والتوفّر لحظياً (mds/03 §5) — تُستدعى من صفحة السلة/الدفع
  async validate(items: CartLineInput[]) {
    if (!items?.length) return { lines: [], subtotal: 0, valid: true };
    const ids = items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: ids }, isActive: true },
      include: { product: { select: { name: true, slug: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } } },
    });
    const vMap = new Map(variants.map((v) => [v.id, v]));

    let subtotal = 0;
    let valid = true;
    const lines = items.map((it) => {
      const v = vMap.get(it.variantId);
      if (!v) {
        valid = false;
        return { variantId: it.variantId, exists: false, quantity: it.quantity, available: 0, inStock: false };
      }
      const available = v.stockQuantity - v.reservedQuantity;
      const inStock = available >= it.quantity;
      if (!inStock) valid = false;
      const price = Number(v.price);
      subtotal += price * it.quantity;
      return {
        variantId: v.id,
        exists: true,
        productName: v.product.name,
        slug: v.product.slug,
        image: v.product.images[0]?.imageUrl ?? null,
        sku: v.sku,
        color: v.color,
        size: v.size,
        price,
        quantity: it.quantity,
        lineTotal: price * it.quantity,
        available,
        inStock,
      };
    });
    return { lines, subtotal, valid };
  }

  // سلة محفوظة للمسجّلين (Persistent Cart — mds/03 §5) عبر Redis
  private key(userId: number) {
    return `cart:user:${userId}`;
  }
  async saveForUser(userId: number, items: CartLineInput[]) {
    await this.redis.client.set(this.key(userId), JSON.stringify(items), 'EX', 60 * 60 * 24 * 30);
    return { saved: true };
  }
  async loadForUser(userId: number): Promise<CartLineInput[]> {
    const raw = await this.redis.client.get(this.key(userId));
    return raw ? JSON.parse(raw) : [];
  }
}
