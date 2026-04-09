import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../../database/entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private readonly repo: Repository<Setting>,
  ) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.repo.find();
    return Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  }

  async updateMany(data: Record<string, string>): Promise<Record<string, string>> {
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
      await this.repo.upsert({ key, value }, ['key']);
    }
    return this.getAll();
  }
}
