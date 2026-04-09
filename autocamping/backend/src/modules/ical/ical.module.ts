import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { Blocking } from '../../database/entities/blocking.entity';
import { Place } from '../../database/entities/place.entity';
import { IcalService } from './ical.service';
import { IcalPublicController, IcalAdminController } from './ical.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Blocking, Place])],
  controllers: [IcalPublicController, IcalAdminController],
  providers: [IcalService],
})
export class IcalModule {}
