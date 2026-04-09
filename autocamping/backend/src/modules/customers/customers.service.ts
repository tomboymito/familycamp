import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';

export interface UpsertCustomerInput {
  name: string;
  phone: string;
  email?: string;
  carNumber?: string;
}

export interface CustomerListQuery {
  q?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

interface BookingSpendRow {
  customer_id: string;
  total: number;
}

interface BookingCountRow {
  customer_id: string;
  cnt: number;
}

interface CustomerBookingRow {
  status: string;
  payment_status: string;
  total_price: string | number | null;
  [key: string]: unknown;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
  ) {}

  private async queryRows<T>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const raw: unknown = await this.repo.query(sql, params);
    if (!Array.isArray(raw)) return [];
    return raw as T[];
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  async list(query: CustomerListQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('c')
      .orderBy('c.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.q) {
      qb.andWhere('(c.name ILIKE :q OR c.phone ILIKE :q OR c.email ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }
    if (query.tag) {
      qb.andWhere(':tag = ANY(c.tags)', { tag: query.tag });
    }

    const [items, total] = await qb.getManyAndCount();

    // Добавляем суммарные траты по каждому клиенту
    const ids = items.map((c) => c.id);
    let spendMap: Record<string, number> = {};
    if (ids.length > 0) {
      const rows = await this.queryRows<BookingSpendRow>(
        `SELECT customer_id, COALESCE(SUM(total_price),0)::float as total
         FROM bookings
         WHERE customer_id = ANY($1) AND status = 'confirmed' AND payment_status = 'paid'
         GROUP BY customer_id`,
        [ids],
      );
      spendMap = rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.customer_id] = this.toNumber(row.total);
        return acc;
      }, {});
    }

    const bookingCountMap = await this.getBookingCounts(ids);

    return {
      items: items.map((c) => ({
        ...c,
        totalSpend: spendMap[c.id] ?? 0,
        bookingsCount: bookingCountMap[c.id] ?? 0,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  search(q: string) {
    return this.repo.find({
      where: [{ name: ILike(`%${q}%`) }, { phone: ILike(`%${q}%`) }],
      take: 20,
    });
  }

  async findOne(id: string): Promise<
    | (Record<string, unknown> & {
        bookings: Record<string, unknown>[];
        totalSpend: number;
      })
    | null
  > {
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) return null;

    // Бронирования вместе с информацией о месте
    const bookings = await this.queryRows<CustomerBookingRow>(
      `SELECT b.*, p.code as place_code, p.name as place_name
       FROM bookings b
       LEFT JOIN places p ON p.id = b.place_id
       WHERE b.customer_id = $1
       ORDER BY b.check_in DESC`,
      [id],
    );

    const totalSpend = bookings
      .filter((b) => b.status === 'confirmed' && b.payment_status === 'paid')
      .reduce((sum, b) => sum + this.toNumber(b.total_price), 0);

    return {
      ...(customer as unknown as Record<string, unknown>),
      bookings,
      totalSpend,
    };
  }

  /** Найти клиента по телефону или создать нового */
  async upsertByPhone(input: UpsertCustomerInput): Promise<Customer> {
    const existing = await this.repo.findOne({
      where: { phone: input.phone },
    });
    if (existing) return existing;
    return this.repo.save(this.repo.create(input));
  }

  async update(
    id: string,
    dto: {
      name?: string;
      phone?: string;
      email?: string;
      carNumber?: string;
      notes?: string;
      tags?: string[];
    },
  ) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  private async getBookingCounts(
    ids: string[],
  ): Promise<Record<string, number>> {
    if (ids.length === 0) return {};
    const rows = await this.queryRows<BookingCountRow>(
      `SELECT customer_id, COUNT(*)::int as cnt FROM bookings WHERE customer_id = ANY($1) GROUP BY customer_id`,
      [ids],
    );
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.customer_id] = this.toNumber(row.cnt);
      return acc;
    }, {});
  }
}
