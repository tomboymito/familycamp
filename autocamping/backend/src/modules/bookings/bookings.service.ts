import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Booking } from '../../database/entities/booking.entity';
import { HoldsService } from '../holds/holds.service';
import { PricingService } from '../pricing/pricing.service';
import { CustomersService } from '../customers/customers.service';

export class CustomerInputDto {
  @IsString() name: string;
  @IsString() phone: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() carNumber?: string;
}

export class CreateBookingDto {
  @IsString() holdToken: string;
  @ValidateNested() @Type(() => CustomerInputDto) customer: CustomerInputDto;
  @IsString() @IsOptional() comment?: string;
}

export class CreateAdminBookingDto {
  @IsUUID() placeId: string;
  @IsString() checkIn: string;
  @IsString() checkOut: string;
  @IsString() @IsOptional() checkInTime?: string;
  @IsString() @IsOptional() checkOutTime?: string;
  @IsInt() @Min(1) guestsCount: number;
  @ValidateNested() @Type(() => CustomerInputDto) customer: CustomerInputDto;
  @IsString() @IsOptional() source?: string;
  @IsString() @IsOptional() adminNote?: string;
  @IsString() @IsOptional() paymentStatus?: string;
}

export class UpdateBookingDto {
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() paymentStatus?: string;
  @IsString() @IsOptional() adminNote?: string;
  @IsString() @IsOptional() checkIn?: string;
  @IsString() @IsOptional() checkOut?: string;
  @IsInt() @Min(1) @IsOptional() guestsCount?: number;
  @IsString() @IsOptional() totalPrice?: string;
  @IsUUID() @IsOptional() placeId?: string;
}

export class ListBookingsQuery {
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() source?: string;
  @IsString() @IsOptional() placeId?: string;
  @IsString() @IsOptional() q?: string;
  @IsInt() @IsOptional() page?: number;
  @IsInt() @IsOptional() limit?: number;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly repo: Repository<Booking>,
    private readonly holdsService: HoldsService,
    private readonly pricingService: PricingService,
    private readonly customersService: CustomersService,
  ) {}

  /** Публичный сценарий: создать бронь из холда */
  async createFromHold(dto: CreateBookingDto) {
    const hold = await this.holdsService
      .findByToken(dto.holdToken)
      .catch(() => {
        throw new GoneException('Hold expired or not found');
      });

    const customer = await this.customersService.upsertByPhone({
      name: dto.customer.name,
      phone: dto.customer.phone,
      email: dto.customer.email,
      carNumber: dto.customer.carNumber,
    });

    const price = await this.pricingService.calculate(
      hold.placeId,
      hold.checkIn,
      hold.checkOut,
      hold.guestsCount,
    );

    const booking = this.repo.create({
      placeId: hold.placeId,
      customerId: customer.id,
      checkIn: hold.checkIn,
      checkOut: hold.checkOut,
      guestsCount: hold.guestsCount,
      source: 'website',
      status: 'awaiting_payment',
      paymentStatus: 'not_paid',
      totalPrice: String(price.total),
      customerNote: dto.comment ?? null,
      crmSyncStatus: 'pending',
    });

    const saved = await this.repo.save(booking);
    await this.holdsService.deleteById(hold.id);

    return {
      id: saved.id,
      bookingId: saved.id,
      status: saved.status,
      totalPrice: saved.totalPrice,
    };
  }

  /** Проверка пересечений с существующими бронированиями */
  async findConflicts(
    placeId: string,
    checkIn: string,
    checkOut: string,
    excludeId?: string,
  ): Promise<Booking[]> {
    const qb = this.repo
      .createQueryBuilder('b')
      .where('b.place_id = :placeId', { placeId })
      .andWhere('b.status NOT IN (:...statuses)', {
        statuses: ['cancelled', 'expired', 'draft'],
      })
      .andWhere('b.check_in < :checkOut', { checkOut })
      .andWhere('b.check_out > :checkIn', { checkIn });
    if (excludeId) qb.andWhere('b.id != :excl', { excl: excludeId });
    return qb.getMany();
  }

  /** Админский сценарий: ручное создание бронирования (без холда) */
  async createAdmin(dto: CreateAdminBookingDto) {
    if (dto.checkIn >= dto.checkOut)
      throw new BadRequestException('check_out must be after check_in');

    // Проверка конфликта — предупреждаем, но всё равно создаём (админский override)
    const conflicts = await this.findConflicts(
      dto.placeId,
      dto.checkIn,
      dto.checkOut,
    );

    const customer = await this.customersService.upsertByPhone({
      name: dto.customer.name,
      phone: dto.customer.phone,
      email: dto.customer.email,
      carNumber: dto.customer.carNumber,
    });

    const price = await this.pricingService.calculate(
      dto.placeId,
      dto.checkIn,
      dto.checkOut,
      dto.guestsCount,
    );

    const conflictNote =
      conflicts.length > 0
        ? `⚠️ КОНФЛИКТ: пересекается с ${conflicts.map((c) => c.id.slice(0, 8)).join(', ')}\n`
        : '';

    const booking = this.repo.create({
      placeId: dto.placeId,
      customerId: customer.id,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      checkInTime: dto.checkInTime ?? '12:00',
      checkOutTime: dto.checkOutTime ?? '14:00',
      guestsCount: dto.guestsCount,
      source: dto.source ?? 'admin',
      status: 'confirmed',
      paymentStatus:
        this.normalizePaymentStatus(dto.paymentStatus) ?? 'not_paid',
      totalPrice: String(price.total),
      adminNote: conflictNote + (dto.adminNote ?? ''),
      crmSyncStatus: 'pending',
    } as Booking);

    const saved = await this.repo.save(booking);
    return {
      ...saved,
      conflicts: conflicts.map((c) => ({
        id: c.id,
        checkIn: c.checkIn,
        checkOut: c.checkOut,
      })),
    };
  }

  findPublic(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['place', 'customer'],
    });
  }

  async findAdmin(id: string) {
    const booking = await this.repo.findOne({
      where: { id },
      relations: ['place', 'place.accommodationType', 'customer', 'payments'],
    });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking;
  }

  async listAdmin(query: ListBookingsQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.place', 'place')
      .leftJoinAndSelect('place.accommodationType', 'type')
      .leftJoinAndSelect('b.customer', 'customer')
      .orderBy('b.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status)
      qb.andWhere('b.status = :status', { status: query.status });
    if (query.source)
      qb.andWhere('b.source = :source', { source: query.source });
    if (query.placeId)
      qb.andWhere('b.place_id = :placeId', { placeId: query.placeId });
    if (query.q) {
      qb.andWhere('(customer.name ILIKE :q OR customer.phone ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updateStatus(id: string, status: string) {
    await this.repo.update(id, { status });
    return this.findAdmin(id);
  }

  async updatePayment(id: string, paymentStatus: string) {
    await this.repo.update(id, {
      paymentStatus: this.normalizePaymentStatus(paymentStatus),
    });
    return this.findAdmin(id);
  }

  async updateNote(id: string, adminNote: string) {
    await this.repo.update(id, { adminNote });
    return this.findAdmin(id);
  }

  async update(id: string, dto: UpdateBookingDto) {
    await this.repo.update(id, {
      ...dto,
      paymentStatus: this.normalizePaymentStatus(dto.paymentStatus),
    });
    return this.findAdmin(id);
  }

  async updateTimes(id: string, checkInTime: string, checkOutTime: string) {
    await this.repo.update(id, { checkInTime, checkOutTime });
    return this.findAdmin(id);
  }

  private normalizePaymentStatus(value?: string): string | undefined {
    if (!value) return value;
    if (value === 'unpaid') return 'not_paid';
    return value;
  }
}
