import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hold } from '../../database/entities/hold.entity';
import { AvailabilityModule } from '../availability/availability.module';
import { HoldsController } from './holds.controller';
import { HoldsService } from './holds.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hold]), AvailabilityModule],
  controllers: [HoldsController],
  providers: [HoldsService],
  exports: [HoldsService],
})
export class HoldsModule {}
