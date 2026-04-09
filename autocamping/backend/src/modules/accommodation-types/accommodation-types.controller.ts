import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AccommodationTypesService,
  CreateAccommodationTypeDto,
  UpdateAccommodationTypeDto,
} from './accommodation-types.service';

@ApiTags('accommodation-types')
@Controller('accommodation-types')
export class AccommodationTypesController {
  constructor(private readonly service: AccommodationTypesService) {}

  @Get()
  findAll(@Query('active') active?: string) {
    return this.service.findAll(active === 'true');
  }
}

@Controller('admin/accommodation-types')
export class AdminAccommodationTypesController {
  constructor(private readonly service: AccommodationTypesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAccommodationTypeDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateAccommodationTypeDto) {
    return this.service.update(id, dto);
  }
}
