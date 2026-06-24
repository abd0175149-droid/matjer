import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class ProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
}
class AddressDto {
  @IsString() fullName: string;
  @IsString() phone: string;
  @IsString() city: string;
  @IsOptional() @IsString() area?: string;
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() details?: string;
}

@Controller('account')
export class AccountController {
  constructor(private prisma: PrismaService) {}

  @Patch('profile')
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: ProfileDto) {
    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.phone) data.phone = dto.phone;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    const u = await this.prisma.user.update({ where: { id: user.id }, data });
    return { id: u.id, name: u.name, phone: u.phone };
  }

  @Get('addresses')
  addresses(@CurrentUser() user: AuthUser) {
    return this.prisma.address.findMany({ where: { customerId: user.id }, orderBy: { id: 'desc' } });
  }

  @Post('addresses')
  addAddress(@CurrentUser() user: AuthUser, @Body() dto: AddressDto) {
    return this.prisma.address.create({ data: { ...dto, customerId: user.id } });
  }

  @Patch('addresses/:id')
  async updateAddress(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: AddressDto) {
    await this.prisma.address.updateMany({ where: { id, customerId: user.id }, data: { ...dto } });
    return { id, updated: true };
  }

  @Delete('addresses/:id')
  async removeAddress(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await this.prisma.address.deleteMany({ where: { id, customerId: user.id } });
    return { id, deleted: true };
  }
}
