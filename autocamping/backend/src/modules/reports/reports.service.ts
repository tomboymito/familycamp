import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  private async queryRows<T>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const raw: unknown = await this.db.query(sql, params);
    if (!Array.isArray(raw)) return [];
    return raw as T[];
  }

  /** Помесячная выручка за последние N месяцев */
  async revenueByMonth(months = 12) {
    const rows = await this.queryRows<{
      month: string;
      revenue: number;
      bookings: number;
    }>(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', check_in), 'YYYY-MM') AS month,
         COALESCE(SUM(total_price), 0)::float                AS revenue,
         COUNT(*)::int                                        AS bookings
       FROM bookings
       WHERE status = 'confirmed'
         AND check_in >= DATE_TRUNC('month', NOW()) - ($1 - 1) * INTERVAL '1 month'
       GROUP BY 1
       ORDER BY 1`,
      [months],
    );
    return rows;
  }

  /** Процент загрузки по местам за выбранный диапазон дат */
  async occupancyByPlace(from: string, to: string) {
    const rows = await this.queryRows<{
      id: string;
      code: string;
      name: string;
      days_occupied: number;
      total_days: number;
      pct: number;
    }>(
      `WITH period AS (
         SELECT $1::date AS from_date, $2::date AS to_date,
                ($2::date - $1::date) AS total_days
       ),
       occupied AS (
         SELECT b.place_id,
                SUM(LEAST(b.check_out, p.to_date) - GREATEST(b.check_in, p.from_date)) AS days_occupied
         FROM bookings b, period p
         WHERE b.status = 'confirmed'
           AND b.check_in < p.to_date
           AND b.check_out > p.from_date
         GROUP BY b.place_id
       )
       SELECT pl.id, pl.code, pl.name,
              COALESCE(o.days_occupied, 0)::int                                           AS days_occupied,
              per.total_days                                                               AS total_days,
              ROUND(COALESCE(o.days_occupied, 0)::numeric / NULLIF(per.total_days, 0) * 100, 1)::float AS pct
       FROM places pl
       CROSS JOIN period per
       LEFT JOIN occupied o ON o.place_id = pl.id
       WHERE pl.is_active = true
       ORDER BY pct DESC`,
      [from, to],
    );
    return rows;
  }

  /** Разбивка бронирований по источникам */
  async bySource(from?: string, to?: string) {
    let where = `WHERE status != 'cancelled' AND status != 'expired' AND status != 'draft'`;
    const params: string[] = [];
    if (from) {
      params.push(from);
      where += ` AND check_in >= $${params.length}::date`;
    }
    if (to) {
      params.push(to);
      where += ` AND check_in <  $${params.length}::date`;
    }

    const rows = await this.queryRows<{
      source: string;
      bookings: number;
      revenue: number;
    }>(
      `SELECT source, COUNT(*)::int AS bookings, COALESCE(SUM(total_price),0)::float AS revenue
       FROM bookings ${where}
       GROUP BY source ORDER BY bookings DESC`,
      params,
    );
    return rows;
  }

  /** Ключевые метрики: средний чек, средняя длительность, доля повторных гостей */
  async summary(from?: string, to?: string) {
    let where = `WHERE status = 'confirmed'`;
    const params: string[] = [];
    if (from) {
      params.push(from);
      where += ` AND check_in >= $${params.length}::date`;
    }
    if (to) {
      params.push(to);
      where += ` AND check_in <  $${params.length}::date`;
    }

    const [row] = await this.queryRows<{
      total_bookings: number;
      total_revenue: number;
      avg_check: number;
      avg_nights: number;
      unique_guests: number;
      places_used: number;
    }>(
      `SELECT
         COUNT(*)::int                                                 AS total_bookings,
         COALESCE(SUM(total_price), 0)::float                         AS total_revenue,
         COALESCE(AVG(total_price), 0)::float                         AS avg_check,
         COALESCE(AVG(check_out - check_in), 0)::float                AS avg_nights,
         COUNT(DISTINCT customer_id)::int                              AS unique_guests,
         COUNT(DISTINCT place_id)::int                                 AS places_used
       FROM bookings ${where}`,
      params,
    );

    // Повторные гости: клиенты с более чем одним подтверждённым бронированием
    const [repeatRow] = await this.queryRows<{ repeat_guests: number }>(
      `SELECT COUNT(*)::int AS repeat_guests
       FROM (
         SELECT customer_id FROM bookings WHERE status = 'confirmed'
         GROUP BY customer_id HAVING COUNT(*) > 1
       ) sub`,
    );

    return {
      ...(row ?? {
        total_bookings: 0,
        total_revenue: 0,
        avg_check: 0,
        avg_nights: 0,
        unique_guests: 0,
        places_used: 0,
      }),
      repeat_guests: repeatRow?.repeat_guests ?? 0,
    };
  }

  /** Экспорт CSV: подтверждённые бронирования за период */
  async exportCsv(from: string, to: string): Promise<string> {
    const rows = await this.queryRows<Record<string, unknown>>(
      `SELECT
         b.id,
         c.name AS guest_name, c.phone AS guest_phone, c.email AS guest_email,
         pl.code AS place_code, pl.name AS place_name,
         b.check_in, b.check_out,
         (b.check_out - b.check_in) AS nights,
         b.guests_count,
         b.total_price,
         b.payment_status,
         b.status,
         b.source,
         b.created_at
       FROM bookings b
       LEFT JOIN customers c  ON c.id = b.customer_id
       LEFT JOIN places    pl ON pl.id = b.place_id
       WHERE b.check_in >= $1::date AND b.check_in < $2::date
         AND b.status NOT IN ('draft','expired')
       ORDER BY b.check_in`,
      [from, to],
    );

    if (rows.length === 0) return 'Нет данных';

    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(';'),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const v = r[h];
            const s = this.toCsvText(v);
            return s.includes(';') || s.includes('"')
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(';'),
      ),
    ];
    return lines.join('\n');
  }

  private toCsvText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }
    if (value instanceof Date) return value.toISOString();
    return '';
  }
}
