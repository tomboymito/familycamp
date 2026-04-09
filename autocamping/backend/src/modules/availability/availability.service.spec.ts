import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AvailabilityService } from './availability.service';
import { Booking } from '../../database/entities/booking.entity';
import { Hold } from '../../database/entities/hold.entity';
import { Blocking } from '../../database/entities/blocking.entity';
import { Place } from '../../database/entities/place.entity';

// ─── Query builder factory ────────────────────────────────────────────────────

function makeQb(count: number) {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
  };
  return qb;
}

function makeRepo(count: number) {
  return {
    createQueryBuilder: jest.fn().mockReturnValue(makeQb(count)),
    find: jest.fn(),
    findOne: jest.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AvailabilityService.checkPlaceAvailability', () => {
  let service: AvailabilityService;

  const placeId = 'place-uuid-1';
  const checkIn = '2025-07-01';
  const checkOut = '2025-07-05';

  async function buildService(bookingCount: number, holdCount: number, blockingCount: number) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: getRepositoryToken(Booking), useValue: makeRepo(bookingCount) },
        { provide: getRepositoryToken(Hold), useValue: makeRepo(holdCount) },
        { provide: getRepositoryToken(Blocking), useValue: makeRepo(blockingCount) },
        { provide: getRepositoryToken(Place), useValue: makeRepo(0) },
      ],
    }).compile();
    return module.get(AvailabilityService);
  }

  it('returns "free" when no bookings, holds, or blockings', async () => {
    service = await buildService(0, 0, 0);
    const result = await service.checkPlaceAvailability(placeId, checkIn, checkOut);
    expect(result).toBe('free');
  });

  it('returns "booked" when active booking exists', async () => {
    service = await buildService(1, 0, 0);
    const result = await service.checkPlaceAvailability(placeId, checkIn, checkOut);
    expect(result).toBe('booked');
  });

  it('returns "blocked" when blocking exists (and no booking)', async () => {
    service = await buildService(0, 0, 1);
    const result = await service.checkPlaceAvailability(placeId, checkIn, checkOut);
    expect(result).toBe('blocked');
  });

  it('returns "hold" when active hold exists (and no booking/blocking)', async () => {
    service = await buildService(0, 1, 0);
    const result = await service.checkPlaceAvailability(placeId, checkIn, checkOut);
    expect(result).toBe('hold');
  });

  it('booking takes priority over hold and blocking', async () => {
    service = await buildService(1, 1, 1);
    const result = await service.checkPlaceAvailability(placeId, checkIn, checkOut);
    expect(result).toBe('booked');
  });

  it('blocking takes priority over hold', async () => {
    service = await buildService(0, 1, 1);
    const result = await service.checkPlaceAvailability(placeId, checkIn, checkOut);
    expect(result).toBe('blocked');
  });

  it('calls query builder with correct place_id filter', async () => {
    const bookingRepo = makeRepo(0);
    const holdRepo = makeRepo(0);
    const blockingRepo = makeRepo(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(Hold), useValue: holdRepo },
        { provide: getRepositoryToken(Blocking), useValue: blockingRepo },
        { provide: getRepositoryToken(Place), useValue: makeRepo(0) },
      ],
    }).compile();

    service = module.get(AvailabilityService);
    await service.checkPlaceAvailability(placeId, checkIn, checkOut);

    expect(bookingRepo.createQueryBuilder).toHaveBeenCalledWith('b');
    expect(holdRepo.createQueryBuilder).toHaveBeenCalledWith('h');
    expect(blockingRepo.createQueryBuilder).toHaveBeenCalledWith('bl');
  });
});

describe('AvailabilityService.getAvailability', () => {
  it('filters places by capacity when guests param provided', async () => {
    const places = [
      { id: 'p1', capacity: 2, typeId: 't1', isActive: true, sortOrder: 1, accommodationType: { slug: 'tent' } },
      { id: 'p2', capacity: 6, typeId: 't1', isActive: true, sortOrder: 2, accommodationType: { slug: 'cabin' } },
    ];
    const placeRepo = { find: jest.fn().mockResolvedValue(places), createQueryBuilder: jest.fn().mockReturnValue(makeQb(0)) };
    const bookingRepo = makeRepo(0);
    const holdRepo = makeRepo(0);
    const blockingRepo = makeRepo(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(Hold), useValue: holdRepo },
        { provide: getRepositoryToken(Blocking), useValue: blockingRepo },
        { provide: getRepositoryToken(Place), useValue: placeRepo },
      ],
    }).compile();

    const service = module.get(AvailabilityService);
    const result = await service.getAvailability('2025-07-01', '2025-07-05', undefined, 4);

    // Only the cabin (capacity 6) should remain after filtering for 4 guests
    expect(result).toHaveLength(1);
    expect(result[0].placeId).toBe('p2');
  });
});
