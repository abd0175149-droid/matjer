import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersCron } from './orders.cron';
import { InventoryModule } from '../inventory/inventory.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [InventoryModule, CouponsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrdersCron],
  exports: [OrdersService],
})
export class OrdersModule {}
