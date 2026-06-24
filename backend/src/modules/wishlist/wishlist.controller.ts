import { Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('wishlist')
export class WishlistController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const items = await this.prisma.wishlist.findMany({
      where: { customerId: user.id },
      include: { product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } } },
      orderBy: { id: 'desc' },
    });
    return items.map((w) => ({
      productId: w.productId,
      name: w.product.name,
      slug: w.product.slug,
      price: w.product.discountPrice ?? w.product.basePrice,
      image: w.product.images[0]?.imageUrl ?? null,
    }));
  }

  @Post(':productId')
  async add(@CurrentUser() user: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    await this.prisma.wishlist.upsert({
      where: { customerId_productId: { customerId: user.id, productId } },
      update: {},
      create: { customerId: user.id, productId },
    });
    return { productId, added: true };
  }

  @Delete(':productId')
  async remove(@CurrentUser() user: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    await this.prisma.wishlist.deleteMany({ where: { customerId: user.id, productId } });
    return { productId, removed: true };
  }
}
