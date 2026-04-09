import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { CustomersModule } from '../customers/customers.module';
import { HoldsModule } from '../holds/holds.module';
import { PricingModule } from '../pricing/pricing.module';
import { AdminBookingsController, BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), HoldsModule, PricingModule, CustomersModule],
  controllers: [BookingsController, AdminBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
