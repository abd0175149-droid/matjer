import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private withRole = {
    role: { include: { permissions: { include: { permission: true } } } },
  };

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: this.withRole,
    });
  }

  async findById(id: number) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: this.withRole,
    });
  }

  // يبني كائن المستخدم المصادَق عليه مع صلاحياته المسطّحة
  toAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((rp: any) => rp.permission.name),
    };
  }

  async getProfile(id: number) {
    const u = await this.findById(id);
    if (!u) throw new NotFoundException('المستخدم غير موجود');
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role.name,
      mustChangePassword: u.mustChangePassword,
    };
  }
}
