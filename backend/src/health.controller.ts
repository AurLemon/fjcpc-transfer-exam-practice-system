import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisCacheService } from './redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  @Get()
  async getHealth() {
    try {
      await this.dataSource.query('SELECT 1');
      await this.redisCacheService.ping();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable' });
    }
  }
}
