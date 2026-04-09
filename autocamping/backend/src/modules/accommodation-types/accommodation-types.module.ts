import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccommodationType } from '../../database/entities/accommodation-type.entity';
import {
  AccommodationTypesController,
  AdminAccommodationTypesController,
} from './accommodation-types.controller';
import { AccommodationTypesService } from './accommodation-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccommodationType])],
  controllers: [AccommodationTypesController, AdminAccommodationTypesController],
  providers: [AccommodationTypesService],
  exports: [AccommodationTypesService],
})
export class AccommodationTypesModule {}
