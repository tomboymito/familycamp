import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PdfService } from './pdf.service';

@Controller('admin/bookings')
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(private readonly svc: PdfService) {}

  @Get(':id/pdf/confirmation')
  async confirmation(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.svc.confirmation(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="booking_${id.slice(0,8)}_confirmation.pdf"`);
    res.send(buf);
  }

  @Get(':id/pdf/invoice')
  async invoice(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.svc.invoice(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="booking_${id.slice(0,8)}_invoice.pdf"`);
    res.send(buf);
  }
}
