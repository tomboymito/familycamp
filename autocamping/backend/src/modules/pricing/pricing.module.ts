import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from '../../database/entities/place.entity';
import { PricingRule } from '../../database/entities/pricing-rule.entity';
import { AdminPricingController, PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [TypeOrmModule.forFeature([PricingRule, Place])],
  controllers: [PricingController, AdminPricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
