import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { Hold } from '../../database/entities/hold.entity';
import { Blocking } from '../../database/entities/blocking.entity';
import { Place } from '../../database/entities/place.entity';

export type SlotState = 'free' | 'booked' | 'blocked' | 'hold' | 'partial';

export interface PlaceAvailability {
  placeId: string;
  state: SlotState;
  bookingId?: string;
  bookingStart?: string;
  bookingEnd?: string;
  guestName?: string;
  source?: string;
  paymentStatus?: string;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Hold) private readonly holdRepo: Repository<Hold>,
    @InjectRepository(Blocking) private readonly blockingRepo: Repository<Blocking>,
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
  ) {}

  /**
   * Базовая проверка доступности для одного места в заданном диапазоне дат.
   * Возвращает 'free' | 'booked' | 'blocked' | 'hold'
   */
  async checkPlaceAvailability(
    placeId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<SlotState> {
    const [bookings, holds, blockings] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('b')
        .where('b.place_id = :placeId', { placeId })
        .andWhere('b.status IN (:...statuses)', { statuses: ['awaiting_payment', 'confirmed'] })
        .andWhere('NOT (b.check_out <= :checkIn OR b.check_in >= :checkOut)', { checkIn, checkOut })
        .getCount(),
      this.holdRepo
        .createQueryBuilder('h')
        .where('h.place_id = :placeId', { placeId })
        .andWhere('h.expires_at > NOW()')
        .andWhere('NOT (h.check_out <= :checkIn OR h.check_in >= :checkOut)', { checkIn, checkOut })
        .getCount(),
      this.blockingRepo
        .createQueryBuilder('bl')
        .where('bl.place_id = :placeId', { placeId })
        .andWhere('NOT (bl.date_to <= :checkIn OR bl.date_from >= :checkOut)', { checkIn, checkOut })
        .getCount(),
    ]);

    if (bookings > 0) return 'booked';
    if (blockings > 0) return 'blocked';
    if (holds > 0) return 'hold';
    return 'free';
  }

  /** GET /availability — все места на указанный диапазон дат */
  async getAvailability(checkIn: string, checkOut: string, typeId?: string, guests?: number) {
    const where: Record<string, unknown> = { isActive: true };
    if (typeId) where.typeId = typeId;

    const places = await this.placeRepo.find({
      where,
      relations: ['accommodationType'],
      order: { sortOrder: 'ASC' },
    });

    const results = await Promise.all(
      places
        .filter((p) => !guests || p.capacity >= guests)
        .map(async (place) => ({
          id: place.id,
          name: place.name,
          code: place.code,
          type: place.accommodationType,
          capacity: place.capacity,
          hasElectricity: place.hasElectricity,
          hasWater: place.hasWater,
          state: await this.checkPlaceAvailability(place.id, checkIn, checkOut),
        })),
    );
    return results;
  }

  /** GET /availability/:place_id — доступность конкретного места */
  async getPlaceAvailability(placeId: string, checkIn: string, checkOut: string) {
    const state = await this.checkPlaceAvailability(placeId, checkIn, checkOut);
    return { placeId, checkIn, checkOut, state };
  }

  /** GET /availability/calendar — данные для мини-карты на публичном сайте */
  async getCalendar(month: number, year: number, typeId?: string) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const where: Record<string, unknown> = { isActive: true };
    if (typeId) where.typeId = typeId;
    const places = await this.placeRepo.find({ where });

    // Формируем карту состояний по дням
    const days: Record<string, SlotState[]> = {};
    for (let d = 1; d <= lastDay; d++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const nextDate = d < lastDay
        ? `${year}-${String(month).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const states = await Promise.all(
        places.map((p) => this.checkPlaceAvailability(p.id, date, nextDate)),
      );
      days[date] = states;
    }

    return {
      period: { from, to },
      calendar: Object.entries(days).map(([date, states]) => ({
        date,
        totalPlaces: places.length,
        freePlaces: states.filter((s) => s === 'free').length,
        hasAvailable: states.some((s) => s === 'free'),
      })),
    };
  }
}
