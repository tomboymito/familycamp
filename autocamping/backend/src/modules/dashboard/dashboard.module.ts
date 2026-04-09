import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { Place } from '../../database/entities/place.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Place])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
