import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { ChessBoardData, ChessSlot, HousekeepingStatus } from '@/lib/api';
import CreateBookingModal from '@/components/CreateBookingModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format local Date to YYYY-MM-DD without UTC shift */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

function formatDay(dateStr: string): { weekday: string; day: string; month: string } {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
    day: d.toLocaleDateString('ru-RU', { day: 'numeric' }),
    month: d.toLocaleDateString('ru-RU', { month: 'short' }),
  };
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day === 0 || day === 6;
}

function today(): string {
  return localDateStr(new Date());
}

/** Convert 'HH:MM' to fraction of day [0..100] */
function timeToPct(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h * 60 + (m ?? 0)) / (24 * 60)) * 100;
}

// ─── Zoom levels ──────────────────────────────────────────────────────────────

const ZOOM_LEVELS: { days: number; label: string }[] = [
  { days: 1,  label: '1 д' },
  { days: 3,  label: '3 д' },
  { days: 7,  label: 'Нед' },
  { days: 14, label: '2 нед' },
  { days: 30, label: 'Месяц' },
];

// ─── Cell colours ─────────────────────────────────────────────────────────────

const BOOKING_COLORS: Record<string, { fill: string; border: string; text: string }> = {
  booked:           { fill: '#86efac', border: '#16a34a', text: '#14532d' },
  awaiting_payment: { fill: '#fde68a', border: '#d97706', text: '#78350f' },
  blocked:          { fill: '#fca5a5', border: '#dc2626', text: '#7f1d1d' },
  hold:             { fill: '#fed7aa', border: '#ea580c', text: '#7c2d12' },
  free:             { fill: 'transparent', border: 'transparent', text: 'transparent' },
};

const STATE_LABELS: Record<string, string> = {
  free:             'Свободно',
  booked:           'Подтверждено',
  awaiting_payment: 'Ожидает оплаты',
  blocked:          'Заблокировано',
  hold:             'Холд',
};

const STATE_ICONS: Record<string, string> = {
  booked:           '✓',
  awaiting_payment: '₽',
  blocked:          '✕',
  hold:             '⏳',
};

const EMPTY = '#f9fafb';

/**
 * Returns CSS `background` for a cell.
 * - check-in day : left part empty (up to checkInTime), right part filled
 * - check-out day: left part filled (up to checkOutTime), right part empty
 * - middle day   : fully filled
 */
function cellBackground(slot: ChessSlot, date: string): string {
  const { state } = slot;
  if (state === 'free') return EMPTY;

  const { fill } = BOOKING_COLORS[state] ?? BOOKING_COLORS.booked;
  const isCheckIn  = slot.bookingStart === date;
  const isCheckOut = slot.bookingEnd   === date;

  const inPct  = timeToPct(slot.checkInTime  ?? '12:00');
  const outPct = timeToPct(slot.checkOutTime ?? '14:00');

  if (isCheckIn && isCheckOut) {
    // Same-day: tiny window inPct → outPct
    return `linear-gradient(to right, ${EMPTY} ${inPct}%, ${fill} ${inPct}%, ${fill} ${outPct}%, ${EMPTY} ${outPct}%)`;
  }
  if (isCheckIn) {
    return `linear-gradient(to right, ${EMPTY} ${inPct}%, ${fill} ${inPct}%)`;
  }
  if (isCheckOut) {
    return `linear-gradient(to right, ${fill} 0%, ${fill} ${outPct}%, ${EMPTY} ${outPct}%)`;
  }
  return fill;
}

// ─── Housekeeping ─────────────────────────────────────────────────────────────

const HK_CONFIG: Record<HousekeepingStatus, { label: string; color: string; bg: string; icon: string }> = {
  unknown:     { label: 'Неизвестно',  color: '#6b7280', bg: '#f3f4f6', icon: '?' },
  dirty:       { label: 'Грязно',      color: '#dc2626', bg: '#fee2e2', icon: '🧹' },
  clean:       { label: 'Убрано',      color: '#2563eb', bg: '#dbeafe', icon: '✓' },
  ready:       { label: 'Готово',      color: '#16a34a', bg: '#dcfce7', icon: '✅' },
  maintenance: { label: 'Ремонт',      color: '#7c3aed', bg: '#ede9fe', icon: '🔧' },
};

const HK_ORDER: HousekeepingStatus[] = ['dirty', 'clean', 'ready', 'maintenance', 'unknown'];

function HKDropdown({ placeId, current, onChange }: {
  placeId: string;
  current: HousekeepingStatus;
  onChange: (placeId: string, status: HousekeepingStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = HK_CONFIG[current];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleSelect = async (status: HousekeepingStatus) => {
    setOpen(false);
    setSaving(true);
    try {
      await api.setHousekeeping(placeId, status);
      onChange(placeId, status);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative mt-0.5">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        disabled={saving}
        className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors hover:opacity-80"
        style={{ background: cfg.bg, borderColor: cfg.color, color: cfg.color }}
        title="Статус уборки"
      >
        <span>{cfg.icon}</span>
        <span className="hidden sm:inline">{saving ? '…' : cfg.label}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-36">
          {HK_ORDER.map((s) => {
            const c = HK_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
                style={{ color: c.color }}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
                {s === current && <span className="ml-auto">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipData { slot: ChessSlot; placeName: string; date: string; x: number; y: number; }

function Tooltip({ data }: { data: TooltipData }) {
  const { slot, date } = data;
  const label = STATE_LABELS[slot.state] ?? slot.state;
  const colors = BOOKING_COLORS[slot.state] ?? BOOKING_COLORS.booked;
  const isCheckIn  = slot.bookingStart === date;
  const isCheckOut = slot.bookingEnd   === date;

  return (
    <div
      className="fixed z-50 pointer-events-none bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-sm min-w-52"
      style={{ left: data.x + 14, top: data.y - 8 }}
    >
      <p className="font-semibold text-gray-900 mb-1">{data.placeName} · {slot.date}</p>
      <p className="font-medium mb-1" style={{ color: colors.text }}>{label}</p>
      {isCheckIn  && <p className="text-xs text-gray-500">↘ Заезд в {slot.checkInTime  ?? '12:00'}</p>}
      {isCheckOut && <p className="text-xs text-gray-500">↗ Выезд в {slot.checkOutTime ?? '14:00'}</p>}
      {slot.guestName && <p className="text-gray-700 mt-1">👤 {slot.guestName}</p>}
      {slot.bookingStart && slot.bookingEnd && (
        <p className="text-gray-500 text-xs mt-0.5">{slot.bookingStart} → {slot.bookingEnd}</p>
      )}
      {slot.source      && <p className="text-gray-500 text-xs">Источник: {slot.source}</p>}
      {slot.paymentStatus && <p className="text-gray-500 text-xs">Оплата: {slot.paymentStatus}</p>}
      {slot.reason      && <p className="text-gray-500 text-xs mt-0.5">Причина: {slot.reason}</p>}
      {slot.bookingId   && <p className="text-blue-500 text-xs mt-1 underline">Открыть бронирование →</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const LABEL_W = 140;

export default function ChessBoard() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(() => today());
  const [zoomIdx, setZoomIdx] = useState(3); // default: 14 days
  const [data, setData] = useState<ChessBoardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [housekeeping, setHousekeeping] = useState<Record<string, HousekeepingStatus>>({});
  const [createModal, setCreateModal] = useState<{ placeId: string; date: string } | null>(null);

  const days = ZOOM_LEVELS[zoomIdx].days;
  const to = useMemo(() => addDays(from, days), [from, days]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.chessBoard(from, to);
      setData(result);
      const map: Record<string, HousekeepingStatus> = {};
      result.places.forEach((p) => { map[p.id] = p.housekeepingStatus; });
      setHousekeeping(map);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  const dates = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < days; i++) arr.push(addDays(from, i));
    return arr;
  }, [from, days]);

  const handleHKChange = useCallback((placeId: string, status: HousekeepingStatus) => {
    setHousekeeping((prev) => ({ ...prev, [placeId]: status }));
  }, []);

  // Dynamic cell size: fill available width
  // CELL_W: stretch to fill → use flex; CELL_H: fixed
  const CELL_H = days === 1 ? 56 : 44;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Шахматка</h1>
          <p className="text-gray-500 text-sm">Занятость мест по датам</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom */}
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden text-sm">
            {ZOOM_LEVELS.map((z, i) => (
              <button
                key={z.days}
                onClick={() => setZoomIdx(i)}
                className={`px-2.5 py-1.5 transition-colors ${i === zoomIdx ? 'bg-green-700 text-white' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                {z.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200" />

          <button
            onClick={() => setFrom(addDays(from, -days))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >←</button>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={() => setFrom(addDays(from, days))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >→</button>
          <button
            onClick={() => setFrom(today())}
            className="px-3 py-1.5 text-sm bg-green-700 text-white rounded-lg hover:bg-green-600"
          >Сегодня</button>
          <button onClick={load} disabled={loading} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">🔄</button>
          <button
            onClick={() => setCreateModal({ placeId: '', date: from })}
            className="px-3 py-1.5 text-sm bg-green-700 text-white rounded-lg hover:bg-green-600 font-semibold"
          >+ Бронь</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-4 text-xs">
        {Object.entries(STATE_LABELS).filter(([k]) => k !== 'free').map(([state, label]) => {
          const c = BOOKING_COLORS[state];
          return (
            <div key={state} className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ background: c.fill, border: `1px solid ${c.border}` }} />
              <span className="text-gray-600">{label}</span>
            </div>
          );
        })}
        <span className="text-gray-300 mx-1">|</span>
        <span className="text-gray-500 font-medium">Уборка:</span>
        {HK_ORDER.filter((s) => s !== 'unknown').map((s) => {
          const c = HK_CONFIG[s];
          return (
            <span key={s} className="flex items-center gap-1" style={{ color: c.color }}>
              {c.icon} {c.label}
            </span>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">
          {error} <button onClick={load} className="ml-2 underline">Повторить</button>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <span className="animate-spin mr-2">⏳</span> Загружаем данные...
        </div>
      )}

      {data && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {/* Use a table-like flex layout; cells stretch to fill width evenly */}
            <div className="flex flex-col" style={{ minWidth: LABEL_W + 120 }}>

              {/* Date header */}
              <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                <div
                  className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 border-r border-gray-200 flex items-end"
                  style={{ width: LABEL_W }}
                >
                  Место / Уборка
                </div>
                {dates.map((date) => {
                  const { weekday, day, month } = formatDay(date);
                  const isToday = date === today();
                  const weekend = isWeekend(date);
                  return (
                    <div
                      key={date}
                      className={`flex-1 flex flex-col items-center justify-end py-1.5 border-r border-gray-100 text-center min-w-0
                        ${weekend ? 'bg-orange-50' : ''}
                        ${isToday  ? 'bg-green-50' : ''}`}
                    >
                      <span className={`text-xs truncate w-full text-center ${weekend ? 'text-orange-500' : 'text-gray-400'} ${isToday ? 'text-green-600 font-bold' : ''}`}>
                        {weekday}
                      </span>
                      <span className={`text-sm font-bold ${isToday ? 'text-green-700' : 'text-gray-700'}`}>{day}</span>
                      <span className="text-xs text-gray-400">{month}</span>
                    </div>
                  );
                })}
              </div>

              {/* Place rows */}
              {data.places.map((place) => (
                <div key={place.id} className="flex border-b border-gray-100 hover:bg-gray-50/30 group">
                  {/* Label */}
                  <div
                    className="flex-shrink-0 px-2 py-1 flex flex-col justify-center border-r border-gray-200 bg-white"
                    style={{ width: LABEL_W, minHeight: CELL_H }}
                  >
                    <span className="text-sm font-semibold text-gray-800 truncate">{place.code}</span>
                    <span className="text-xs text-gray-400 truncate leading-tight">{place.name}</span>
                    <HKDropdown
                      placeId={place.id}
                      current={housekeeping[place.id] ?? 'unknown'}
                      onChange={handleHKChange}
                    />
                  </div>

                  {/* Day cells — flex-1 so they expand to fill equally */}
                  {dates.map((date) => {
                    const slot = place.slots.find((s) => s.date === date);
                    const state = slot?.state ?? 'free';
                    const isToday = date === today();
                    const clickable = !!slot?.bookingId;

                    const bg = slot ? cellBackground(slot, date) : EMPTY;
                    const colors = BOOKING_COLORS[state] ?? BOOKING_COLORS.free;

                    const isCheckIn  = slot?.bookingStart === date;
                    const isCheckOut = slot?.bookingEnd   === date;
                    // Show icon only on full middle cells
                    const icon = STATE_ICONS[state];
                    const showIcon = icon && !isCheckIn && !isCheckOut;

                    return (
                      <div
                        key={date}
                        className={`flex-1 flex items-center justify-center relative border-r border-gray-100 text-xs font-bold transition-opacity min-w-0
                          ${isToday   ? 'ring-1 ring-inset ring-green-400' : ''}
                          ${clickable ? 'cursor-pointer hover:opacity-75'  : ''}
                          ${state === 'free' ? 'cursor-pointer hover:bg-green-50' : ''}`}
                        style={{ height: CELL_H, background: bg, color: colors.text }}
                        onClick={() => {
                          if (slot && clickable) navigate(`/bookings/${slot.bookingId}`);
                          else if (state === 'free') setCreateModal({ placeId: place.id, date });
                        }}
                        onMouseEnter={(e) => {
                          if (slot && state !== 'free') {
                            setTooltip({ slot, placeName: place.name, date, x: e.clientX, y: e.clientY });
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onMouseMove={(e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                      >
                        {showIcon && <span>{icon}</span>}
                        {isCheckIn && (
                          <span className="absolute bottom-0.5 right-1 text-gray-500" style={{ fontSize: 9 }}>↘{slot?.checkInTime ?? '12:00'}</span>
                        )}
                        {isCheckOut && (
                          <span className="absolute top-0.5 left-1 text-gray-500" style={{ fontSize: 9 }}>↗{slot?.checkOutTime ?? '14:00'}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tooltip && <Tooltip data={tooltip} />}

      <CreateBookingModal
        isOpen={createModal !== null}
        onClose={() => setCreateModal(null)}
        onCreated={() => { setCreateModal(null); void load(); }}
        prefillPlaceId={createModal?.placeId}
        prefillDate={createModal?.date}
      />
    </div>
  );
}
