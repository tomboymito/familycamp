import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Patch()
  update(@Body() body: Record<string, string>) {
    return this.service.updateMany(body);
  }
}
