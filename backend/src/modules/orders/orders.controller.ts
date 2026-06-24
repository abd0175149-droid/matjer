import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/orders.dto';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

// واجهات العميل/الضيف
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  // إنشاء طلب — يدعم الضيف والمسجّل (مصادقة اختيارية)
  @Public()
  @UseGuards(OptionalJwtGuard)
  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser | null) {
    return this.orders.create(dto, user?.id ?? null);
  }

  @Public()
  @Get('track/:uuid')
  track(@Param('uuid') uuid: string) {
    return this.orders.trackByUuid(uuid);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.myOrders(user.id);
  }

  @Get('mine/:id')
  mineOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.getMine(user.id, id);
  }
}
