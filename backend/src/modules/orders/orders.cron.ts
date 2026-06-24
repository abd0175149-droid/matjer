import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

// إلغاء تلقائي للطلبات الجديدة المنتهية المهلة (mds/06 — تحرير الحجز)
@Injectable()
export class OrdersCron {
  private readonly logger = new Logger('OrdersCron');
  private readonly timeoutMin = Number(process.env.RESERVATION_TIMEOUT_MIN || 120);

  constructor(private orders: OrdersService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async releaseStale() {
    try {
      const n = await this.orders.autoCancelStale(this.timeoutMin);
      if (n > 0) this.logger.log(`أُلغيت ${n} طلباً منتهي المهلة وتحرّر حجزها`);
    } catch (e: any) {
      this.logger.error(`فشل الإلغاء التلقائي: ${e.message}`);
    }
  }
}
