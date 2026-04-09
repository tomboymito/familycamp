import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WebhooksService } from './webhooks.service';
import type { OtaBookingInput } from './webhooks.service';

/** Публичные webhook-эндпоинты — без JWT (вызываются OTA-площадками) */
@Controller('webhook')
export class WebhooksPublicController {
  constructor(private readonly svc: WebhooksService) {}

  /** Booking.com — отправляет XML (OTA_HotelResNotifRQ) */
  @Post('booking-com')
  @HttpCode(200)
  async bookingCom(@Req() req: RawBodyRequest<Request>) {
    const xml = req.rawBody?.toString('utf-8') ?? '';
    return this.svc.handleBookingCom(xml);
  }

  /** Авито Путешествия — отправляет JSON */
  @Post('avito')
  @HttpCode(200)
  avito(@Body() body: Record<string, unknown>) {
    return this.svc.handleAvito(body, JSON.stringify(body));
  }

  /** Generic — нормализованный JSON, подходит для любых интеграций и ручных тестов */
  @Post('generic')
  @HttpCode(200)
  generic(@Body() body: OtaBookingInput) {
    return this.svc.handleGeneric(body, JSON.stringify(body));
  }
}

/** Админские эндпоинты — просмотр логов и ручная проверка конфликтов */
@Controller('admin/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksAdminController {
  constructor(private readonly svc: WebhooksService) {}

  @Get('logs')
  logs(@Query('page') page?: string) {
    return this.svc.listLogs(page ? parseInt(page, 10) : 1);
  }

  @Post('check-conflict')
  checkConflict(
    @Body() body: { placeId: string; checkIn: string; checkOut: string },
  ) {
    return this.svc.checkConflict(body.placeId, body.checkIn, body.checkOut);
  }
}
