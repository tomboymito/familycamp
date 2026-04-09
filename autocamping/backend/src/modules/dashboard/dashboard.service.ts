import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { Place } from '../../database/entities/place.entity';

function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Place)   private readonly placeRepo: Repository<Place>,
  ) {}

  async getSummary() {
    const today    = localDate(0);
    const tomorrow = localDate(1);
    const monthStart = today.slice(0, 8) + '01';

    const activeStatuses = ['confirmed', 'awaiting_payment'];

    const [
      checkInsToday,
      checkOutsToday,
      checkInsTomorrow,
      checkOutsTomorrow,
      activeToday,
      monthPaid,
      weekPaid,
      unpaidConfirmed,
      allPlaces,
    ] = await Promise.all([
      // Заезды сегодня
      this.bookingRepo.find({
        where: { checkIn: today, status: In(activeStatuses) },
        relations: ['customer', 'place'],
        order: { checkIn: 'ASC' },
      }),
      // Выезды сегодня
      this.bookingRepo.find({
        where: { checkOut: today, status: In(activeStatuses) },
        relations: ['customer', 'place'],
        order: { checkOut: 'ASC' },
      }),
      // Заезды завтра
      this.bookingRepo.find({
        where: { checkIn: tomorrow, status: In(activeStatuses) },
        relations: ['customer', 'place'],
      }),
      // Выезды завтра
      this.bookingRepo.find({
        where: { checkOut: tomorrow, status: In(activeStatuses) },
        relations: ['customer', 'place'],
      }),
      // Активные брони сегодня (для % загрузки)
      this.bookingRepo
        .createQueryBuilder('b')
        .where('b.status IN (:...s)', { s: activeStatuses })
        .andWhere('b.check_in <= :today', { today })
        .andWhere('b.check_out >= :today', { today })
        .getCount(),
      // Выручка за месяц (оплаченные)
      this.bookingRepo
        .createQueryBuilder('b')
        .select('COALESCE(SUM(b.total_price), 0)', 'total')
        .where('b.status = :s', { s: 'confirmed' })
        .andWhere('b.payment_status = :ps', { ps: 'paid' })
        .andWhere('b.check_in >= :monthStart', { monthStart })
        .getRawOne<{ total: string }>(),
      // Выручка за 7 дней
      this.bookingRepo
        .createQueryBuilder('b')
        .select('COALESCE(SUM(b.total_price), 0)', 'total')
        .where('b.status = :s', { s: 'confirmed' })
        .andWhere('b.payment_status = :ps', { ps: 'paid' })
        .andWhere('b.check_in >= :weekStart', { weekStart: localDate(-7) })
        .getRawOne<{ total: string }>(),
      // Подтверждённые но неоплаченные
      this.bookingRepo.count({
        where: { status: 'confirmed', paymentStatus: In(['not_paid', 'unpaid']) },
      }),
      // Все места (для % загрузки и статуса уборки)
      this.placeRepo.find({ where: { isActive: true } }),
    ]);

    // Конфликты овербукинга — брони с пересечением дат
    const conflictBookings = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.place', 'p')
      .innerJoinAndSelect('b.customer', 'c')
      .where('b.status NOT IN (:...s)', { s: ['cancelled', 'expired', 'draft'] })
      .andWhere(`EXISTS (
        SELECT 1 FROM bookings b2
        WHERE b2.place_id = b.place_id
          AND b2.id != b.id
          AND b2.status NOT IN ('cancelled','expired','draft')
          AND b2.check_in < b.check_out
          AND b2.check_out > b.check_in
      )`)
      .orderBy('b.check_in', 'ASC')
      .getMany();

    const totalPlaces = allPlaces.length;
    const occupancyPct = totalPlaces > 0 ? Math.round((activeToday / totalPlaces) * 100) : 0;
    const dirtyPlaces = allPlaces.filter((p) => p.housekeepingStatus === 'dirty');

    const mapBooking = (b: Booking) => ({
      id: b.id,
      guestName: b.customer?.name ?? '—',
      guestPhone: b.customer?.phone ?? '',
      placeName: b.place?.name ?? '—',
      placeCode: b.place?.code ?? '—',
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      checkInTime: (b as any).checkInTime ?? '12:00',
      checkOutTime: (b as any).checkOutTime ?? '14:00',
      guestsCount: b.guestsCount,
      paymentStatus: b.paymentStatus,
      totalPrice: b.totalPrice,
      source: b.source,
    });

    return {
      today,
      tomorrow,
      occupancy: { active: activeToday, total: totalPlaces, pct: occupancyPct },
      revenue: {
        month: parseFloat(monthPaid?.total ?? '0'),
        week:  parseFloat(weekPaid?.total  ?? '0'),
      },
      attention: {
        unpaidConfirmed,
        dirtyPlaces: dirtyPlaces.map((p) => ({ id: p.id, code: p.code, name: p.name })),
        conflicts: conflictBookings.map(b => ({
          id: b.id,
          placeCode: b.place?.code ?? '—',
          guestName: b.customer?.name ?? '—',
          checkIn: b.checkIn,
          checkOut: b.checkOut,
        })),
      },
      checkInsToday:    checkInsToday.map(mapBooking),
      checkOutsToday:   checkOutsToday.map(mapBooking),
      checkInsTomorrow: checkInsTomorrow.map(mapBooking),
      checkOutsTomorrow:checkOutsTomorrow.map(mapBooking),
    };
  }
}
