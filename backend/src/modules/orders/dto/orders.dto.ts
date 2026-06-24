import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested,
} from 'class-validator';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export class OrderItemInput {
  @IsInt() variantId: number;
  @IsInt() @Min(1) quantity: number;
}

export class ShippingInput {
  @IsString() @MinLength(2) fullName: string;
  @IsString() @MinLength(6) phone: string;
  @IsString() city: string;
  @IsOptional() @IsString() area?: string;
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() details?: string;
}

export class CreateOrderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemInput)
  items: OrderItemInput[];

  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;

  @ValidateNested() @Type(() => ShippingInput)
  shipping: ShippingInput;

  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() couponCode?: string;
}

export class UpdateStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() shippingCarrier?: string;
}
