import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  private async issueTokens(authUser: { id: number; email: string; role: string; permissions: string[] }) {
    const payload = { sub: authUser.id, email: authUser.email, role: authUser.role, permissions: authUser.permissions };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: '1d' });
    const refreshToken = await this.jwt.signAsync({ sub: authUser.id, typ: 'refresh' }, { expiresIn: '30d' });
    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('بيانات الدخول غير صحيحة');

    const authUser = this.users.toAuthUser(user);
    return {
      ...(await this.issueTokens(authUser)),
      user: { id: user.id, name: user.name, email: user.email, role: authUser.role },
    };
  }

  async register(dto: RegisterDto) {
    const exists = await this.users.findByEmail(dto.email);
    if (exists) throw new BadRequestException('البريد مستخدم مسبقاً');

    const customerRole = await this.prisma.role.findUnique({ where: { name: 'customer' } });
    if (!customerRole) throw new BadRequestException('دور العميل غير مهيّأ — شغّل السيد');

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 10),
        roleId: customerRole.id,
        provider: 'local',
      },
    });
    const authUser = { id: user.id, email: user.email, role: 'customer', permissions: [] as string[] };
    return {
      ...(await this.issueTokens(authUser)),
      user: { id: user.id, name: user.name, email: user.email, role: 'customer' },
    };
  }

  async refresh(refreshToken: string) {
    let decoded: any;
    try {
      decoded = await this.jwt.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('رمز التجديد غير صالح');
    }
    if (decoded.typ !== 'refresh') throw new UnauthorizedException('رمز التجديد غير صالح');

    const user = await this.users.findById(decoded.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('المستخدم غير نشط');
    const authUser = this.users.toAuthUser(user);
    return this.issueTokens(authUser);
  }
}
