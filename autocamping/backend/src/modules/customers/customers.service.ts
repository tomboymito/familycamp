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

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
  ) {}

  async list(query: CustomerListQuery) {
    const page  = query.page  ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const skip  = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('c')
      .orderBy('c.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.q) {
      qb.andWhere('(c.name ILIKE :q OR c.phone ILIKE :q OR c.email ILIKE :q)', { q: `%${query.q}%` });
    }
    if (query.tag) {
      qb.andWhere(':tag = ANY(c.tags)', { tag: query.tag });
    }

    const [items, total] = await qb.getManyAndCount();

    // Attach total spend per customer
    const ids = items.map(c => c.id);
    let spendMap: Record<string, number> = {};
    if (ids.length > 0) {
      const rows = await this.repo.query(
        `SELECT customer_id, COALESCE(SUM(total_price),0)::float as total
         FROM bookings
         WHERE customer_id = ANY($1) AND status = 'confirmed' AND payment_status = 'paid'
         GROUP BY customer_id`,
        [ids],
      ) as { customer_id: string; total: number }[];
      spendMap = Object.fromEntries(rows.map(r => [r.customer_id, r.total]));
    }

    const bookingCountMap = await this.getBookingCounts(ids);

    return {
      items: items.map(c => ({
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
      where: [
        { name:  ILike(`%${q}%`) },
        { phone: ILike(`%${q}%`) },
      ],
      take: 20,
    });
  }

  async findOne(id: string) {
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) return null;

    // bookings with place info
    const bookings = await this.repo.query(
      `SELECT b.*, p.code as place_code, p.name as place_name
       FROM bookings b
       LEFT JOIN places p ON p.id = b.place_id
       WHERE b.customer_id = $1
       ORDER BY b.check_in DESC`,
      [id],
    ) as Record<string, unknown>[];

    const totalSpend = bookings
      .filter(b => b['status'] === 'confirmed' && b['payment_status'] === 'paid')
      .reduce((sum, b) => sum + parseFloat((b['total_price'] as string) ?? '0'), 0);

    return { ...customer, bookings, totalSpend };
  }

  /** Find customer by phone or create a new one */
  async upsertByPhone(input: UpsertCustomerInput): Promise<Customer> {
    const existing = await this.repo.findOne({ where: { phone: input.phone } });
    if (existing) return existing;
    return this.repo.save(this.repo.create(input));
  }

  async update(id: string, dto: {
    name?: string; phone?: string; email?: string;
    carNumber?: string; notes?: string; tags?: string[];
  }) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  private async getBookingCounts(ids: string[]): Promise<Record<string, number>> {
    if (ids.length === 0) return {};
    const rows = await this.repo.query(
      `SELECT customer_id, COUNT(*)::int as cnt FROM bookings WHERE customer_id = ANY($1) GROUP BY customer_id`,
      [ids],
    ) as { customer_id: string; cnt: number }[];
    return Object.fromEntries(rows.map(r => [r.customer_id, r.cnt]));
  }
}
