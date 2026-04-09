import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { Blocking } from '../../database/entities/blocking.entity';
import { Hold } from '../../database/entities/hold.entity';
import { Place } from '../../database/entities/place.entity';

type CellState = 'free' | 'booked' | 'blocked' | 'hold' | 'awaiting_payment';

interface ChessSlot {
  date: string;
  state: CellState;
  bookingId?: string;
  bookingStart?: string;
  bookingEnd?: string;
  checkInTime?: string;
  checkOutTime?: string;
  guestName?: string;
  source?: string;
  paymentStatus?: string;
  reason?: string;
}

interface ChessPlace {
  id: string;
  name: string;
  code: string;
  type: string;
  typeId: string;
  housekeepingStatus: string;
  slots: ChessSlot[];
}

@Injectable()
export class ChessBoardService {
  constructor(
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Blocking) private readonly blockingRepo: Repository<Blocking>,
    @InjectRepository(Hold) private readonly holdRepo: Repository<Hold>,
  ) {}

  async getBoard(from: string, to: string, typeId?: string) {
    const places = await this.placeRepo.find({
      where: typeId ? { typeId } : {},
      relations: ['accommodationType'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    const [bookings, blockings, holds] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.customer', 'c')
        .where('b.status IN (:...statuses)', { statuses: ['awaiting_payment', 'confirmed'] })
        .andWhere('NOT (b.check_out < :from OR b.check_in >= :to)', { from, to })
        .getMany(),
      this.blockingRepo
        .createQueryBuilder('bl')
        .where('NOT (bl.date_to < :from OR bl.date_from >= :to)', { from, to })
        .getMany(),
      this.holdRepo
        .createQueryBuilder('h')
        .where('h.expires_at > NOW()')
        .andWhere('NOT (h.check_out < :from OR h.check_in >= :to)', { from, to })
        .getMany(),
    ]);

    const dates = this.getDates(from, to);

    const result: ChessPlace[] = places.map((place) => {
      const slots: ChessSlot[] = dates.map((date) => {
        const nextDate = this.addDay(date);

        // Include checkout date: guest vacates by checkOutTime that day
        const booking = bookings.find(
          (b) =>
            b.placeId === place.id &&
            b.checkIn < nextDate &&
            b.checkOut >= date,
        );

        if (booking) {
          const state: CellState = booking.status === 'confirmed' ? 'booked' : 'awaiting_payment';
          return {
            date,
            state,
            bookingId: booking.id,
            bookingStart: booking.checkIn,
            bookingEnd: booking.checkOut,
            checkInTime: (booking as any).checkInTime ?? '12:00',
            checkOutTime: (booking as any).checkOutTime ?? '14:00',
            guestName: booking.customer
              ? `${booking.customer.name.split(' ')[0]} ${booking.customer.name.split(' ')[1]?.charAt(0) ?? ''}.`.trim()
              : undefined,
            source: booking.source ?? undefined,
            paymentStatus: booking.paymentStatus,
          };
        }

        const blocking = blockings.find(
          (bl) => bl.placeId === place.id && bl.dateFrom < nextDate && bl.dateTo >= date,
        );
        if (blocking) {
          return { date, state: 'blocked' as CellState, reason: blocking.reason ?? undefined };
        }

        const hold = holds.find(
          (h) => h.placeId === place.id && h.checkIn < nextDate && h.checkOut >= date,
        );
        if (hold) {
          return { date, state: 'hold' as CellState };
        }

        return { date, state: 'free' as CellState };
      });

      return {
        id: place.id,
        name: place.name,
        code: place.code,
        type: place.accommodationType?.slug ?? '',
        typeId: place.typeId,
        housekeepingStatus: place.housekeepingStatus ?? 'unknown',
        slots,
      };
    });

    return { period: { from, to }, places: result };
  }

  private getDates(from: string, to: string): string[] {
    const dates: string[] = [];
    const current = new Date(from);
    const end = new Date(to);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  private addDay(date: string): string {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
}
