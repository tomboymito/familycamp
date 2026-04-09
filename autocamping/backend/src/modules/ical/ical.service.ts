import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodeIcal from 'node-ical';
import { Booking } from '../../database/entities/booking.entity';
import { Blocking } from '../../database/entities/blocking.entity';
import { Place } from '../../database/entities/place.entity';

function pad(n: number) { return String(n).padStart(2, '0'); }
function localStr(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
}
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function escapeIcal(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

@Injectable()
export class IcalService {
  constructor(
    @InjectRepository(Booking)  private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Blocking) private readonly blockingRepo: Repository<Blocking>,
    @InjectRepository(Place)    private readonly placeRepo: Repository<Place>,
  ) {}

  /** Generate .ics feed for a single place */
  async exportPlace(placeId: string): Promise<string> {
    const place = await this.placeRepo.findOne({ where: { id: placeId } });
    if (!place) throw new BadRequestException('Place not found');

    const bookings = await this.bookingRepo.find({
      where: { place: { id: placeId }, status: 'confirmed' },
      relations: ['customer'],
      order: { checkIn: 'ASC' },
    });

    const blockings = await this.blockingRepo.find({
      where: { place: { id: placeId } },
      order: { dateFrom: 'ASC' },
    });

    const now = new Date();
    const ts  = `${localStr(now)}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`;

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FamCamp//Booking System//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcal(place.name)} (${place.code})`,
      'X-WR-TIMEZONE:Europe/Moscow',
    ];

    for (const b of bookings) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:booking-${b.id}@famcamp`);
      lines.push(`DTSTAMP:${ts}`);
      lines.push(`DTSTART;VALUE=DATE:${b.checkIn.replace(/-/g, '')}`);
      // iCal DTEND for all-day events is exclusive (checkout day)
      lines.push(`DTEND;VALUE=DATE:${b.checkOut.replace(/-/g, '')}`);
      lines.push(`SUMMARY:${escapeIcal(b.customer?.name ?? 'Гость')} (${b.guestsCount} чел.)`);
      lines.push(`DESCRIPTION:${escapeIcal(`Бронь #${b.id.slice(0,8)} | ${b.source ?? ''} | ${b.paymentStatus}`)}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    for (const bl of blockings) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:blocking-${bl.id}@famcamp`);
      lines.push(`DTSTAMP:${ts}`);
      lines.push(`DTSTART;VALUE=DATE:${bl.dateFrom.replace(/-/g, '')}`);
      // blocking dateTo is inclusive, iCal end is exclusive — add 1 day
      const endDate = new Date(bl.dateTo);
      endDate.setDate(endDate.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${localStr(endDate)}`);
      lines.push(`SUMMARY:BLOCKED${bl.reason ? ': ' + escapeIcal(bl.reason) : ''}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /** Import external .ics URL → create blockings for a place */
  async importFromUrl(placeId: string, url: string): Promise<{ created: number; skipped: number }> {
    const place = await this.placeRepo.findOne({ where: { id: placeId } });
    if (!place) throw new BadRequestException('Place not found');

    let events: nodeIcal.CalendarResponse;
    try {
      events = await nodeIcal.fromURL(url);
    } catch {
      throw new BadRequestException('Не удалось загрузить iCal — проверьте URL');
    }

    let created = 0;
    let skipped = 0;

    for (const key of Object.keys(events)) {
      const raw = events[key];
      if (!raw || raw.type !== 'VEVENT') continue;
      const ev = raw as nodeIcal.VEvent;
      if (!ev.start || !ev.end) continue;

      const dateFrom = localDateStr(new Date(ev.start));
      // iCal all-day end is exclusive — subtract 1 day
      const endRaw = new Date(ev.end);
      endRaw.setDate(endRaw.getDate() - 1);
      const dateTo = localDateStr(endRaw);

      if (dateFrom === dateTo) {
        skipped++;
        continue; // zero-length event
      }

      // Skip if a blocking with same place+dates already exists
      const exists = await this.blockingRepo.findOne({
        where: { place: { id: placeId }, dateFrom, dateTo },
      });
      if (exists) { skipped++; continue; }

      const reason = (ev as { summary?: string }).summary
        ? String((ev as { summary?: string }).summary)
        : 'Импорт iCal';
      await this.blockingRepo.save(
        this.blockingRepo.create({ place: { id: placeId }, dateFrom, dateTo, reason }),
      );
      created++;
    }

    return { created, skipped };
  }
}
