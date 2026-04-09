import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  BookingsService,
  CreateAdminBookingDto,
  CreateBookingDto,
  ListBookingsQuery,
  UpdateBookingDto,
} from './bookings.service';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.service.createFromHold(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findPublic(id);
  }
}

@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Query() query: ListBookingsQuery) {
    return this.service.listAdmin(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.service.findAdmin(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAdminBookingDto) {
    return this.service.createAdmin(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateStatus(id, status);
  }

  @Patch(':id/payment')
  @UseGuards(JwtAuthGuard)
  updatePayment(@Param('id') id: string, @Body('paymentStatus') paymentStatus: string) {
    return this.service.updatePayment(id, paymentStatus);
  }

  @Patch(':id/note')
  @UseGuards(JwtAuthGuard)
  updateNote(@Param('id') id: string, @Body('adminNote') adminNote: string) {
    return this.service.updateNote(id, adminNote);
  }

  @Patch(':id/times')
  @UseGuards(JwtAuthGuard)
  updateTimes(
    @Param('id') id: string,
    @Body('checkInTime') checkInTime: string,
    @Body('checkOutTime') checkOutTime: string,
  ) {
    return this.service.updateTimes(id, checkInTime, checkOutTime);
  }

  @Post(':id/resync-crm')
  @UseGuards(JwtAuthGuard)
  resyncCrm(@Param('id') id: string) {
    return { message: 'CRM sync queued', bookingId: id };
  }
}
