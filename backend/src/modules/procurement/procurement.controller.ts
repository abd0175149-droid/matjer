import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('admin/procurement')
export class ProcurementController {
  constructor(private proc: ProcurementService) {}

  @Get('suppliers')
  @RequirePermissions('purchases.read')
  suppliers() {
    return this.proc.listSuppliers();
  }

  @Post('suppliers')
  @RequirePermissions('purchases.write')
  createSupplier(@Body() body: { name: string; contact?: string; notes?: string }) {
    return this.proc.createSupplier(body);
  }

  @Patch('suppliers/:id')
  @RequirePermissions('purchases.write')
  updateSupplier(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.proc.updateSupplier(id, body);
  }

  @Get('orders')
  @RequirePermissions('purchases.read')
  orders() {
    return this.proc.listOrders();
  }

  @Get('orders/:id')
  @RequirePermissions('purchases.read')
  order(@Param('id', ParseIntPipe) id: number) {
    return this.proc.getOrder(id);
  }

  @Post('orders')
  @RequirePermissions('purchases.write')
  createOrder(@Body() body: { supplierId: number; items: any[]; notes?: string }) {
    return this.proc.createOrder(body.supplierId, body.items, body.notes);
  }

  @Post('orders/:id/receive')
  @RequirePermissions('purchases.write')
  receive(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.proc.receive(id, user.id);
  }
}
