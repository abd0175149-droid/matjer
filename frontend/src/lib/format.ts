// عملة أحادية في الـ MVP (errata G5)
export const CURRENCY = 'د.أ';

export function money(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  return `${n.toFixed(2)} ${CURRENCY}`;
}

export const GOLD_TYPE_AR: Record<string, string> = {
  RUSSIAN: 'ذهب روسي',
  CHINESE: 'ذهب صيني',
};

export const ORDER_STATUS_AR: Record<string, string> = {
  NEW: 'جديد',
  CONFIRMED: 'مؤكد',
  PROCESSING: 'قيد التجهيز',
  SHIPPED: 'مشحون',
  DELIVERED: 'مُسلّم',
  CANCELLED: 'ملغي',
  RETURNED: 'مرتجع',
};

export const PAYMENT_AR: Record<string, string> = {
  COD: 'الدفع عند الاستلام',
  CARD: 'بطاقة',
  UNPAID: 'غير مدفوع',
  PAID: 'مدفوع',
  REFUNDED: 'مسترد',
};
