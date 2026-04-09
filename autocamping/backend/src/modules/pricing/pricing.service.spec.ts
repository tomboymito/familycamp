import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingRule } from '../../database/entities/pricing-rule.entity';
import { Place } from '../../database/entities/place.entity';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const PLACE_ID = 'place-uuid-1';
const TYPE_ID = 'type-uuid-1';

const mockPlace = {
  id: PLACE_ID,
  typeId: TYPE_ID,
  name: 'A1',
  code: 'A1',
  capacity: 4,
};

const mockHighSeasonRule = {
  id: 'rule-uuid-1',
  typeId: TYPE_ID,
  seasonLabel: 'Высокий сезон',
  pricePerNight: '2100',
  validFrom: '2025-06-01',
  validTo: '2025-09-01',
  isActive: true,
  priority: 10,
};

const mockLowSeasonRule = {
  id: 'rule-uuid-2',
  typeId: TYPE_ID,
  seasonLabel: 'Низкий сезон',
  pricePerNight: '900',
  validFrom: '2025-01-01',
  validTo: '2025-06-01',
  isActive: true,
  priority: 5,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildModule(placeReturn: unknown, ruleReturn: unknown) {
  return Test.createTestingModule({
    providers: [
      PricingService,
      {
        provide: getRepositoryToken(Place),
        useValue: { findOne: jest.fn().mockResolvedValue(placeReturn) },
      },
      {
        provide: getRepositoryToken(PricingRule),
        useValue: { findOne: jest.fn().mockResolvedValue(ruleReturn) },
      },
    ],
  }).compile();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PricingService.calculate', () => {
  let service: PricingService;

  it('throws NotFoundException when place does not exist', async () => {
    const module: TestingModule = await buildModule(null, null);
    service = module.get(PricingService);

    await expect(
      service.calculate('nonexistent-id', '2025-07-01', '2025-07-03', 2),
    ).rejects.toThrow(NotFoundException);
  });

  it('calculates 1 night correctly', async () => {
    const module: TestingModule = await buildModule(mockPlace, mockHighSeasonRule);
    service = module.get(PricingService);

    const result = await service.calculate(PLACE_ID, '2025-07-01', '2025-07-02', 2);

    expect(result.nights).toBe(1);
    expect(result.total).toBe(2100);
    expect(result.pricePerNight).toBe(2100);
    expect(result.seasonLabel).toBe('Высокий сезон');
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].date).toBe('2025-07-01');
  });

  it('calculates 3 nights correctly', async () => {
    const module: TestingModule = await buildModule(mockPlace, mockHighSeasonRule);
    service = module.get(PricingService);

    const result = await service.calculate(PLACE_ID, '2025-07-01', '2025-07-04', 2);

    expect(result.nights).toBe(3);
    expect(result.total).toBe(6300);
    expect(result.pricePerNight).toBe(2100);
    expect(result.breakdown).toHaveLength(3);
  });

  it('returns 0 total when no pricing rule exists', async () => {
    const module: TestingModule = await buildModule(mockPlace, null);
    service = module.get(PricingService);

    const result = await service.calculate(PLACE_ID, '2025-07-01', '2025-07-03', 2);

    expect(result.nights).toBe(2);
    expect(result.total).toBe(0);
    expect(result.pricePerNight).toBe(0);
    expect(result.seasonLabel).toBe('Стандартный тариф');
  });

  it('calculates correct breakdown for each day', async () => {
    const ruleRepo = { findOne: jest.fn() };
    // Day 1: low season, Day 2: high season
    ruleRepo.findOne
      .mockResolvedValueOnce(mockLowSeasonRule)
      .mockResolvedValueOnce(mockHighSeasonRule);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: getRepositoryToken(Place), useValue: { findOne: jest.fn().mockResolvedValue(mockPlace) } },
        { provide: getRepositoryToken(PricingRule), useValue: ruleRepo },
      ],
    }).compile();
    service = module.get(PricingService);

    const result = await service.calculate(PLACE_ID, '2025-05-31', '2025-06-02', 2);

    expect(result.nights).toBe(2);
    expect(result.total).toBe(900 + 2100);
    expect(result.breakdown[0].seasonLabel).toBe('Низкий сезон');
    expect(result.breakdown[1].seasonLabel).toBe('Высокий сезон');
  });

  it('getDates does not include checkOut day (nights = checkOut - checkIn)', async () => {
    const module: TestingModule = await buildModule(mockPlace, mockHighSeasonRule);
    service = module.get(PricingService);

    // 7 nights: July 1–8
    const result = await service.calculate(PLACE_ID, '2025-07-01', '2025-07-08', 2);
    expect(result.nights).toBe(7);
  });
});
