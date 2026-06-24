import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const DEFAULT_SETTINGS: Record<string, string> = {
  store_name: 'متجر الذهب',
  currency: 'JOD',
  currency_symbol: 'د.أ',
  tax_rate: '0', // نسبة مئوية
  shipping_flat: '0',
  free_shipping_threshold: '0', // 0 = معطّل
};

const PUBLIC_KEYS = ['store_name', 'currency', 'currency_symbol', 'tax_rate', 'shipping_flat', 'free_shipping_threshold'];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany();
    const map = { ...DEFAULT_SETTINGS };
    for (const r of rows) map[r.key] = r.value;
    return map;
  }

  async getPublic(): Promise<Record<string, string>> {
    const all = await this.getAll();
    return Object.fromEntries(PUBLIC_KEYS.map((k) => [k, all[k]]));
  }

  async num(key: string): Promise<number> {
    const all = await this.getAll();
    return Number(all[key] ?? DEFAULT_SETTINGS[key] ?? 0);
  }

  async update(patch: Record<string, string>) {
    const entries = Object.entries(patch).filter(([k]) => k in DEFAULT_SETTINGS);
    for (const [key, value] of entries) {
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    return this.getAll();
  }

  // حساب الشحن والضريبة لطلب (errata G4/G5)
  async computeCharges(subtotal: number) {
    const all = await this.getAll();
    const taxRate = Number(all.tax_rate || 0);
    const shippingFlat = Number(all.shipping_flat || 0);
    const freeThreshold = Number(all.free_shipping_threshold || 0);
    const shippingCost = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : shippingFlat;
    const taxAmount = +((subtotal * taxRate) / 100).toFixed(2);
    return { shippingCost, taxAmount };
  }
}
