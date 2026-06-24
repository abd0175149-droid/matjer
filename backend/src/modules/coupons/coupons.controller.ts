import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CouponType } from '@prisma/client';
import { CouponsService } from './coupons.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

class ValidateDto {
  @IsString() code: string;
  @IsNumber() subtotal: number;
}
class CouponDto {
  @IsString() code: string;
  @IsEnum(CouponType) type: CouponType;
  @IsNumber() value: number;
  @IsOptional() @IsNumber() minOrder?: number;
  @IsOptional() @IsNumber() usageLimit?: number;
}

@Controller()
export class CouponsController {
  constructor(private coupons: CouponsService) {}

  @Public()
  @Post('coupons/validate')
  validate(@Body() dto: ValidateDto) {
    return this.coupons.validate(dto.code, dto.subtotal);
  }

  @Get('admin/coupons')
  @RequirePermissions('settings.manage')
  list() {
    return this.coupons.list();
  }

  @Post('admin/coupons')
  @RequirePermissions('settings.manage')
  create(@Body() dto: CouponDto) {
    return this.coupons.create({
      code: dto.code,
      type: dto.type,
      value: dto.value,
      minOrder: dto.minOrder ?? 0,
      usageLimit: dto.usageLimit ?? null,
    });
  }

  @Patch('admin/coupons/:id')
  @RequirePermissions('settings.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.coupons.update(id, body);
  }

  @Delete('admin/coupons/:id')
  @RequirePermissions('settings.manage')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coupons.remove(id);
  }
}
