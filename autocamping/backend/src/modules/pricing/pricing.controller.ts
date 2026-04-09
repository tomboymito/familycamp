import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PricingService } from './pricing.service';

class CalculatePriceDto {
  @IsUUID() placeId: string;
  @IsString() checkIn: string;
  @IsString() checkOut: string;
  @IsInt() @Min(1) guestsCount: number;
}

class CreatePricingRuleDto {
  @IsUUID()   typeId: string;
  @IsString() @MinLength(1) seasonLabel: string;
  @IsString() validFrom: string;
  @IsString() validTo: string;
  @IsNumber()  pricePerNight: number;
  @IsInt() @IsOptional()   minGuests?: number;
  @IsInt() @IsOptional()   maxGuests?: number;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

class UpdatePricingRuleDto {
  @IsString() @IsOptional() seasonLabel?: string;
  @IsString() @IsOptional() validFrom?: string;
  @IsString() @IsOptional() validTo?: string;
  @IsNumber() @IsOptional() pricePerNight?: number;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly service: PricingService) {}

  @Post('calculate')
  @HttpCode(200)
  calculate(@Body() dto: CalculatePriceDto) {
    if (dto.checkIn >= dto.checkOut) throw new BadRequestException('check_out must be after check_in');
    return this.service.calculate(dto.placeId, dto.checkIn, dto.checkOut, dto.guestsCount);
  }
}

@Controller('admin/pricing')
@UseGuards(JwtAuthGuard)
export class AdminPricingController {
  constructor(private readonly service: PricingService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreatePricingRuleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePricingRuleDto) {
    return this.service.updateRule(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
