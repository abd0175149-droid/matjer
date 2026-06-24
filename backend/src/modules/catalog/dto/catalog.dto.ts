import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength,
} from 'class-validator';
import { GoldType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ProductQueryDto extends PaginationDto {
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsEnum(GoldType) goldType?: GoldType;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
}

export class VariantInput {
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @IsString() color?: string;
  @IsNumber() price: number;
  @IsOptional() @IsInt() @Min(0) stockQuantity?: number;
  @IsOptional() @IsInt() @Min(0) minStockAlert?: number;
}

export class CreateProductDto {
  @IsString() @MinLength(2) name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() categoryId: number;
  @IsEnum(GoldType) goldType: GoldType;
  @IsNumber() basePrice: number;
  @IsOptional() @IsNumber() discountPrice?: number;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @IsArray() variants?: VariantInput[];
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsNumber() basePrice?: number;
  @IsOptional() @IsNumber() discountPrice?: number;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateCategoryDto {
  @IsString() @MinLength(2) name: string;
  @IsString() slug: string;
  @IsOptional() @IsInt() parentId?: number;
  @IsOptional() @IsInt() sortOrder?: number;
}
