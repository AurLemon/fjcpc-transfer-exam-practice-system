import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  constructor(@InjectRedis() private readonly redisClient: Redis) {}

  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  async set(key: string, value: string, ttlInSeconds?: number): Promise<void> {
    if (ttlInSeconds) {
      await this.redisClient.set(key, value, 'EX', ttlInSeconds);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async delete(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }
}
