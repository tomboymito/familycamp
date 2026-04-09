import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Booking } from '@/lib/api';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: '#f3f4f6', text: '#374151', label: 'Черновик' },
  awaiting_payment: { bg: '#fef9c3', text: '#854d0e', label: 'Ожидает оплаты' },
  confirmed: { bg: '#dcfce7', text: '#166534', label: 'Подтверждено' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', label: 'Отменено' },
  expired: { bg: '#f3f4f6', text: '#6b7280', label: 'Истекло' },
};

const PAYMENT_STYLES: Record<string, { bg: string; text: string }> = {
  not_paid: { bg: '#fff7ed', text: '#c2410c' },
  unpaid: { bg: '#fff7ed', text: '#c2410c' },
  paid: { bg: '#dcfce7', text: '#166534' },
  refunded: { bg: '#ede9fe', text: '#6d28d9' },
  payment_failed: { bg: '#fee2e2', text: '#991b1b' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const s = PAYMENT_STYLES[status] ?? PAYMENT_STYLES.not_paid;
  const labels: Record<string, string> = {
    not_paid: 'Не оплачено',
    unpaid: 'Не оплачено',
    paid: 'Оплачено',
    refunded: 'Возврат',
    payment_failed: 'Ошибка оплаты',
  };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.text }}>
      {labels[status] ?? status}
    </span>
  );
}

const LIMIT = 20;

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.bookings({
        page,
        limit: LIMIT,
        status: statusFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        search: search || undefined,
      });
      setBookings(result.data);
      setTotal(result.total);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, fromFilter, toFilter, search]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бронирования</h1>
          <p className="text-gray-500 text-sm">Всего: {total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Поиск по имени/телефону"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500 flex-1 min-w-40"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_STYLES).map(([v, s]) => (
            <option key={v} value={v}>{s.label}</option>
          ))}
        </select>
        <input type="date" value={fromFilter} onChange={(e) => { setFromFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
          placeholder="С" title="Заезд с"
        />
        <input type="date" value={toFilter} onChange={(e) => { setToFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
          placeholder="По" title="Заезд по"
        />
        <button onClick={() => { setSearch(''); setStatusFilter(''); setFromFilter(''); setToFilter(''); setPage(1); }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Сброс
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
            ⏳ Загружаем...
          </div>
        )}
        {!loading && bookings.length === 0 && (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
            Бронирований не найдено
          </div>
        )}
        {!loading && bookings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Гость</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Место</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Заезд</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Выезд</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Статус</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Оплата</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{b.customer?.name ?? '—'}</div>
                      <div className="text-xs text-gray-500">{b.customer?.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{b.place?.code ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{b.checkIn}</td>
                    <td className="px-4 py-3 text-gray-700">{b.checkOut}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3"><PaymentBadge status={b.paymentStatus} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {b.totalPrice ? `${Number(b.totalPrice).toLocaleString('ru-RU')} ₽` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Стр. {page} из {totalPages} (всего {total})
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                ←
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
