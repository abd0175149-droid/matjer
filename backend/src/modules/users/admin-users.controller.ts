import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() @MinLength(6) password: string;
  @IsInt() roleId: number;
}
class UpdateUserDto {
  @IsOptional() @IsInt() roleId?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string;
}

@Controller('admin')
export class AdminUsersController {
  constructor(private prisma: PrismaService) {}

  @Get('roles')
  @RequirePermissions('users.manage')
  roles() {
    return this.prisma.role.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true, description: true } });
  }

  @Get('users')
  @RequirePermissions('users.manage')
  async list() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: { role: { select: { name: true } } },
      orderBy: { id: 'asc' },
    });
    return users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role.name, isActive: u.isActive }));
  }

  @Post('users')
  @RequirePermissions('users.manage')
  async create(@Body() dto: CreateUserDto) {
    const u = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        roleId: dto.roleId,
        provider: 'local',
        passwordHash: await bcrypt.hash(dto.password, 10),
        mustChangePassword: true, // errata G11
      },
    });
    return { id: u.id, email: u.email };
  }

  @Patch('users/:id')
  @RequirePermissions('users.manage')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    const data: any = {};
    if (dto.roleId != null) data.roleId = dto.roleId;
    if (dto.isActive != null) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({ where: { id }, data });
    return { id, updated: true };
  }
}
