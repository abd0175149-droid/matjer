import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { InventoryService } from './inventory.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class AdjustDto {
  @IsInt() variantId: number;
  @IsInt() @Min(0) quantity: number;
  @IsOptional() @IsString() note?: string;
}

@Controller('admin/inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Get('low-stock')
  @RequirePermissions('inventory.read')
  lowStock() {
    return this.inventory.lowStock();
  }

  @Get('movements/:variantId')
  @RequirePermissions('inventory.read')
  movements(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.inventory.movements(variantId);
  }

  @Post('adjust')
  @RequirePermissions('inventory.write')
  adjust(@Body() dto: AdjustDto, @CurrentUser() user: AuthUser) {
    return this.inventory.adjust(dto.variantId, dto.quantity, dto.note ?? '', user.id);
  }

  @Post('movement')
  @RequirePermissions('inventory.write')
  movement(@Body() body: { variantId: number; type: string; quantity: number; note?: string }, @CurrentUser() user: AuthUser) {
    return this.inventory.createMovement(body.variantId, body.type, body.quantity, body.note ?? '', user.id);
  }

  @Post('count')
  @RequirePermissions('inventory.count')
  count(@Body() body: { counts: { variantId: number; counted: number }[] }, @CurrentUser() user: AuthUser) {
    return this.inventory.stockCount(body.counts || [], user.id);
  }
}
