import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { SettingsModule } from '../settings/settings.module';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), SettingsModule],
  controllers: [PdfController],
  providers: [PdfService],
})
export class PdfModule {}
