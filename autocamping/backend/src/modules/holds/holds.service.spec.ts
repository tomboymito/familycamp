import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, GoneException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HoldsService } from './holds.service';
import { AvailabilityService } from '../availability/availability.service';
import { Hold } from '../../database/entities/hold.entity';

// ─── Shared mocks ─────────────────────────────────────────────────────────────

const PLACE_ID = 'place-uuid-1';
const HOLD_TOKEN = 'hold_aabbccdd11223344';

function mockHold(overrides: Partial<Hold> = {}): Hold {
  return {
    id: 'hold-uuid-1',
    placeId: PLACE_ID,
    sessionToken: HOLD_TOKEN,
    checkIn: '2025-07-01',
    checkOut: '2025-07-05',
    guestsCount: 2,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min in future
    createdAt: new Date(),
    ...overrides,
  } as Hold;
}

function buildModule(
  availabilityState: string,
  existingHold: Hold | null = null,
  txQueryResult: unknown[] = [{ id: PLACE_ID }],
) {
  const savedHold = mockHold();

  // Manager mock returned by dataSource.transaction
  const managerMock = {
    query: jest.fn().mockResolvedValue(txQueryResult),
    getRepository: jest.fn().mockReturnValue({
      create: jest.fn().mockReturnValue(savedHold),
      save: jest.fn().mockResolvedValue(savedHold),
    }),
  };

  const dataSourceMock = {
    transaction: jest.fn().mockImplementation((cb: (m: typeof managerMock) => Promise<unknown>) =>
      cb(managerMock),
    ),
  };

  return Test.createTestingModule({
    providers: [
      HoldsService,
      {
        provide: getRepositoryToken(Hold),
        useValue: {
          findOne: jest.fn().mockResolvedValue(existingHold),
          delete: jest.fn().mockResolvedValue({ affected: 1 }),
          find: jest.fn().mockResolvedValue([]),
          save: jest.fn(),
        },
      },
      {
        provide: AvailabilityService,
        useValue: {
          checkPlaceAvailability: jest.fn().mockResolvedValue(availabilityState),
        },
      },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue(15) },
      },
      {
        provide: DataSource,
        useValue: dataSourceMock,
      },
    ],
  }).compile();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HoldsService.create', () => {
  it('creates a hold when place is free', async () => {
    const module: TestingModule = await buildModule('free');
    const service = module.get(HoldsService);

    const result = await service.create({
      placeId: PLACE_ID,
      checkIn: '2025-07-01',
      checkOut: '2025-07-05',
      guestsCount: 2,
    });

    expect(result).toBeDefined();
    expect(result.placeId).toBe(PLACE_ID);
    expect(result.sessionToken).toMatch(/^hold_/);
  });

  it('throws ConflictException when place is booked', async () => {
    const module: TestingModule = await buildModule('booked');
    const service = module.get(HoldsService);

    await expect(
      service.create({ placeId: PLACE_ID, checkIn: '2025-07-01', checkOut: '2025-07-05', guestsCount: 2 }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException when place is on hold', async () => {
    const module: TestingModule = await buildModule('hold');
    const service = module.get(HoldsService);

    await expect(
      service.create({ placeId: PLACE_ID, checkIn: '2025-07-01', checkOut: '2025-07-05', guestsCount: 2 }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException when place is blocked', async () => {
    const module: TestingModule = await buildModule('blocked');
    const service = module.get(HoldsService);

    await expect(
      service.create({ placeId: PLACE_ID, checkIn: '2025-07-01', checkOut: '2025-07-05', guestsCount: 2 }),
    ).rejects.toThrow(ConflictException);
  });

  it('executes SELECT FOR UPDATE within transaction', async () => {
    const savedHold = mockHold();
    const managerMock = {
      query: jest.fn().mockResolvedValue([{ id: PLACE_ID }]),
      getRepository: jest.fn().mockReturnValue({
        create: jest.fn().mockReturnValue(savedHold),
        save: jest.fn().mockResolvedValue(savedHold),
      }),
    };
    const dataSourceMock = {
      transaction: jest.fn().mockImplementation((cb: (m: typeof managerMock) => Promise<unknown>) =>
        cb(managerMock),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoldsService,
        { provide: getRepositoryToken(Hold), useValue: { findOne: jest.fn(), delete: jest.fn() } },
        { provide: AvailabilityService, useValue: { checkPlaceAvailability: jest.fn().mockResolvedValue('free') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(15) } },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    await module.get(HoldsService).create({ placeId: PLACE_ID, checkIn: '2025-07-01', checkOut: '2025-07-02', guestsCount: 1 });

    expect(managerMock.query).toHaveBeenCalledWith(
      'SELECT id FROM places WHERE id = $1 FOR UPDATE',
      [PLACE_ID],
    );
  });
});

describe('HoldsService.findByToken', () => {
  it('returns hold when token is valid and not expired', async () => {
    const hold = mockHold();
    const module: TestingModule = await buildModule('free', hold);
    const service = module.get(HoldsService);

    const result = await service.findByToken(HOLD_TOKEN);
    expect(result.sessionToken).toBe(HOLD_TOKEN);
  });

  it('throws NotFoundException when token does not exist', async () => {
    const module: TestingModule = await buildModule('free', null);
    const service = module.get(HoldsService);

    await expect(service.findByToken('invalid-token')).rejects.toThrow(NotFoundException);
  });

  it('throws GoneException when hold is expired', async () => {
    const expiredHold = mockHold({ expiresAt: new Date(Date.now() - 1000) }); // 1s ago
    const module: TestingModule = await buildModule('free', expiredHold);
    const service = module.get(HoldsService);

    await expect(service.findByToken(HOLD_TOKEN)).rejects.toThrow(GoneException);
  });
});

describe('HoldsService.cleanupExpiredHolds', () => {
  it('deletes all holds with expiresAt in the past', async () => {
    const deleteHoldMock = jest.fn().mockResolvedValue({ affected: 3 });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoldsService,
        { provide: getRepositoryToken(Hold), useValue: { delete: deleteHoldMock, findOne: jest.fn() } },
        { provide: AvailabilityService, useValue: { checkPlaceAvailability: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(15) } },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
      ],
    }).compile();

    const service = module.get(HoldsService);
    await service.cleanupExpiredHolds();

    expect(deleteHoldMock).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: expect.anything() }),
    );
  });
});
