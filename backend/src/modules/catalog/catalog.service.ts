import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { CreateCategoryDto, CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  private orderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc': return { basePrice: 'asc' };
      case 'price_desc': return { basePrice: 'desc' };
      case 'best_selling': return { salesCount: 'desc' };
      case 'top_rated': return { avgRating: 'desc' };
      default: return { createdAt: 'desc' }; // newest / وصل حديثاً (errata G2)
    }
  }

  async listProducts(q: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = { isActive: true, deletedAt: null };
    if (q.categorySlug) where.category = { slug: q.categorySlug };
    if (q.goldType) where.goldType = q.goldType;
    if (q.q) where.name = { contains: q.q, mode: 'insensitive' };
    if (q.minPrice != null || q.maxPrice != null) {
      where.basePrice = {};
      if (q.minPrice != null) (where.basePrice as any).gte = q.minPrice;
      if (q.maxPrice != null) (where.basePrice as any).lte = q.maxPrice;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: this.orderBy(q.sort),
        ...paginate(q.page, q.limit),
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          category: { select: { name: true, slug: true } },
          variants: { where: { isActive: true }, select: { id: true, price: true, stockQuantity: true, reservedQuantity: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: items.map((p) => this.toCard(p)), total, page: q.page, limit: q.limit };
  }

  private toCard(p: any) {
    const minVariantStock = p.variants?.reduce((s: number, v: any) => s + (v.stockQuantity - v.reservedQuantity), 0) ?? 0;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      goldType: p.goldType,
      basePrice: p.basePrice,
      discountPrice: p.discountPrice,
      price: p.discountPrice ?? p.basePrice,
      isFeatured: p.isFeatured,
      image: p.images?.[0]?.imageUrl ?? null,
      category: p.category,
      inStock: minVariantStock > 0,
    };
  }

  async featured() {
    const items = await this.prisma.product.findMany({
      where: { isActive: true, deletedAt: null, isFeatured: true },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { images: { take: 1, orderBy: { sortOrder: 'asc' } }, category: { select: { name: true, slug: true } }, variants: { where: { isActive: true } } },
    });
    return items.map((p) => this.toCard(p));
  }

  async getProductBySlug(slug: string) {
    const p = await this.prisma.product.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: { select: { name: true, slug: true } },
        variants: { where: { isActive: true } },
      },
    });
    if (!p) throw new NotFoundException('المنتج غير موجود');
    return {
      ...p,
      price: p.discountPrice ?? p.basePrice,
      variants: p.variants.map((v) => ({ ...v, available: v.stockQuantity - v.reservedQuantity })),
    };
  }

  listCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, parentId: true },
    });
  }

  // ─────────── Admin ───────────
  async createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        categoryId: dto.categoryId,
        goldType: dto.goldType,
        basePrice: dto.basePrice,
        discountPrice: dto.discountPrice ?? null,
        isFeatured: dto.isFeatured ?? false,
        images: dto.images?.length ? { create: dto.images.map((url, i) => ({ imageUrl: url, sortOrder: i })) } : undefined,
        variants: dto.variants?.length
          ? {
              create: dto.variants.map((v, i) => ({
                sku: v.sku || `${dto.slug}-${i + 1}`,
                size: v.size,
                color: v.color,
                price: v.price,
                stockQuantity: v.stockQuantity ?? 0,
                minStockAlert: v.minStockAlert ?? 0,
              })),
            }
          : { create: [{ sku: `${dto.slug}-default`, price: dto.basePrice, stockQuantity: 0 }] },
      },
      include: { variants: true, images: true },
    });
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    await this.ensureProduct(id);
    return this.prisma.product.update({ where: { id }, data: { ...dto } });
  }

  async deleteProduct(id: number) {
    await this.ensureProduct(id);
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { id, deleted: true };
  }

  private async ensureProduct(id: number) {
    const p = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!p) throw new NotFoundException('المنتج غير موجود');
  }

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { ...dto } });
  }

  // قائمة إدارية تشمل غير المنشورة
  adminListProducts() {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { variants: true, category: { select: { name: true } } },
      take: 200,
    });
  }
}
