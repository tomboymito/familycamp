import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaymentsService } from './payments.service';
import type { Request } from 'express';

class InitiatePaymentDto {
  @IsUUID() bookingId: string;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('initiate')
  @HttpCode(200)
  initiate(@Body() dto: InitiatePaymentDto) {
    return this.service.initiatePayment(dto.bookingId);
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.service.getStatus(id);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-signature') signature: string,
    @Body() payload: Record<string, unknown>,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(payload));
    await this.service.handleWebhook(rawBody, signature ?? '', payload);
    return { ok: true };
  }
}
