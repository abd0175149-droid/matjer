import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ReviewsService } from './reviews.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class ReviewDto {
  @IsInt() productId: number;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() comment?: string;
}

@Controller()
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Public()
  @Get('reviews/product/:productId')
  byProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviews.approvedByProduct(productId);
  }

  @Post('reviews')
  create(@CurrentUser() user: AuthUser, @Body() dto: ReviewDto) {
    return this.reviews.create(user.id, dto.productId, dto.rating, dto.comment);
  }

  @Get('admin/reviews')
  @RequirePermissions('products.write')
  pending() {
    return this.reviews.pending();
  }

  @Post('admin/reviews/:id/approve')
  @RequirePermissions('products.write')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.reviews.approve(id);
  }

  @Delete('admin/reviews/:id')
  @RequirePermissions('products.write')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviews.remove(id);
  }
}
