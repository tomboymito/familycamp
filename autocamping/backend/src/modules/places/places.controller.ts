import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePlaceDto, PlacesService, UpdatePlaceDto } from './places.service';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly service: PlacesService) {}

  @Get()
  findAll(@Query('type_id') typeId?: string) {
    return this.service.findAll(typeId, true);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}

@Controller('admin/places')
export class AdminPlacesController {
  constructor(private readonly service: PlacesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('type_id') typeId?: string) {
    return this.service.findAll(typeId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePlaceDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePlaceDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard)
  toggle(@Param('id') id: string) {
    return this.service.toggle(id);
  }

  @Patch(':id/housekeeping')
  @UseGuards(JwtAuthGuard)
  setHousekeeping(@Param('id') id: string, @Body('status') status: string) {
    return this.service.setHousekeepingStatus(id, status);
  }
}
