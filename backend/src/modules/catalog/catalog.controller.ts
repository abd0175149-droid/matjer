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
  @Get('products/sections')
  sections() {
    return this.catalog.sections();
  }

  @Public()
  @Get('products/suggest')
  suggest(@Query('q') q: string) {
    return this.catalog.suggest(q || '');
  }

  @Public()
  @Get('products/filter-options')
  filterOptions() {
    return this.catalog.filterOptions();
  }

  @Public()
  @Get('products/:slug/related')
  related(@Param('slug') slug: string) {
    return this.catalog.related(slug);
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
