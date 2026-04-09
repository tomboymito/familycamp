import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('revenue')
  revenueByMonth(@Query('months') months?: string) {
    return this.svc.revenueByMonth(months ? parseInt(months, 10) : 12);
  }

  @Get('occupancy')
  occupancyByPlace(@Query('from') from: string, @Query('to') to: string) {
    const f = from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const t = to   ?? new Date().toISOString().slice(0, 10);
    return this.svc.occupancyByPlace(f, t);
  }

  @Get('sources')
  bySource(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.bySource(from, to);
  }

  @Get('summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.summary(from, to);
  }

  @Get('export/csv')
  async exportCsv(
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.svc.exportCsv(
      from ?? new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      to   ?? new Date().toISOString().slice(0, 10),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bookings_${from}_${to}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel
  }
}
