import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as xml2js from 'xml2js';
import { Booking } from '../../database/entities/booking.entity';
import { WebhookLog } from '../../database/entities/webhook-log.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Place } from '../../database/entities/place.entity';

export interface OtaBookingInput {
  source: string;               // 'booking.com' | 'avito' | 'generic'
  externalId?: string;          // external reservation ID
  placeCode: string;            // our place code to match
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  checkIn: string;              // YYYY-MM-DD
  checkOut: string;             // YYYY-MM-DD
  guestsCount?: number;
  totalPrice?: number;
  currency?: string;
  notes?: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Booking)    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(WebhookLog) private readonly logRepo: Repository<WebhookLog>,
    @InjectRepository(Customer)   private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Place)      private readonly placeRepo: Repository<Place>,
  ) {}

  // ── Public entrypoints ──────────────────────────────────────────────────────

  async handleGeneric(body: OtaBookingInput, raw: string): Promise<WebhookLog> {
    return this.process(body, raw);
  }

  async handleBookingCom(xmlBody: string): Promise<WebhookLog> {
    const log = this.logRepo.create({ source: 'booking.com', rawPayload: xmlBody.slice(0, 4000), status: 'pending' });
    try {
      const parsed = await xml2js.parseStringPromise(xmlBody, { explicitArray: false }) as Record<string, unknown>;
      const input = this.parseBookingComXml(parsed);
      return this.process(input, xmlBody, log);
    } catch (e: unknown) {
      log.status = 'error';
      log.error = e instanceof Error ? e.message : String(e);
      return this.logRepo.save(log);
    }
  }

  async handleAvito(body: Record<string, unknown>, raw: string): Promise<WebhookLog> {
    const log = this.logRepo.create({ source: 'avito', rawPayload: raw.slice(0, 4000), status: 'pending' });
    try {
      const input = this.parseAvitoPayload(body);
      return this.process(input, raw, log);
    } catch (e: unknown) {
      log.status = 'error';
      log.error = e instanceof Error ? e.message : String(e);
      return this.logRepo.save(log);
    }
  }

  // ── Conflict check ──────────────────────────────────────────────────────────

  async checkConflict(placeId: string, checkIn: string, checkOut: string, excludeBookingId?: string): Promise<Booking[]> {
    const qb = this.bookingRepo.createQueryBuilder('b')
      .where('b.place_id = :placeId', { placeId })
      .andWhere('b.status NOT IN (:...statuses)', { statuses: ['cancelled', 'expired', 'draft'] })
      .andWhere('b.check_in < :checkOut', { checkOut })
      .andWhere('b.check_out > :checkIn', { checkIn });

    if (excludeBookingId) {
      qb.andWhere('b.id != :excl', { excl: excludeBookingId });
    }
    return qb.getMany();
  }

  // ── Logs ────────────────────────────────────────────────────────────────────

  async listLogs(page = 1, limit = 50) {
    const [items, total] = await this.logRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // ── Core processing ─────────────────────────────────────────────────────────

  private async process(input: OtaBookingInput, raw: string, existingLog?: WebhookLog): Promise<WebhookLog> {
    const log = existingLog ?? this.logRepo.create({
      source: input.source,
      rawPayload: raw.slice(0, 4000),
      status: 'pending',
    });

    try {
      // Match place by code
      const place = await this.placeRepo.findOne({ where: { code: input.placeCode } });
      if (!place) {
        log.status = 'error';
        log.error = `Place not found: ${input.placeCode}`;
        return this.logRepo.save(log);
      }

      // Duplicate check: same external source + dates + place
      const duplicate = await this.bookingRepo.findOne({
        where: { place: { id: place.id }, checkIn: input.checkIn, checkOut: input.checkOut, source: input.source },
      });
      if (duplicate) {
        log.status = 'duplicate';
        log.bookingId = duplicate.id;
        this.logger.warn(`Duplicate webhook booking: ${duplicate.id}`);
        return this.logRepo.save(log);
      }

      // Conflict check
      const conflicts = await this.checkConflict(place.id, input.checkIn, input.checkOut);

      // Upsert customer
      let customer: Customer | null = null;
      if (input.guestPhone) {
        customer = await this.customerRepo.findOne({ where: { phone: input.guestPhone } });
        if (!customer) {
          customer = await this.customerRepo.save(this.customerRepo.create({
            name:  input.guestName,
            phone: input.guestPhone,
            email: input.guestEmail,
          }));
        }
      }

      // Create booking
      const booking = await this.bookingRepo.save(this.bookingRepo.create({
        place:         { id: place.id },
        customer:      customer ? { id: customer.id } : undefined,
        checkIn:       input.checkIn,
        checkOut:      input.checkOut,
        checkInTime:   '14:00',
        checkOutTime:  '12:00',
        guestsCount:   input.guestsCount ?? 1,
        totalPrice:    input.totalPrice ? String(input.totalPrice) : null,
        source:        input.source,
        status:        conflicts.length > 0 ? 'conflict' as unknown as Booking['status'] : 'confirmed',
        paymentStatus: 'paid',
        adminNote:     [
          input.notes,
          input.externalId ? `External ID: ${input.externalId}` : '',
          conflicts.length > 0 ? `⚠️ КОНФЛИКТ с: ${conflicts.map(c => c.id.slice(0,8)).join(', ')}` : '',
        ].filter(Boolean).join('\n'),
      }));

      log.status   = conflicts.length > 0 ? 'conflict' : 'ok';
      log.bookingId = booking.id;
      if (conflicts.length > 0) {
        log.error = `Конфликт с ${conflicts.length} бронью(ями): ${conflicts.map(c => c.id.slice(0,8)).join(', ')}`;
        this.logger.error(`OTA overbooking conflict for place ${place.code}: ${log.error}`);
      }
    } catch (e: unknown) {
      log.status = 'error';
      log.error = e instanceof Error ? e.message : String(e);
      this.logger.error(`Webhook processing error: ${log.error}`);
    }

    return this.logRepo.save(log);
  }

  // ── Parsers ─────────────────────────────────────────────────────────────────

  private parseBookingComXml(parsed: Record<string, unknown>): OtaBookingInput {
    // Booking.com OTA_HotelResNotifRQ format (simplified)
    const root = (parsed['OTA_HotelResNotifRQ'] as Record<string, unknown>)
               ?? (parsed['HotelReservations'] as Record<string, unknown>)
               ?? parsed;
    const res  = this.dig(root, 'HotelReservations', 'HotelReservation') as Record<string, unknown> ?? root;
    const guest = this.dig(res, 'ResGuests', 'ResGuest', 'Profiles', 'ProfileInfo', 'Profile', 'Customer') as Record<string, unknown> ?? {};
    const stay  = this.dig(res, 'RoomStays', 'RoomStay', 'TimeSpan') as Record<string, unknown>
               ?? this.dig(res, 'TimeSpan') as Record<string, unknown> ?? {};
    const room  = this.dig(res, 'RoomStays', 'RoomStay', 'RoomTypes', 'RoomType') as Record<string, unknown> ?? {};
    const total = this.dig(res, 'RoomStays', 'RoomStay', 'Total') as Record<string, unknown> ?? {};

    const attrs   = (stay as { '$'?: Record<string, string> })['$'] ?? stay as Record<string, string>;
    const nameEl  = this.dig(guest, 'PersonName') as Record<string, unknown> ?? {};
    const phoneEl = this.dig(guest, 'Telephone') as Record<string, unknown>;
    const emailEl = this.dig(guest, 'Email') as Record<string, unknown>;

    return {
      source:      'booking.com',
      externalId:  String((res as Record<string, string>)['ResID_Value'] ?? ''),
      placeCode:   String((room as Record<string, string>)['RoomTypeCode'] ?? 'UNKNOWN'),
      guestName:   [
        (nameEl as Record<string, string>)['GivenName'],
        (nameEl as Record<string, string>)['Surname'],
      ].filter(Boolean).join(' ') || 'Гость',
      guestPhone:  (phoneEl as Record<string, string>)?.['PhoneNumber'],
      guestEmail:  String(emailEl ?? ''),
      checkIn:     String(attrs['Start'] ?? attrs['start'] ?? ''),
      checkOut:    String(attrs['End']   ?? attrs['end']   ?? ''),
      totalPrice:  parseFloat(String((total as Record<string, string>)?.['AmountAfterTax'] ?? '0')) || undefined,
    };
  }

  private parseAvitoPayload(body: Record<string, unknown>): OtaBookingInput {
    // Авито Путешествия webhook format
    const reservation = (body['reservation'] as Record<string, unknown>) ?? body;
    const guest       = (reservation['guest'] as Record<string, unknown>)
                      ?? (body['guest'] as Record<string, unknown>) ?? {};
    return {
      source:      'avito',
      externalId:  String(reservation['id'] ?? body['id'] ?? ''),
      placeCode:   String(reservation['property_code'] ?? reservation['unit_id'] ?? 'UNKNOWN'),
      guestName:   String(guest['name'] ?? guest['full_name'] ?? 'Гость'),
      guestPhone:  guest['phone'] ? String(guest['phone']) : undefined,
      guestEmail:  guest['email'] ? String(guest['email']) : undefined,
      checkIn:     String(reservation['check_in']  ?? reservation['arrival']   ?? ''),
      checkOut:    String(reservation['check_out'] ?? reservation['departure'] ?? ''),
      guestsCount: parseInt(String(reservation['guests_count'] ?? reservation['guests'] ?? '1'), 10),
      totalPrice:  parseFloat(String(reservation['total_price'] ?? reservation['price'] ?? '0')) || undefined,
      notes:       reservation['notes'] ? String(reservation['notes']) : undefined,
    };
  }

  private dig(obj: unknown, ...keys: string[]): unknown {
    let cur = obj;
    for (const k of keys) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[k];
    }
    return cur;
  }
}
