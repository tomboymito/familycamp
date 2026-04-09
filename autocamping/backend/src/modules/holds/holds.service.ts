import { ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Hold } from '../../database/entities/hold.entity';
import { AvailabilityService } from '../availability/availability.service';
import { IsInt, IsString, IsUUID, Min } from 'class-validator';
import { randomBytes } from 'crypto';

export class CreateHoldDto {
  @IsUUID() placeId: string;
  @IsString() checkIn: string;
  @IsString() checkOut: string;
  @IsInt() @Min(1) guestsCount: number;
}

@Injectable()
export class HoldsService {
  constructor(
    @InjectRepository(Hold) private readonly repo: Repository<Hold>,
    private readonly availabilityService: AvailabilityService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateHoldDto): Promise<Hold> {
    const ttl = this.config.get<number>('HOLD_TTL_MINUTES', 15);

    // Use transaction + SELECT FOR UPDATE to prevent race conditions
    return this.dataSource.transaction(async (manager) => {
      // Lock the place row to prevent concurrent holds
      await manager.query('SELECT id FROM places WHERE id = $1 FOR UPDATE', [dto.placeId]);

      const state = await this.availabilityService.checkPlaceAvailability(
        dto.placeId,
        dto.checkIn,
        dto.checkOut,
      );

      if (state !== 'free') {
        throw new ConflictException(`Place is not available: ${state}`);
      }

      const expiresAt = new Date(Date.now() + ttl * 60 * 1000);
      const sessionToken = `hold_${randomBytes(16).toString('hex')}`;

      const hold = manager.getRepository(Hold).create({
        placeId: dto.placeId,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        guestsCount: dto.guestsCount,
        sessionToken,
        expiresAt,
      });

      return manager.getRepository(Hold).save(hold);
    });
  }

  async findByToken(token: string): Promise<Hold> {
    const hold = await this.repo.findOne({ where: { sessionToken: token } });
    if (!hold) throw new NotFoundException('Hold not found');
    if (hold.expiresAt < new Date()) throw new GoneException('Hold has expired');
    return hold;
  }

  async cancel(token: string): Promise<void> {
    const hold = await this.repo.findOne({ where: { sessionToken: token } });
    if (!hold) throw new NotFoundException('Hold not found');
    await this.repo.delete(hold.id);
  }

  /** Delete a hold by ID (called after booking is confirmed) */
  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredHolds(): Promise<void> {
    const result = await this.repo.delete({ expiresAt: LessThan(new Date()) });
    if (result.affected && result.affected > 0) {
      console.log(`Cleaned up ${result.affected} expired hold(s)`);
    }
  }
}
