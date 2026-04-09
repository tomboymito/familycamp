import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { DashboardData, DashboardBookingRow } from '@/lib/api';

const PAYMENT_LABELS: Record<string, string> = {
  paid:     'Оплачено',
  not_paid: 'Не оплачено',
  unpaid:   'Не оплачено',
  refunded: 'Возврат',
  payment_failed: 'Ошибка оплаты',
};

const PAYMENT_COLORS: Record<string, string> = {
  paid:     'bg-green-100 text-green-700',
  not_paid: 'bg-red-100 text-red-600',
  unpaid:   'bg-red-100 text-red-600',
  refunded: 'bg-gray-100 text-gray-600',
  payment_failed: 'bg-red-100 text-red-700',
};


function GuestRow({ row, label }: { row: DashboardBookingRow; label: 'in' | 'out' }) {
  const navigate = useNavigate();
  const time = label === 'in' ? row.checkInTime : row.checkOutTime;
  return (
    <tr
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => navigate(`/bookings/${row.id}`)}
    >
      <td className="px-3 py-2.5">
        <div className="text-sm font-medium text-gray-900">{row.guestName}</div>
        <a
          href={`tel:${row.guestPhone}`}
          className="text-xs text-green-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.guestPhone}
        </a>
      </td>
      <td className="px-3 py-2.5">
        <span className="font-semibold text-gray-800">{row.placeCode}</span>
        <span className="text-xs text-gray-400 ml-1">{row.placeName}</span>
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-600">{time}</td>
      <td className="px-3 py-2.5 text-xs text-gray-500">{row.guestsCount} чел.</td>
      <td className="px-3 py-2.5">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_COLORS[row.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
          {PAYMENT_LABELS[row.paymentStatus] ?? row.paymentStatus}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm text-right text-gray-700">
        {row.totalPrice ? `${Number(row.totalPrice).toLocaleString('ru-RU')} ₽` : '—'}
      </td>
    </tr>
  );
}

function GuestTable({ rows, label, emptyText }: {
  rows: DashboardBookingRow[];
  label: 'in' | 'out';
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-3 text-center">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="text-left px-3 py-2 font-medium">Гость</th>
            <th className="text-left px-3 py-2 font-medium">Место</th>
            <th className="text-left px-3 py-2 font-medium">Время</th>
            <th className="text-left px-3 py-2 font-medium">Гостей</th>
            <th className="text-left px-3 py-2 font-medium">Оплата</th>
            <th className="text-right px-3 py-2 font-medium">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => <GuestRow key={r.id} row={r} label={label} />)}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border p-5 ${color ? `border-${color}-200` : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTomorrow, setShowTomorrow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.dashboard());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        ⏳ Загружаем данные...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 mb-3">{error ?? 'Нет данных'}</p>
        <button onClick={load} className="text-green-700 underline text-sm">Повторить</button>
      </div>
    );
  }

  const checkIns  = showTomorrow ? data.checkInsTomorrow  : data.checkInsToday;
  const checkOuts = showTomorrow ? data.checkOutsTomorrow : data.checkOutsToday;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Главная</h1>
          <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={load} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors self-start sm:self-auto">
          🔄 Обновить
        </button>
      </div>

      {/* Attention banners */}
      {(data.attention.unpaidConfirmed > 0 || data.attention.dirtyPlaces.length > 0 || (data.attention.conflicts?.length ?? 0) > 0) && (
        <div className="space-y-2">
          {(data.attention.conflicts?.length ?? 0) > 0 && (
            <div className="flex items-start gap-3 bg-red-50 border-2 border-red-400 rounded-xl px-4 py-3">
              <span className="text-xl mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800">
                  Овербукинг! {data.attention.conflicts!.length} пересекающихся брон{data.attention.conflicts!.length === 1 ? 'ь' : 'и'}
                </p>
                <div className="mt-1.5 space-y-1">
                  {data.attention.conflicts!.map(c => (
                    <div key={c.id}
                      className="text-xs text-red-700 cursor-pointer hover:underline"
                      onClick={() => navigate(`/bookings/${c.id}`)}
                    >
                      Место {c.placeCode} — {c.guestName}: {c.checkIn} → {c.checkOut}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {data.attention.unpaidConfirmed > 0 && (
            <div
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => navigate('/bookings')}
            >
              <span className="text-xl">💳</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {data.attention.unpaidConfirmed} {data.attention.unpaidConfirmed === 1 ? 'бронь подтверждена' : 'брони подтверждены'} но не оплачена{data.attention.unpaidConfirmed === 1 ? '' : 'ы'}
                </p>
                <p className="text-xs text-amber-600">Нажмите чтобы перейти к бронированиям</p>
              </div>
              <span className="text-amber-400">→</span>
            </div>
          )}
          {data.attention.dirtyPlaces.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-xl">🧹</span>
              <div>
                <p className="text-sm font-semibold text-red-800">Нужна уборка</p>
                <p className="text-xs text-red-600">
                  {data.attention.dirtyPlaces.map((p) => p.code).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="🏕️"
          label="Загрузка кемпинга"
          value={`${data.occupancy.pct}%`}
          sub={`${data.occupancy.active} / ${data.occupancy.total} мест`}
        />
        <StatCard
          icon="💰"
          label="Выручка за месяц"
          value={`${data.revenue.month.toLocaleString('ru-RU')} ₽`}
          sub="оплаченные брони"
        />
        <StatCard
          icon="📅"
          label="Заездов сегодня"
          value={data.checkInsToday.length}
          sub={`завтра: ${data.checkInsTomorrow.length}`}
        />
        <StatCard
          icon="🚗"
          label="Выездов сегодня"
          value={data.checkOutsToday.length}
          sub={`завтра: ${data.checkOutsTomorrow.length}`}
        />
      </div>

      {/* Day toggle */}
      <div className="flex items-center gap-2">
        <div className="flex border border-gray-300 rounded-lg overflow-hidden text-sm">
          <button
            onClick={() => setShowTomorrow(false)}
            className={`px-4 py-1.5 transition-colors ${!showTomorrow ? 'bg-green-700 text-white' : 'hover:bg-gray-50 text-gray-700'}`}
          >
            Сегодня
          </button>
          <button
            onClick={() => setShowTomorrow(true)}
            className={`px-4 py-1.5 transition-colors ${showTomorrow ? 'bg-green-700 text-white' : 'hover:bg-gray-50 text-gray-700'}`}
          >
            Завтра
          </button>
        </div>
        <span className="text-sm text-gray-500">
          {showTomorrow ? data.tomorrow : data.today}
        </span>
      </div>

      {/* Check-ins / Check-outs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">↘</span>
            <h2 className="font-semibold text-gray-900">
              Заезды — {checkIns.length}
            </h2>
          </div>
          <GuestTable rows={checkIns} label="in" emptyText="Нет заездов" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">↗</span>
            <h2 className="font-semibold text-gray-900">
              Выезды — {checkOuts.length}
            </h2>
          </div>
          <GuestTable rows={checkOuts} label="out" emptyText="Нет выездов" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/chess-board')}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors"
        >
          📋 Открыть шахматку
        </button>
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          📅 Все бронирования
        </button>
      </div>
    </div>
  );
}
