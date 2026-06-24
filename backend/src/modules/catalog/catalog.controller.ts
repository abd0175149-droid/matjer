import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ProductQueryDto } from './dto/catalog.dto';
import { Public } from '../../common/decorators/public.decorator';

// واجهات المتجر العامة
@Controller()
export class CatalogController {
  constructor(private catalog: CatalogService) {}

  @Public()
  @Get('products')
  list(@Query() q: ProductQueryDto) {
    return this.catalog.listProducts(q);
  }

  @Public()
  @Get('products/featured')
  featured() {
    return this.catalog.featured();
  }

  @Public()
  @Get('products/:slug')
  one(@Param('slug') slug: string) {
    return this.catalog.getProductBySlug(slug);
  }

  @Public()
  @Get('categories')
  categories() {
    return this.catalog.listCategories();
  }
}
