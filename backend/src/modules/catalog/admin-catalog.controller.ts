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

  @Get('products/:id')
  @RequirePermissions('products.read')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.adminGetProduct(id);
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

  @Get('categories-admin')
  @RequirePermissions('products.read')
  listCategories() {
    return this.catalog.adminListCategories();
  }

  @Post('categories')
  @RequirePermissions('products.write')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalog.createCategory(dto);
  }

  @Patch('categories/:id')
  @RequirePermissions('products.write')
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.catalog.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @RequirePermissions('products.write')
  removeCategory(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.deleteCategory(id);
  }

  // صور المنتج
  @Post('products/:id/images')
  @RequirePermissions('products.write')
  addImages(@Param('id', ParseIntPipe) id: number, @Body() body: { urls: string[] }) {
    return this.catalog.addImages(id, body.urls || []);
  }

  @Delete('images/:imageId')
  @RequirePermissions('products.write')
  removeImage(@Param('imageId', ParseIntPipe) imageId: number) {
    return this.catalog.removeImage(imageId);
  }

  // متغيرات
  @Post('products/:id/variants')
  @RequirePermissions('products.write')
  addVariant(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.catalog.addVariant(id, body);
  }

  @Patch('variants/:id')
  @RequirePermissions('products.write')
  updateVariant(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.catalog.updateVariant(id, body);
  }

  @Delete('variants/:id')
  @RequirePermissions('products.write')
  removeVariant(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.removeVariant(id);
  }
}
