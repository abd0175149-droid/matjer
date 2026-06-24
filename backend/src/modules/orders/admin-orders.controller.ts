import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
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
  list(@Query('status') status?: OrderStatus, @Query('q') q?: string) {
    return this.orders.adminList(status, q);
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
