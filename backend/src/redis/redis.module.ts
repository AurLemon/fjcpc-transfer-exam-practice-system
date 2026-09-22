// src/redis/redis.module.ts
import { Module } from '@nestjs/common';
import { RedisModule as IoredisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisCacheService } from './redis.service';

@Module({
  imports: [
    IoredisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'single',
        options: {
          host: configService.get('redis.host', 'localhost'),
          port: configService.get('redis.port', 6379),
          password: configService.get('redis.password') || '',
        },
      }),
    }),
  ],
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisModule {}
