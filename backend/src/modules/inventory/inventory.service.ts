import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Tx = Prisma.TransactionClient;
export interface LineItem {
  variantId: number;
  quantity: number;
}
interface VariantRow {
  id: number;
  stock_quantity: number;
  reserved_quantity: number;
}

/**
 * محرّك المخزون (mds/06 §3).
 * المتاح = stock_quantity - reserved_quantity.
 * كل العمليات تُستدعى داخل $transaction، وتقفل الصفوف بترتيب id تصاعدي
 * ثابت في كل المسارات لمنع البيع المزدوج و deadlock (errata R-1, R-2).
 */
@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private async lockVariants(tx: Tx, ids: number[]): Promise<Map<number, VariantRow>> {
    const sorted = [...new Set(ids)].sort((a, b) => a - b);
    if (!sorted.length) return new Map();
    const rows = await tx.$queryRaw<VariantRow[]>(
      Prisma.sql`SELECT id, stock_quantity, reserved_quantity
                 FROM product_variants
                 WHERE id IN (${Prisma.join(sorted)})
                 ORDER BY id
                 FOR UPDATE`,
    );
    return new Map(rows.map((r) => [r.id, r]));
  }

  /** حجز مؤقت عند إنشاء الطلب (reserved += qty) */
  async reserve(tx: Tx, items: LineItem[]): Promise<void> {
    const map = await this.lockVariants(tx, items.map((i) => i.variantId));
    for (const it of items) {
      const r = map.get(it.variantId);
      if (!r) throw new BadRequestException(`المتغيّر ${it.variantId} غير موجود`);
      const available = r.stock_quantity - r.reserved_quantity;
      if (available < it.quantity) {
        throw new BadRequestException(`الكمية غير متوفّرة (المتغيّر ${it.variantId}: متاح ${available})`);
      }
    }
    for (const it of items) {
      await tx.productVariant.update({
        where: { id: it.variantId },
        data: { reservedQuantity: { increment: it.quantity } },
      });
    }
  }

  /** تأكيد الطلب: خصم نهائي + حركة OUT. يعيد التحقق من المخزون الفعلي (errata R-1) */
  async confirm(tx: Tx, items: LineItem[], createdBy?: number, reference?: string): Promise<void> {
    const map = await this.lockVariants(tx, items.map((i) => i.variantId));
    for (const it of items) {
      const r = map.get(it.variantId);
      if (!r) throw new BadRequestException(`المتغيّر ${it.variantId} غير موجود`);
      if (r.stock_quantity < it.quantity) {
        throw new BadRequestException(`المخزون غير كافٍ للتأكيد (المتغيّر ${it.variantId})`);
      }
    }
    for (const it of items) {
      await tx.productVariant.update({
        where: { id: it.variantId },
        data: {
          stockQuantity: { decrement: it.quantity },
          reservedQuantity: { decrement: it.quantity },
        },
      });
      await tx.stockMovement.create({
        data: { variantId: it.variantId, type: 'OUT', quantity: -it.quantity, reference, createdBy },
      });
    }
  }

  /** تحرير الحجز عند إلغاء طلب لم يُؤكَّد بعد (reserved -= qty) */
  async release(tx: Tx, items: LineItem[]): Promise<void> {
    await this.lockVariants(tx, items.map((i) => i.variantId));
    for (const it of items) {
      await tx.productVariant.update({
        where: { id: it.variantId },
        data: { reservedQuantity: { decrement: it.quantity } },
      });
    }
  }

  /** إعادة الكمية للمخزون عند إلغاء طلب مؤكَّد أو إرجاع (stock += qty) + حركة RETURN */
  async restock(tx: Tx, items: LineItem[], createdBy?: number, reference?: string): Promise<void> {
    await this.lockVariants(tx, items.map((i) => i.variantId));
    for (const it of items) {
      await tx.productVariant.update({
        where: { id: it.variantId },
        data: { stockQuantity: { increment: it.quantity } },
      });
      await tx.stockMovement.create({
        data: { variantId: it.variantId, type: 'RETURN', quantity: it.quantity, reference, createdBy },
      });
    }
  }

  // ─────────── إدارة المخزون (لوحة الإدارة) ───────────
  async lowStock() {
    const rows = await this.prisma.$queryRaw<any[]>(
      Prisma.sql`SELECT pv.id, pv.sku, pv.stock_quantity, pv.reserved_quantity, pv.min_stock_alert, p.name as product_name
                 FROM product_variants pv JOIN products p ON p.id = pv.product_id
                 WHERE pv.stock_quantity - pv.reserved_quantity <= pv.min_stock_alert
                 ORDER BY pv.stock_quantity ASC`,
    );
    return rows;
  }

  async adjust(variantId: number, newQuantity: number, note: string, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const map = await this.lockVariants(tx, [variantId]);
      const r = map.get(variantId);
      if (!r) throw new BadRequestException('المتغيّر غير موجود');
      const diff = newQuantity - r.stock_quantity;
      await tx.productVariant.update({ where: { id: variantId }, data: { stockQuantity: newQuantity } });
      await tx.stockMovement.create({
        data: { variantId, type: 'ADJUSTMENT', quantity: diff, note: note || 'تسوية جرد', createdBy: userId },
      });
      return { variantId, stockQuantity: newQuantity, diff };
    });
  }

  movements(variantId: number) {
    return this.prisma.stockMovement.findMany({
      where: { variantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
