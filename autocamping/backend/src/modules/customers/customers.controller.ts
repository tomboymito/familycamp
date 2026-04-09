import { Controller, Get, Param, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@Controller('admin/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // If called with just `q` and no pagination params — return autocomplete array (used by CreateBookingModal)
    if (q && !tag && !page) {
      return this.service.search(q);
    }
    return this.service.list({
      q: q || undefined,
      tag: tag || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: { name?: string; phone?: string; email?: string; carNumber?: string; notes?: string; tags?: string[] },
  ) {
    return this.service.update(id, dto);
  }
}
