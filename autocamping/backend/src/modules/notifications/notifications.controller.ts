import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import type { SendNotificationInput } from './notifications.service';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Post('send')
  send(@Body() body: SendNotificationInput) {
    return this.svc.send(body);
  }

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.list(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
