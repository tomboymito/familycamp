import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GoneException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { HoldsService } from '../holds/holds.service';
import { PricingService } from '../pricing/pricing.service';
import { CustomersService } from '../customers/customers.service';
import { Booking } from '../../database/entities/booking.entity';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLACE_ID = 'place-uuid-1';
const HOLD_TOKEN = 'hold_aabbccdd11223344';

const mockHold = {
  id: 'hold-uuid-1',
  placeId: PLACE_ID,
  sessionToken: HOLD_TOKEN,
  checkIn: '2025-07-01',
  checkOut: '2025-07-05',
  guestsCount: 2,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
};

const mockCustomer = {
  id: 'cust-uuid-1',
  name: 'Иван Петров',
  phone: '+79001234567',
};

const mockPricing = {
  nights: 4,
  pricePerNight: 2100,
  total: 8400,
  seasonLabel: 'Высокий сезон',
  breakdown: [],
};

const mockBooking = {
  id: 'booking-uuid-1',
  placeId: PLACE_ID,
  customerId: mockCustomer.id,
  checkIn: '2025-07-01',
  checkOut: '2025-07-05',
  guestsCount: 2,
  status: 'awaiting_payment',
  paymentStatus: 'unpaid',
  totalPrice: '8400',
  source: 'website',
  createdAt: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BookingsService.createFromHold', () => {
  let service: BookingsService;
  let bookingRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let holdsService: { findByToken: jest.Mock; deleteById: jest.Mock };

  async function buildModule(holdReturn: unknown) {
    bookingRepo = {
      create: jest.fn().mockReturnValue(mockBooking),
      save: jest.fn().mockResolvedValue(mockBooking),
      findOne: jest.fn().mockResolvedValue(mockBooking),
    };
    holdsService = {
      findByToken: jest.fn().mockResolvedValue(holdReturn),
      deleteById: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: HoldsService, useValue: holdsService },
        { provide: PricingService, useValue: { calculate: jest.fn().mockResolvedValue(mockPricing) } },
        { provide: CustomersService, useValue: { upsertByPhone: jest.fn().mockResolvedValue(mockCustomer) } },
      ],
    }).compile();

    service = module.get(BookingsService);
  }

  it('creates booking successfully from valid hold', async () => {
    await buildModule(mockHold);

    const result = await service.createFromHold({
      holdToken: HOLD_TOKEN,
      customer: { name: 'Иван Петров', phone: '+79001234567' },
    });

    expect(result).toBeDefined();
    expect(result.bookingId).toBe('booking-uuid-1');
    expect(holdsService.findByToken).toHaveBeenCalledWith(HOLD_TOKEN);
    expect(bookingRepo.save).toHaveBeenCalledTimes(1);
  });

  it('deletes hold after booking is created', async () => {
    await buildModule(mockHold);

    await service.createFromHold({
      holdToken: HOLD_TOKEN,
      customer: { name: 'Иван Петров', phone: '+79001234567' },
    });

    expect(holdsService.deleteById).toHaveBeenCalledWith(mockHold.id);
  });

  it('throws GoneException when hold is not found', async () => {
    await buildModule(null);
    // findByToken rejects → GoneException
    holdsService.findByToken.mockRejectedValue(new Error('Not found'));

    await expect(
      service.createFromHold({
        holdToken: 'invalid-token',
        customer: { name: 'Test', phone: '+7' },
      }),
    ).rejects.toThrow(GoneException);
  });

  it('booking has correct source "website" by default', async () => {
    await buildModule(mockHold);

    await service.createFromHold({
      holdToken: HOLD_TOKEN,
      customer: { name: 'Иван Петров', phone: '+79001234567' },
    });

    const createCall = bookingRepo.create.mock.calls[0][0];
    expect(createCall.source).toBe('website');
  });

  it('booking totalPrice matches pricing calculation', async () => {
    await buildModule(mockHold);

    await service.createFromHold({
      holdToken: HOLD_TOKEN,
      customer: { name: 'Иван Петров', phone: '+79001234567' },
    });

    const createCall = bookingRepo.create.mock.calls[0][0];
    expect(createCall.totalPrice).toBe(mockPricing.total.toString());
  });
});

describe('BookingsService.findPublic', () => {
  it('returns booking with limited fields', async () => {
    const bookingRepo = {
      findOne: jest.fn().mockResolvedValue(mockBooking),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: HoldsService, useValue: { findByToken: jest.fn(), deleteById: jest.fn() } },
        { provide: PricingService, useValue: { calculate: jest.fn() } },
        { provide: CustomersService, useValue: { upsertByPhone: jest.fn() } },
      ],
    }).compile();

    const service = module.get(BookingsService);
    const result = await service.findPublic('booking-uuid-1');

    expect(result).toBeDefined();
    expect(result.id).toBe('booking-uuid-1');
    expect(bookingRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'booking-uuid-1' } }),
    );
  });
});
