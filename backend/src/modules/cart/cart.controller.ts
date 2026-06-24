import { Body, Controller, Get, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { CartService } from './cart.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CartLine {
  @IsInt() variantId: number;
  @IsInt() @Min(1) quantity: number;
}
class CartBody {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CartLine) items: CartLine[];
}

@Controller('cart')
export class CartController {
  constructor(private cart: CartService) {}

  @Public()
  @Post('validate')
  validate(@Body() body: CartBody) {
    return this.cart.validate(body.items);
  }

  @Post('save')
  save(@CurrentUser() user: AuthUser, @Body() body: CartBody) {
    return this.cart.saveForUser(user.id, body.items);
  }

  @Get('load')
  load(@CurrentUser() user: AuthUser) {
    return this.cart.loadForUser(user.id);
  }
}
