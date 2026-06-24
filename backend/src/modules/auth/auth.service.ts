import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../../redis/redis.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private jwt: JwtService,
    private redis: RedisService,
  ) {}

  private rtKey(token: string) {
    return `revoked_rt:${crypto.createHash('sha256').update(token).digest('hex')}`;
  }

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

    // تحقق ثنائي إن كان مفعّلاً (mds/10 §6)
    if (user.tfaEnabled) {
      if (!dto.code) throw new UnauthorizedException('TFA_REQUIRED');
      const valid = user.tfaSecret && authenticator.verify({ token: dto.code, secret: user.tfaSecret });
      if (!valid) throw new UnauthorizedException('رمز التحقق غير صحيح');
    }

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
    if (await this.redis.client.get(this.rtKey(refreshToken))) {
      throw new UnauthorizedException('انتهت الجلسة');
    }
    const user = await this.users.findById(decoded.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('المستخدم غير نشط');
    const authUser = this.users.toAuthUser(user);
    return this.issueTokens(authUser);
  }

  // تسجيل الخروج: إبطال رمز التجديد (revocation)
  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.redis.client.set(this.rtKey(refreshToken), '1', 'EX', 60 * 60 * 24 * 30);
    }
    return { loggedOut: true };
  }

  // ─────────── 2FA (TOTP) ───────────
  async setup2fa(userId: number, email: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { tfaSecret: secret } });
    const otpauth = authenticator.keyuri(email, 'matjer', secret);
    const qr = await QRCode.toDataURL(otpauth);
    return { otpauth, qr };
  }

  async enable2fa(userId: number, code: string) {
    const user = await this.users.findById(userId);
    if (!user?.tfaSecret) throw new BadRequestException('ابدأ الإعداد أولاً');
    if (!authenticator.verify({ token: code, secret: user.tfaSecret })) {
      throw new BadRequestException('رمز غير صحيح');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { tfaEnabled: true } });
    return { enabled: true };
  }

  async disable2fa(userId: number, code: string) {
    const user = await this.users.findById(userId);
    if (user?.tfaEnabled && (!user.tfaSecret || !authenticator.verify({ token: code, secret: user.tfaSecret }))) {
      throw new BadRequestException('رمز غير صحيح');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { tfaEnabled: false, tfaSecret: null } });
    return { enabled: false };
  }
}
