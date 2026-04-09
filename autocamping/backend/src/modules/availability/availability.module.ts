import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { Blocking } from '../../database/entities/blocking.entity';
import { Hold } from '../../database/entities/hold.entity';
import { Place } from '../../database/entities/place.entity';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Hold, Blocking, Place])],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
