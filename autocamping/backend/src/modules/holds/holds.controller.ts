import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateHoldDto, HoldsService } from './holds.service';

@ApiTags('holds')
@Controller('holds')
export class HoldsController {
  constructor(private readonly service: HoldsService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateHoldDto) {
    return this.service.create(dto);
  }

  @Get(':token')
  findByToken(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Delete(':token')
  @HttpCode(204)
  async cancel(@Param('token') token: string) {
    await this.service.cancel(token);
  }
}
