'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, AvailablePlace, Hold, PriceCalculation } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

interface DateForm {
  checkIn: string;
  checkOut: string;
  guests: number;
}

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  carNumber: string;
  comment: string;
}

type ModalState = 'idle' | 'loading' | 'success' | 'error' | 'hold_expired';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function today() {
  return localDateStr(new Date());
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDateStr(d);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Mini-map: camp layout ────────────────────────────────────────────────

const PLACE_LAYOUT = [
  { code: 'A1', x: 1, y: 1, type: 'pitch' },
  { code: 'A2', x: 2, y: 1, type: 'pitch' },
  { code: 'A3', x: 3, y: 1, type: 'pitch' },
  { code: 'A4', x: 4, y: 1, type: 'pitch' },
  { code: 'B1', x: 1, y: 3, type: 'tent' },
  { code: 'B2', x: 2, y: 3, type: 'tent' },
  { code: 'B3', x: 3, y: 3, type: 'tent' },
  { code: 'B4', x: 4, y: 3, type: 'tent' },
  { code: 'C1', x: 1, y: 5, type: 'cabin' },
  { code: 'C2', x: 3, y: 5, type: 'cabin' },
];

const TYPE_ICON: Record<string, string> = { pitch: '🚗', tent: '⛺', cabin: '🏠' };
const TYPE_LABEL: Record<string, string> = { pitch: 'Автопитч', tent: 'Палатка', cabin: 'Домик' };

// ─── Step components ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = ['Даты', 'Место', 'Цена', 'Данные', 'Готово'];
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center gap-1 flex-1 min-w-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${done ? 'bg-green-600 text-white' : active ? 'bg-green-dark text-white' : 'bg-gray-100 text-gray-400'}`}
            >
              {done ? '✓' : n}
            </div>
            <span className={`text-xs hidden sm:block ${active ? 'text-green-dark font-semibold' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < 4 && <div className={`flex-1 h-0.5 mx-1 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

// Step 1 — Date + guests
function Step1Dates({
  form,
  onChange,
  onNext,
  loading,
  error,
}: {
  form: DateForm;
  onChange: (f: DateForm) => void;
  onNext: () => void;
  loading: boolean;
  error: string | null;
}) {
  const isValid = form.checkIn && form.checkOut && form.checkIn < form.checkOut;
  return (
    <div>
      <h3 className="text-xl font-bold text-green-dark mb-6">Выберите даты и количество гостей</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Дата заезда</label>
          <input
            type="date"
            min={today()}
            value={form.checkIn}
            onChange={(e) => onChange({ ...form, checkIn: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Дата выезда</label>
          <input
            type="date"
            min={form.checkIn || tomorrow()}
            value={form.checkOut}
            onChange={(e) => onChange({ ...form, checkOut: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Количество гостей</label>
        <select
          value={form.guests}
          onChange={(e) => onChange({ ...form, guests: Number(e.target.value) })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
        >
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? 'гость' : n < 5 ? 'гостя' : 'гостей'}</option>
          ))}
        </select>
      </div>
      {form.checkIn && form.checkOut && form.checkIn >= form.checkOut && (
        <p className="text-red-500 text-sm mb-4">Дата выезда должна быть позже даты заезда</p>
      )}
      {error && (
        <p className="text-red-500 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        onClick={onNext}
        disabled={!isValid || loading}
        className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? '⏳ Проверяем доступность...' : 'Проверить доступность →'}
      </button>
    </div>
  );
}

// Step 2 — Place selection (mini-map)
function Step2Place({
  dates,
  availablePlaces,
  loading,
  selectedPlaceId,
  onSelect,
  onNext,
  onBack,
}: {
  dates: DateForm;
  availablePlaces: AvailablePlace[];
  loading: boolean;
  selectedPlaceId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const availableIds = new Set(availablePlaces.map((p) => p.id));

  return (
    <div>
      <h3 className="text-xl font-bold text-green-dark mb-1">Выберите место</h3>
      <p className="text-sm text-gray-500 mb-4">
        {formatDate(dates.checkIn)} → {formatDate(dates.checkOut)} · {dates.guests} гост.
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <span className="animate-spin mr-2">⏳</span> Проверяем доступность...
        </div>
      ) : availablePlaces.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">😔</div>
          <p className="text-gray-700 font-medium mb-1">На эти даты нет доступных мест</p>
          <p className="text-gray-500 text-sm">Попробуйте другие даты</p>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400" /> Свободно</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-300" /> Бронь-холд</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-300" /> Занято</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border-2 border-green-600 bg-green-100" /> Выбрано</div>
          </div>

          {/* Grid map */}
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
            {/* Row labels */}
            <div className="text-xs text-gray-500 mb-2 font-medium">Схема кемпинга</div>
            <div className="relative" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {PLACE_LAYOUT.map((layout) => {
                const place = availablePlaces.find((p) => p.code === layout.code);
                const isAvailable = !!place;
                const isSelected = place?.id === selectedPlaceId;
                const isHold = place?.state === 'hold';

                let bg = 'bg-red-100 border-red-200 text-red-400 cursor-not-allowed';
                if (isAvailable && isHold) bg = 'bg-amber-100 border-amber-200 text-amber-700 cursor-pointer';
                if (isAvailable && !isHold) bg = 'bg-green-100 border-green-200 text-green-700 cursor-pointer hover:bg-green-200';
                if (isSelected) bg = 'bg-green-600 border-green-700 text-white cursor-pointer';

                return (
                  <button
                    key={layout.code}
                    onClick={() => place && onSelect(place.id)}
                    disabled={!isAvailable || isHold}
                    title={place ? `${place.name} · вместимость: ${place.capacity}` : layout.code + ' — занято'}
                    className={`border-2 rounded-xl p-2 text-center transition-all ${bg}`}
                  >
                    <div className="text-lg">{TYPE_ICON[layout.type]}</div>
                    <div className="text-xs font-bold mt-0.5">{layout.code}</div>
                  </button>
                );
              })}
            </div>
            {/* Type labels below map */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <span key={k}>{TYPE_ICON[k]} {v}</span>
              ))}
            </div>
          </div>

          {/* Selected place details */}
          {selectedPlaceId && (() => {
            const p = availablePlaces.find((pl) => pl.id === selectedPlaceId);
            if (!p) return null;
            return (
              <div className="bg-white border border-green-200 rounded-xl p-3 mb-4 text-sm">
                <span className="font-semibold text-green-dark">{p.name}</span>
                {' · '}вместимость: {p.capacity} чел.
                {p.hasElectricity && ' · ⚡ электричество'}
                {p.hasWater && ' · 💧 вода'}
              </div>
            );
          })()}
        </>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={onBack} className="btn-secondary flex-1">← Назад</button>
        <button
          onClick={onNext}
          disabled={!selectedPlaceId}
          className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Далее →
        </button>
      </div>
    </div>
  );
}

// Step 3 — Price display
function Step3Price({
  dates,
  selectedPlace,
  pricing,
  loading,
  onNext,
  onBack,
}: {
  dates: DateForm;
  selectedPlace: AvailablePlace | null;
  pricing: PriceCalculation | null;
  loading: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h3 className="text-xl font-bold text-green-dark mb-1">Ваше бронирование</h3>
      <p className="text-sm text-gray-500 mb-6">Проверьте детали перед оплатой</p>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400">
          <span className="animate-spin mr-2">⏳</span> Рассчитываем стоимость...
        </div>
      ) : (
        <div className="space-y-4">
          {selectedPlace && (
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-green-dark">{selectedPlace.name}</p>
                  <p className="text-sm text-gray-600">{selectedPlace.type?.name}</p>
                </div>
                <span className="text-2xl">{TYPE_ICON[selectedPlace.type?.slug ?? 'pitch']}</span>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Заезд</span>
              <span className="font-medium">{formatDate(dates.checkIn)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Выезд</span>
              <span className="font-medium">{formatDate(dates.checkOut)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Гостей</span>
              <span className="font-medium">{dates.guests}</span>
            </div>
            {pricing && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ночей</span>
                  <span className="font-medium">{pricing.nights}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Цена за ночь</span>
                  <span className="font-medium">{pricing.pricePerNight.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{pricing.seasonLabel}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold text-green-dark">
                  <span>Итого</span>
                  <span>{pricing.total.toLocaleString('ru-RU')} ₽</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="btn-secondary flex-1">← Назад</button>
        <button
          onClick={onNext}
          disabled={loading || !pricing}
          className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Заполнить данные →
        </button>
      </div>
    </div>
  );
}

// Step 4 — Customer form
function Step4Customer({
  form,
  onChange,
  onNext,
  onBack,
  loading,
}: {
  form: CustomerForm;
  onChange: (f: CustomerForm) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const isValid = form.name.trim().length > 1 && form.phone.trim().length > 6;
  return (
    <div>
      <h3 className="text-xl font-bold text-green-dark mb-1">Ваши данные</h3>
      <p className="text-sm text-gray-500 mb-6">Нужны для связи и оформления бронирования</p>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Имя и фамилия *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Иван Петров"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Телефон *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => onChange({ ...form, phone: e.target.value })}
            placeholder="+7 (900) 123-45-67"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            placeholder="ivan@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Номер автомобиля</label>
          <input
            type="text"
            value={form.carNumber}
            onChange={(e) => onChange({ ...form, carNumber: e.target.value })}
            placeholder="А123ВС77"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
          <textarea
            value={form.comment}
            onChange={(e) => onChange({ ...form, comment: e.target.value })}
            placeholder="Особые пожелания, время заезда и т.д."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} disabled={loading} className="btn-secondary flex-1">← Назад</button>
        <button
          onClick={onNext}
          disabled={!isValid || loading}
          className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Обрабатываем...' : 'Забронировать →'}
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center mt-3">
        Место будет зарезервировано на 15 минут. Нажимая кнопку, вы соглашаетесь с правилами кемпинга.
      </p>
    </div>
  );
}

// Step 5 — Success / Error / Hold expired
function Step5Result({
  state,
  paymentUrl,
  bookingId,
  error,
  onClose,
  onRetry,
}: {
  state: ModalState;
  paymentUrl: string | null;
  bookingId: string | null;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  if (state === 'success') {
    return (
      <div className="text-center py-4">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold text-green-dark mb-2">Бронирование подтверждено!</h3>
        <p className="text-gray-600 mb-2">
          Номер бронирования: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono">{bookingId?.slice(0, 8)}</code>
        </p>
        <p className="text-gray-600 mb-6 text-sm">Мы отправим подтверждение на ваш email и позвоним перед заездом.</p>
        {paymentUrl && (
          <a href={paymentUrl} className="btn-primary block mb-3">
            Оплатить онлайн
          </a>
        )}
        <button onClick={onClose} className="btn-secondary w-full">Закрыть</button>
      </div>
    );
  }

  if (state === 'hold_expired') {
    return (
      <div className="text-center py-4">
        <div className="text-6xl mb-4">⏰</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Время резервации истекло</h3>
        <p className="text-gray-600 mb-6 text-sm">К сожалению, 15 минут прошло и место было освобождено. Попробуйте снова.</p>
        <button onClick={onRetry} className="btn-primary w-full mb-3">Попробовать снова</button>
        <button onClick={onClose} className="btn-secondary w-full">Закрыть</button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="text-center py-4">
        <div className="text-6xl mb-4">😔</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Что-то пошло не так</h3>
        <p className="text-gray-600 mb-6 text-sm">{error ?? 'Произошла ошибка. Попробуйте ещё раз или свяжитесь с нами.'}</p>
        <button onClick={onRetry} className="btn-primary w-full mb-3">Попробовать снова</button>
        <button onClick={onClose} className="btn-secondary w-full">Закрыть</button>
      </div>
    );
  }

  return null;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dates, setDates] = useState<DateForm>({ checkIn: '', checkOut: '', guests: 2 });
  const handleDatesChange = useCallback((f: DateForm) => { setDates(f); setError(null); }, []);
  const [availablePlaces, setAvailablePlaces] = useState<AvailablePlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PriceCalculation | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerForm>({ name: '', phone: '', email: '', carNumber: '', comment: '' });

  const selectedPlace = availablePlaces.find((p) => p.id === selectedPlaceId) ?? null;

  const reset = useCallback(() => {
    setStep(1);
    setModalState('idle');
    setLoading(false);
    setError(null);
    setDates({ checkIn: '', checkOut: '', guests: 2 });
    setAvailablePlaces([]);
    setSelectedPlaceId(null);
    setPricing(null);
    setHold(null);
    setBookingId(null);
    setPaymentUrl(null);
    setCustomer({ name: '', phone: '', email: '', carNumber: '', comment: '' });
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Cancel hold on close if not booked
  const handleClose = useCallback(() => {
    if (hold && !bookingId) {
      api.cancelHold(hold.sessionToken).catch(() => {/* best effort */});
    }
    reset();
    onClose();
  }, [hold, bookingId, reset, onClose]);

  // Step 1 → 2: load availability
  const handleStep1Next = useCallback(async () => {
    setLoading(true);
    try {
      const places = await api.availability(dates.checkIn, dates.checkOut, undefined, dates.guests);
      setAvailablePlaces(places);
      setStep(2);
    } catch {
      setError('Не удалось проверить доступность. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [dates]);

  // Step 2 → 3: calculate price
  const handleStep2Next = useCallback(async () => {
    if (!selectedPlaceId) return;
    setLoading(true);
    setPricing(null);
    try {
      const price = await api.pricing(selectedPlaceId, dates.checkIn, dates.checkOut, dates.guests);
      setPricing(price);
      setStep(3);
    } catch {
      setError('Ошибка расчёта цены. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlaceId, dates]);

  // Step 3 → 4
  const handleStep3Next = useCallback(() => setStep(4), []);

  // Step 4 → 5: create hold + booking + initiate payment
  const handleStep4Next = useCallback(async () => {
    if (!selectedPlaceId) return;
    setLoading(true);
    setError(null);
    try {
      // Create hold
      const newHold = await api.createHold(selectedPlaceId, dates.checkIn, dates.checkOut, dates.guests);
      setHold(newHold);

      // Create booking from hold
      const booking = await api.createBooking(
        newHold.sessionToken,
        { name: customer.name, phone: customer.phone, email: customer.email || undefined, carNumber: customer.carNumber || undefined },
        customer.comment || undefined,
      );
      setBookingId(booking.id);

      // Initiate payment
      try {
        const payment = await api.initiatePayment(booking.id);
        setPaymentUrl(payment.redirectUrl);
      } catch {
        // Payment initiation optional; booking is created
      }

      setModalState('success');
      setStep(5);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.status === 409) {
        setError('Место только что заняли. Попробуйте выбрать другое.');
      } else if (e.status === 410) {
        setModalState('hold_expired');
        setStep(5);
      } else {
        setError(e.message ?? 'Произошла ошибка');
        setModalState('error');
        setStep(5);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPlaceId, dates, customer]);

  if (!isOpen) return null;

  const isStep5 = step === 5;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
          <h2 className="font-bold text-lg text-green-dark">Бронирование</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {!isStep5 && <StepIndicator current={step} />}

          {step === 1 && (
            <Step1Dates form={dates} onChange={handleDatesChange} onNext={handleStep1Next} loading={loading} error={error} />
          )}

          {step === 2 && (
            <Step2Place
              dates={dates}
              availablePlaces={availablePlaces}
              loading={loading}
              selectedPlaceId={selectedPlaceId}
              onSelect={setSelectedPlaceId}
              onNext={handleStep2Next}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <Step3Price
              dates={dates}
              selectedPlace={selectedPlace}
              pricing={pricing}
              loading={loading}
              onNext={handleStep3Next}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <Step4Customer
              form={customer}
              onChange={setCustomer}
              onNext={handleStep4Next}
              onBack={() => setStep(3)}
              loading={loading}
            />
          )}

          {step === 5 && (
            <Step5Result
              state={modalState}
              paymentUrl={paymentUrl}
              bookingId={bookingId}
              error={error}
              onClose={handleClose}
              onRetry={reset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
