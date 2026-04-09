import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { PricingRule } from '../../database/entities/pricing-rule.entity';
import { Place } from '../../database/entities/place.entity';

export interface CreateRuleInput {
  typeId: string;
  seasonLabel: string;
  validFrom: string;
  validTo: string;
  pricePerNight: number;
  minGuests?: number;
  maxGuests?: number;
  isActive?: boolean;
}

export interface UpdateRuleInput {
  seasonLabel?: string;
  validFrom?: string;
  validTo?: string;
  pricePerNight?: number;
  isActive?: boolean;
}

export interface PriceBreakdownItem {
  date: string;
  price: number;
  seasonLabel: string;
}

export interface PriceCalculation {
  nights: number;
  pricePerNight: number;
  total: number;
  seasonLabel: string;
  breakdown: PriceBreakdownItem[];
}

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PricingRule) private readonly ruleRepo: Repository<PricingRule>,
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
  ) {}

  async calculate(placeId: string, checkIn: string, checkOut: string, guestsCount: number): Promise<PriceCalculation> {
    const place = await this.placeRepo.findOne({ where: { id: placeId } });
    if (!place) throw new NotFoundException(`Place ${placeId} not found`);

    const dates = this.getDates(checkIn, checkOut);
    const nights = dates.length;

    const breakdown: PriceBreakdownItem[] = [];
    let total = 0;

    for (const date of dates) {
      const rule = await this.ruleRepo.findOne({
        where: {
          typeId: place.typeId,
          isActive: true,
          validFrom: LessThanOrEqual(date),
          validTo: MoreThanOrEqual(date),
        },
        order: { validFrom: 'DESC' },
      });

      const price = rule ? parseFloat(rule.pricePerNight) : 0;
      const label = rule?.seasonLabel ?? 'Стандартный тариф';
      breakdown.push({ date, price, seasonLabel: label });
      total += price;
    }

    const avgPrice = nights > 0 ? Math.round(total / nights) : 0;
    const mainLabel = breakdown[0]?.seasonLabel ?? 'Стандартный тариф';

    return { nights, pricePerNight: avgPrice, total, seasonLabel: mainLabel, breakdown };
  }

  findAll() {
    return this.ruleRepo.find({
      relations: ['accommodationType'],
      order: { validFrom: 'ASC' },
    });
  }

  create(dto: CreateRuleInput) {
    return this.ruleRepo.save(this.ruleRepo.create({
      typeId: dto.typeId,
      seasonLabel: dto.seasonLabel,
      validFrom: dto.validFrom,
      validTo: dto.validTo,
      pricePerNight: String(dto.pricePerNight),
      minGuests: dto.minGuests ?? 1,
      maxGuests: dto.maxGuests ?? null,
      isActive: dto.isActive ?? true,
    }));
  }

  async updateRule(id: string, dto: UpdateRuleInput) {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`PricingRule ${id} not found`);
    const update: Partial<{ seasonLabel: string; validFrom: string; validTo: string; pricePerNight: string; isActive: boolean }> = {};
    if (dto.seasonLabel !== undefined) update.seasonLabel = dto.seasonLabel;
    if (dto.validFrom   !== undefined) update.validFrom   = dto.validFrom;
    if (dto.validTo     !== undefined) update.validTo     = dto.validTo;
    if (dto.pricePerNight !== undefined) update.pricePerNight = String(dto.pricePerNight);
    if (dto.isActive    !== undefined) update.isActive    = dto.isActive;
    await this.ruleRepo.update(id, update);
    return this.ruleRepo.findOne({ where: { id }, relations: ['accommodationType'] });
  }

  async remove(id: string) {
    await this.ruleRepo.delete(id);
  }

  private getDates(checkIn: string, checkOut: string): string[] {
    const dates: string[] = [];
    const current = new Date(checkIn);
    const end = new Date(checkOut);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
}
