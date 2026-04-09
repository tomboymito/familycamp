import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { WebhookLog } from '../../database/entities/webhook-log.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Place } from '../../database/entities/place.entity';
import { WebhooksService } from './webhooks.service';
import { WebhooksPublicController, WebhooksAdminController } from './webhooks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, WebhookLog, Customer, Place])],
  controllers: [WebhooksPublicController, WebhooksAdminController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
