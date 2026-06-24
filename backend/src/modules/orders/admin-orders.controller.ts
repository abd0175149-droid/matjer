import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { OrdersService } from './orders.service';
import { UpdateStatusDto } from './dto/orders.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('admin')
export class AdminOrdersController {
  constructor(private orders: OrdersService) {}

  @Get('dashboard')
  @RequirePermissions('orders.read')
  dashboard() {
    return this.orders.dashboardStats();
  }

  @Get('orders')
  @RequirePermissions('orders.read')
  list(
    @Query('status') status?: OrderStatus,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
  ) {
    return this.orders.adminList({ status, q, from, to, paymentMethod });
  }

  @Post('orders/:id/items')
  @RequirePermissions('orders.write')
  editItems(@Param('id', ParseIntPipe) id: number, @Body() body: { items: { variantId: number; quantity: number }[] }) {
    return this.orders.editItems(id, body.items);
  }

  @Get('orders/:id')
  @RequirePermissions('orders.read')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.orders.adminGet(id);
  }

  @Post('orders/:id/status')
  @RequirePermissions('orders.write')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.transition(id, dto, user.id);
  }
}
