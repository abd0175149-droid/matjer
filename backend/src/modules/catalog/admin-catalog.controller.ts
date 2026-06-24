import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto, CreateProductDto, UpdateProductDto } from './dto/catalog.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('admin')
export class AdminCatalogController {
  constructor(private catalog: CatalogService) {}

  @Get('products')
  @RequirePermissions('products.read')
  list() {
    return this.catalog.adminListProducts();
  }

  @Post('products')
  @RequirePermissions('products.write')
  create(@Body() dto: CreateProductDto) {
    return this.catalog.createProduct(dto);
  }

  @Patch('products/:id')
  @RequirePermissions('products.write')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.catalog.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @RequirePermissions('products.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.deleteProduct(id);
  }

  @Post('categories')
  @RequirePermissions('products.write')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalog.createCategory(dto);
  }
}
