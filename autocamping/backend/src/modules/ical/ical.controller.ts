import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IcalService } from './ical.service';

/** Public feed — no auth required (Airbnb/Booking.com polls this URL) */
@Controller('ical')
export class IcalPublicController {
  constructor(private readonly svc: IcalService) {}

  @Get(':placeId.ics')
  async feed(@Param('placeId') placeId: string, @Res() res: Response) {
    const ics = await this.svc.exportPlace(placeId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(ics);
  }
}

/** Admin-only import */
@Controller('admin/ical')
@UseGuards(JwtAuthGuard)
export class IcalAdminController {
  constructor(private readonly svc: IcalService) {}

  @Get(':placeId.ics')
  async adminFeed(@Param('placeId') placeId: string, @Res() res: Response) {
    const ics = await this.svc.exportPlace(placeId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${placeId}.ics"`);
    res.send(ics);
  }

  @Post('import')
  import(@Body() body: { placeId: string; url: string }) {
    return this.svc.importFromUrl(body.placeId, body.url);
  }
}
