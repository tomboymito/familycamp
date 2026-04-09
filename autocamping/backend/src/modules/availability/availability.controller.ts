import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get('calendar')
  getCalendar(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('type_id') typeId?: string,
  ) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!m || !y || m < 1 || m > 12) throw new BadRequestException('Invalid month/year');
    return this.service.getCalendar(m, y, typeId);
  }

  @Get(':place_id')
  getPlaceAvailability(
    @Param('place_id') placeId: string,
    @Query('check_in') checkIn: string,
    @Query('check_out') checkOut: string,
  ) {
    if (!checkIn || !checkOut) throw new BadRequestException('check_in and check_out required');
    return this.service.getPlaceAvailability(placeId, checkIn, checkOut);
  }

  @Get()
  getAvailability(
    @Query('check_in') checkIn: string,
    @Query('check_out') checkOut: string,
    @Query('type_id') typeId?: string,
    @Query('guests') guests?: string,
  ) {
    if (!checkIn || !checkOut) throw new BadRequestException('check_in and check_out required');
    return this.service.getAvailability(checkIn, checkOut, typeId, guests ? parseInt(guests, 10) : undefined);
  }
}
