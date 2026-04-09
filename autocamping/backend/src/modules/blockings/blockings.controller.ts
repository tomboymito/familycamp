import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BlockingsService, CreateBlockingDto, UpdateBlockingDto } from './blockings.service';

@ApiTags('blockings')
@Controller('admin/blockings')
export class BlockingsController {
  constructor(private readonly service: BlockingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('place_id') placeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(placeId, from, to);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateBlockingDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateBlockingDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
