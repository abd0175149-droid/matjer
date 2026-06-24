import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check() {
    const out: any = { status: 'ok', service: 'matjer-backend' };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      out.db = 'up';
    } catch {
      out.db = 'down';
      out.status = 'degraded';
    }
    try {
      const pong = await this.redis.client.ping();
      out.redis = pong === 'PONG' ? 'up' : 'down';
    } catch {
      out.redis = 'down';
      out.status = 'degraded';
    }
    return out;
  }
}
