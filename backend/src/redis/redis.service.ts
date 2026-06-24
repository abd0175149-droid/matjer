import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    this.client.on('error', (e) => console.error('[redis]', e.message));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
