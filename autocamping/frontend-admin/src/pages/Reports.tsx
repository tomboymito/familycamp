import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { api } from '@/lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthStart(offsetMonths: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return localDate(d);
}

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d'];

const SOURCE_LABELS: Record<string, string> = {
  website:    'Сайт',
  phone:      'Телефон',
  'walk-in':  'С улицы',
  'booking.com': 'Booking.com',
  avito:      'Авито',
  whatsapp:   'WhatsApp',
  other:      'Другое',
};

function fmt(n: number) {
  return n.toLocaleString('ru-RU');
}

function rub(n: number) {
  return `${fmt(Math.round(n))} ₽`;
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'text-gray-900' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Custom tooltip for bar chart ────────────────────────────────────────────

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function RevenueTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-sm">
      <div className="font-semibold text-gray-700 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name === 'revenue' ? 'Выручка' : 'Брони'}: {p.name === 'revenue' ? rub(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Reports() {
  // Date range for occupancy/sources/summary
  const [from, setFrom] = useState(monthStart(-1));
  const [to,   setTo]   = useState(localDate(new Date()));
  const [revenueMonths, setRevenueMonths] = useState(12);

  type RevRow = { month: string; revenue: number; bookings: number };
  type OccRow = { id: string; code: string; name: string; days_occupied: number; total_days: number; pct: number };
  type SrcRow = { source: string; bookings: number; revenue: number };
  type Summary = { total_bookings: number; total_revenue: number; avg_check: number; avg_nights: number; unique_guests: number; places_used: number; repeat_guests: number };

  const [revenue,   setRevenue]   = useState<RevRow[]>([]);
  const [occupancy, setOccupancy] = useState<OccRow[]>([]);
  const [sources,   setSources]   = useState<SrcRow[]>([]);
  const [summary,   setSummary]   = useState<Summary | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rev, occ, src, sum] = await Promise.all([
        api.reportsRevenue(revenueMonths),
        api.reportsOccupancy(from, to),
        api.reportsSources(from, to),
        api.reportsSummary(from, to),
      ]);
      setRevenue(rev);
      setOccupancy(occ);
      setSources(src);
      setSummary(sum);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to, revenueMonths]);

  useEffect(() => { void load(); }, [load]);

  const handleExport = async () => {
    setDownloading(true);
    try {
      // Build authenticated request
      const token = localStorage.getItem('access_token');
      const url = api.reportsCsvUrl(from, to);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bookings_${from}_${to}.csv`;
      link.click();
    } finally { setDownloading(false); }
  };

  // Format month label "2026-01" → "янв 26"
  const MONTHS_RU = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  const fmtMonth = (m: string) => {
    const [y, mo] = m.split('-');
    return `${MONTHS_RU[parseInt(mo) - 1]} ${y.slice(2)}`;
  };

  const revenueData = revenue.map(r => ({ ...r, monthLabel: fmtMonth(r.month) }));
  const sourcesData = sources.map(r => ({ ...r, name: SOURCE_LABELS[r.source] ?? r.source }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>
          <p className="text-gray-500 text-sm">Статистика и показатели кемпинга</p>
        </div>
        <button
          onClick={handleExport}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors self-start sm:self-auto"
        >
          {downloading ? '⏳ Скачиваю...' : '⬇ Экспорт CSV'}
        </button>
      </div>

      {/* Date range filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-gray-600">Период:</span>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500" />
          <span className="text-gray-400">—</span>
          <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        {/* Quick ranges */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Этот месяц',    f: monthStart(0),  t: localDate(new Date()) },
            { label: 'Прошлый месяц', f: monthStart(-1), t: monthStart(0) },
            { label: '3 месяца',      f: monthStart(-3), t: localDate(new Date()) },
            { label: 'Год',           f: monthStart(-12), t: localDate(new Date()) },
          ].map(({ label, f, t }) => (
            <button key={label}
              onClick={() => { setFrom(f); setTo(t); }}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                from === f && to === t
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-200 text-gray-600 hover:border-green-400'
              }`}
            >{label}</button>
          ))}
        </div>
        {loading && <span className="text-xs text-gray-400 ml-auto">Обновляю...</span>}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Броней" value={fmt(summary.total_bookings)} />
          <StatCard label="Выручка" value={rub(summary.total_revenue)} color="text-green-700" />
          <StatCard label="Средний чек" value={rub(summary.avg_check)} />
          <StatCard label="Ср. ночей" value={summary.avg_nights.toFixed(1)} />
          <StatCard label="Уникальных гостей" value={fmt(summary.unique_guests)} />
          <StatCard
            label="Постоянные гости"
            value={fmt(summary.repeat_guests)}
            sub={summary.unique_guests > 0 ? `${Math.round(summary.repeat_guests / summary.unique_guests * 100)}%` : ''}
            color="text-blue-700"
          />
        </div>
      )}

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Выручка по месяцам</h2>
          <div className="flex gap-1">
            {([6, 12, 24] as const).map(m => (
              <button key={m}
                onClick={() => setRevenueMonths(m)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  revenueMonths === m
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-200 text-gray-600 hover:border-green-400'
                }`}
              >{m} мес.</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}к`} />
            <Tooltip content={<RevenueTooltip />} />
            <Bar dataKey="revenue" name="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy by place */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Загрузка по местам</h2>
          {occupancy.length === 0 ? (
            <div className="text-sm text-gray-400 py-8 text-center">Нет данных</div>
          ) : (
            <div className="space-y-2.5">
              {occupancy.map((o, i) => (
                <div key={o.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800">{o.code}</span>
                    <span className="text-gray-500">{o.days_occupied} / {o.total_days} дн. ({o.pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(o.pct, 100)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sources breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Источники бронирований</h2>
          {sourcesData.length === 0 ? (
            <div className="text-sm text-gray-400 py-8 text-center">Нет данных</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={sourcesData}
                    dataKey="bookings"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {sourcesData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} броней`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {sourcesData.map((s, i) => (
                  <div key={s.source} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-700">{s.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-800">{s.bookings}</span>
                      <span className="text-gray-400 text-xs ml-2">{rub(s.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Occupancy table — full data */}
      {occupancy.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Детали по местам</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Место</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Дней занято</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Всего дней</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Загрузка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {occupancy.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{o.code} <span className="text-gray-400 font-normal">— {o.name}</span></td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{o.days_occupied}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{o.total_days}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-semibold ${o.pct >= 70 ? 'text-green-700' : o.pct >= 40 ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {o.pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
