import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Customer, Place } from '@/lib/api';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Pre-fill from chess board click */
  prefillPlaceId?: string;
  prefillDate?: string;
}

const SOURCES = [
  { value: 'phone',       label: '📞 Звонок' },
  { value: 'website',     label: '🌐 Сайт' },
  { value: 'walk_in',     label: '🚶 Walk-in' },
  { value: 'booking.com', label: '🏨 Booking.com' },
  { value: 'avito',       label: '🅰️ Avito' },
  { value: 'whatsapp',    label: '💬 WhatsApp' },
  { value: 'admin',       label: '👤 Другое' },
];

const PAYMENT_STATUSES = [
  { value: 'not_paid', label: 'Не оплачено' },
  { value: 'paid',     label: 'Оплачено (наличные/карта)' },
];

export default function CreateBookingModal({ isOpen, onClose, onCreated, prefillPlaceId, prefillDate }: Props) {
  const today = localDateStr(new Date());
  const tomorrow = localDateStr(new Date(Date.now() + 86400000));

  const [places, setPlaces] = useState<Place[]>([]);
  const [form, setForm] = useState({
    placeId:       prefillPlaceId ?? '',
    checkIn:       prefillDate    ?? today,
    checkOut:      prefillDate ? localDateStr(new Date(prefillDate + 'T00:00:00').setDate(new Date(prefillDate + 'T00:00:00').getDate() + 1) as unknown as Date) : tomorrow,
    checkInTime:   '12:00',
    checkOutTime:  '14:00',
    guestsCount:   2,
    source:        'phone',
    paymentStatus: 'not_paid',
    adminNote:     '',
    totalPrice:    '',    // will be auto-calculated but can be overridden
  });
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', carNumber: '' });
  const [searchLoading, setSearchLoading] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load places once
  useEffect(() => {
    api.adminPlaces().then(setPlaces).catch(() => {});
  }, []);

  // Sync prefill
  useEffect(() => {
    if (prefillPlaceId) setForm((f) => ({ ...f, placeId: prefillPlaceId }));
    if (prefillDate) {
      const next = new Date(prefillDate + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      setForm((f) => ({ ...f, checkIn: prefillDate, checkOut: localDateStr(next) }));
    }
  }, [prefillPlaceId, prefillDate]);

  // Auto-calculate price when place/dates change
  useEffect(() => {
    if (!form.placeId || !form.checkIn || !form.checkOut || form.checkIn >= form.checkOut) {
      setCalculatedPrice(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await api.pricingCalculate({
          placeId: form.placeId,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guestsCount: form.guestsCount,
        });
        setCalculatedPrice(result.total);
        setForm((f) => ({ ...f, totalPrice: String(result.total) }));
      } catch {
        setCalculatedPrice(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.placeId, form.checkIn, form.checkOut, form.guestsCount]);

  // Customer search with debounce
  const handleCustomerSearch = useCallback((q: string) => {
    setCustomerQuery(q);
    setSelectedCustomer(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.length < 2) { setCustomerResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await api.searchCustomers(q);
        setCustomerResults(results);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', carNumber: c.carNumber ?? '' });
    setCustomerQuery(c.name);
    setCustomerResults([]);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.placeId) { setError('Выберите место'); return; }
    if (!form.checkIn || !form.checkOut || form.checkIn >= form.checkOut) { setError('Проверьте даты'); return; }
    if (!customerForm.name.trim() || !customerForm.phone.trim()) { setError('Укажите имя и телефон гостя'); return; }

    setSaving(true);
    try {
      await api.createAdminBooking({
        placeId:       form.placeId,
        checkIn:       form.checkIn,
        checkOut:      form.checkOut,
        checkInTime:   form.checkInTime,
        checkOutTime:  form.checkOutTime,
        guestsCount:   form.guestsCount,
        source:        form.source,
        adminNote:     form.adminNote || undefined,
        customer: {
          name:      customerForm.name.trim(),
          phone:     customerForm.phone.trim(),
          email:     customerForm.email.trim() || undefined,
          carNumber: customerForm.carNumber.trim() || undefined,
        },
        paymentStatus: form.paymentStatus,
      });
      onCreated();
      handleClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка при создании');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm({ placeId: '', checkIn: today, checkOut: tomorrow, checkInTime: '12:00', checkOutTime: '14:00', guestsCount: 2, source: 'phone', paymentStatus: 'not_paid', adminNote: '', totalPrice: '' });
    setCustomerQuery('');
    setCustomerResults([]);
    setSelectedCustomer(null);
    setCustomerForm({ name: '', phone: '', email: '', carNumber: '' });
    setCalculatedPrice(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const selectedPlace = places.find((p) => p.id === form.placeId);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
          <h2 className="font-bold text-lg text-gray-900">Новое бронирование</h2>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Place */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Место размещения *</label>
            <select
              value={form.placeId}
              onChange={(e) => setForm((f) => ({ ...f, placeId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">— выберите место —</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name} (до {p.capacity} чел.)
                </option>
              ))}
            </select>
          </div>

          {/* Dates + times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Дата заезда *</label>
              <input type="date" value={form.checkIn}
                onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Дата выезда *</label>
              <input type="date" value={form.checkOut} min={form.checkIn}
                onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Время заезда</label>
              <input type="time" value={form.checkInTime}
                onChange={(e) => setForm((f) => ({ ...f, checkInTime: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Время выезда</label>
              <input type="time" value={form.checkOutTime}
                onChange={(e) => setForm((f) => ({ ...f, checkOutTime: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Guests + source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Гостей</label>
              <input type="number" min={1} max={selectedPlace?.capacity ?? 20} value={form.guestsCount}
                onChange={(e) => setForm((f) => ({ ...f, guestsCount: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Источник</label>
              <select value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              >
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Сумма, ₽
              {calculatedPrice !== null && (
                <span className="ml-2 text-green-700">(авторасчёт: {calculatedPrice.toLocaleString('ru-RU')} ₽)</span>
              )}
            </label>
            <input type="number" min={0} value={form.totalPrice}
              onChange={(e) => setForm((f) => ({ ...f, totalPrice: e.target.value }))}
              placeholder="Введите или оставьте по расчёту"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Payment */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Статус оплаты</label>
            <div className="flex gap-3">
              {PAYMENT_STATUSES.map((s) => (
                <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="paymentStatus" value={s.value}
                    checked={form.paymentStatus === s.value}
                    onChange={() => setForm((f) => ({ ...f, paymentStatus: s.value }))}
                    className="accent-green-700"
                  />
                  <span className="text-sm text-gray-700">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Guest search */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Гость *</label>
            <div className="relative mb-3">
              <input
                type="text"
                value={customerQuery}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                placeholder="Поиск по имени или телефону..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
              {searchLoading && (
                <span className="absolute right-3 top-2.5 text-gray-400 text-xs">⏳</span>
              )}
              {customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button key={c.id} onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors text-sm border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="text-gray-400 ml-2">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800 mb-3">
                ✓ Выбран существующий гость: {selectedCustomer.name} ({selectedCustomer.phone})
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Имя *</label>
                <input type="text" value={customerForm.name}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Иван Петров"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Телефон *</label>
                <input type="tel" value={customerForm.phone}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 900 000 00 00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input type="email" value={customerForm.email}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="example@mail.ru"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Автомобиль</label>
                <input type="text" value={customerForm.carNumber}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, carNumber: e.target.value }))}
                  placeholder="А123ВС77"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Admin note */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Заметка администратора</label>
            <textarea rows={2} value={form.adminNote}
              onChange={(e) => setForm((f) => ({ ...f, adminNote: e.target.value }))}
              placeholder="Внутренние пометки..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              Отмена
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors">
              {saving ? '⏳ Создаём...' : 'Создать бронирование'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
