import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Booking, Place, NotificationLog } from '@/lib/api';

const STATUS_OPTIONS = [
  { value: 'draft',            label: 'Черновик' },
  { value: 'awaiting_payment', label: 'Ожидает оплаты' },
  { value: 'confirmed',        label: 'Подтверждено' },
  { value: 'cancelled',        label: 'Отменено' },
  { value: 'expired',          label: 'Истекло' },
];

const PAYMENT_OPTIONS = [
  { value: 'not_paid', label: 'Не оплачено' },
  { value: 'paid',     label: 'Оплачено' },
  { value: 'refunded', label: 'Возврат' },
];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [checkInTime, setCheckInTime] = useState('12:00');
  const [checkOutTime, setCheckOutTime] = useState('14:00');
  const [savingTimes, setSavingTimes] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [editDates, setEditDates] = useState({ checkIn: '', checkOut: '', guestsCount: 1, placeId: '', totalPrice: '' });
  const [savingDates, setSavingDates] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [notifChannel, setNotifChannel] = useState<'email' | 'sms'>('email');
  const [notifTemplate, setNotifTemplate] = useState<'confirm' | 'reminder' | 'cancel' | 'custom'>('confirm');
  const [notifCustomText, setNotifCustomText] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifResult, setNotifResult] = useState<NotificationLog | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [b, pl] = await Promise.all([api.booking(id), api.adminPlaces()]);
      setBooking(b);
      setPlaces(pl);
      setNote(b.adminNote ?? '');
      setCheckInTime(b.checkInTime ?? '12:00');
      setCheckOutTime(b.checkOutTime ?? '14:00');
      setEditDates({ checkIn: b.checkIn, checkOut: b.checkOut, guestsCount: b.guestsCount, placeId: b.place?.id ?? '', totalPrice: b.totalPrice ?? '' });
      setPaymentStatus(b.paymentStatus);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    setChangingStatus(true);
    try {
      const updated = await api.updateBookingStatus(id, status);
      setBooking(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleSaveDates = async () => {
    if (!id) return;
    setSavingDates(true);
    try {
      const updated = await api.updateBooking(id, {
        checkIn: editDates.checkIn,
        checkOut: editDates.checkOut,
        guestsCount: editDates.guestsCount,
        totalPrice: editDates.totalPrice || undefined,
      });
      setBooking(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSavingDates(false);
    }
  };

  const handleSavePayment = async (val: string) => {
    if (!id) return;
    setPaymentStatus(val);
    setSavingPayment(true);
    try {
      const updated = await api.updateBooking(id, { paymentStatus: val });
      setBooking(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveTimes = async () => {
    if (!id) return;
    setSavingTimes(true);
    try {
      const updated = await api.updateBookingTimes(id, checkInTime, checkOutTime);
      setBooking(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSavingTimes(false);
    }
  };

  const handleDownloadPdf = async (type: 'confirmation' | 'invoice') => {
    if (!id) return;
    setDownloadingPdf(type);
    try {
      const token = localStorage.getItem('access_token');
      const url = api.bookingPdfUrl(id, type);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `booking_${id.slice(0, 8)}_${type}.pdf`;
      link.click();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка загрузки PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleSendNotif = async () => {
    if (!booking || !id) return;
    const recipient = notifChannel === 'email'
      ? (booking.customer?.email ?? '')
      : (booking.customer?.phone ?? '');
    if (!recipient) {
      alert(notifChannel === 'email' ? 'У гостя нет email' : 'У гостя нет телефона');
      return;
    }
    setSendingNotif(true);
    setNotifResult(null);
    try {
      const vars: Record<string, string> = {
        name: booking.customer?.name ?? '',
        booking_id: booking.id.slice(0, 8),
        place: booking.place?.code ?? '',
        check_in: booking.checkIn,
        check_out: booking.checkOut,
        check_in_time: booking.checkInTime ?? '12:00',
        check_out_time: booking.checkOutTime ?? '14:00',
        total_price: booking.totalPrice ?? '',
      };
      const log = await api.sendNotification({
        bookingId: id,
        customerId: booking.customer?.id,
        channel: notifChannel,
        template: notifTemplate,
        recipient,
        vars,
        customText: notifTemplate === 'custom' ? notifCustomText : undefined,
      });
      setNotifResult(log);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setSendingNotif(false);
    }
  };

  const handleSaveNote = async () => {
    if (!id) return;
    setSavingNote(true);
    try {
      const updated = await api.updateBookingNote(id, note);
      setBooking(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        ⏳ Загружаем...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">{error ?? 'Бронирование не найдено'}</p>
        <button onClick={() => navigate('/bookings')} className="text-green-700 underline">
          Вернуться к списку
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Back */}
      <button
        onClick={() => navigate('/bookings')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
      >
        ← Все бронирования
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бронирование</h1>
          <p className="text-gray-500 text-sm font-mono">{booking.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={booking.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={changingStatus}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {changingStatus && <span className="text-gray-400 text-sm">⏳</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Booking info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Детали</h2>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="Место" value={booking.place?.code} />
            <Field label="Гостей" value={booking.guestsCount} />
            <Field label="Заезд" value={`${booking.checkIn} в ${booking.checkInTime ?? '12:00'}`} />
            <Field label="Выезд" value={`${booking.checkOut} в ${booking.checkOutTime ?? '14:00'}`} />
            <Field label="Источник" value={booking.source} />
            <Field
              label="Сумма"
              value={booking.totalPrice ? `${Number(booking.totalPrice).toLocaleString('ru-RU')} ₽` : undefined}
            />
            <Field label="Статус оплаты" value={booking.paymentStatus} />
            <Field label="Создано" value={new Date(booking.createdAt).toLocaleString('ru-RU')} />
          </dl>
          {booking.comment && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Комментарий гостя</p>
              <p className="text-sm text-gray-700">{booking.comment}</p>
            </div>
          )}
        </div>

        {/* Customer info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Гость</h2>
          {booking.customer ? (
            <dl className="grid grid-cols-1 gap-3">
              <Field label="Имя" value={booking.customer.name} />
              <Field label="Телефон" value={
                <a href={`tel:${booking.customer.phone}`} className="text-green-700 hover:underline">
                  {booking.customer.phone}
                </a>
              } />
              <Field label="Email" value={
                booking.customer.email ? (
                  <a href={`mailto:${booking.customer.email}`} className="text-green-700 hover:underline">
                    {booking.customer.email}
                  </a>
                ) : undefined
              } />
              <Field label="Автомобиль" value={booking.customer.carNumber} />
            </dl>
          ) : (
            <p className="text-gray-400 text-sm">Нет данных о госте</p>
          )}
        </div>

        {/* Edit dates / place / guests / price */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Изменить бронирование</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Дата заезда</label>
              <input type="date" value={editDates.checkIn}
                onChange={(e) => setEditDates((f) => ({ ...f, checkIn: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Дата выезда</label>
              <input type="date" value={editDates.checkOut} min={editDates.checkIn}
                onChange={(e) => setEditDates((f) => ({ ...f, checkOut: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Гостей</label>
              <input type="number" min={1} value={editDates.guestsCount}
                onChange={(e) => setEditDates((f) => ({ ...f, guestsCount: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Сумма, ₽</label>
              <input type="number" min={0} value={editDates.totalPrice}
                onChange={(e) => setEditDates((f) => ({ ...f, totalPrice: e.target.value }))}
                placeholder="Авторасчёт"
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          {places.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">Место размещения</label>
              <select value={editDates.placeId}
                onChange={(e) => setEditDates((f) => ({ ...f, placeId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              >
                {places.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={handleSaveDates} disabled={savingDates}
            className="px-4 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {savingDates ? 'Сохраняем...' : 'Сохранить изменения'}
          </button>
        </div>

        {/* Payment status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Статус оплаты</h2>
          <div className="flex flex-wrap gap-3 items-center">
            {PAYMENT_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="paymentStatus" value={o.value}
                  checked={paymentStatus === o.value}
                  onChange={() => handleSavePayment(o.value)}
                  className="accent-green-700"
                  disabled={savingPayment}
                />
                <span className="text-sm text-gray-700">{o.label}</span>
              </label>
            ))}
            {savingPayment && <span className="text-xs text-gray-400">⏳</span>}
          </div>
        </div>

        {/* Time adjustment */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Время заезда / выезда</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Время заезда</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Время выезда</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleSaveTimes}
              disabled={savingTimes || (checkInTime === (booking.checkInTime ?? '12:00') && checkOutTime === (booking.checkOutTime ?? '14:00'))}
              className="px-4 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {savingTimes ? 'Сохраняем...' : 'Сохранить время'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Изменения отразятся в шахматке при следующем обновлении</p>
        </div>

        {/* Admin note */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Заметка администратора</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Внутренние заметки, видны только администраторам..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
          />
          <button
            onClick={handleSaveNote}
            disabled={savingNote || note === (booking.adminNote ?? '')}
            className="mt-2 px-4 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {savingNote ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>

        {/* PDF documents */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Документы</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDownloadPdf('confirmation')}
              disabled={downloadingPdf === 'confirmation'}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {downloadingPdf === 'confirmation' ? '⏳' : '📄'} Подтверждение брони
            </button>
            <button
              onClick={() => handleDownloadPdf('invoice')}
              disabled={downloadingPdf === 'invoice'}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {downloadingPdf === 'invoice' ? '⏳' : '🧾'} Счёт на оплату
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">PDF скачивается сразу — можно распечатать или отправить гостю</p>
        </div>

        {/* Send notification */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Отправить уведомление гостю</h2>
          <div className="flex flex-wrap gap-3 mb-3">
            {/* Channel */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Канал</label>
              <div className="flex gap-2">
                {(['email', 'sms'] as const).map(ch => (
                  <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="notifChannel" value={ch}
                      checked={notifChannel === ch}
                      onChange={() => setNotifChannel(ch)}
                      className="accent-green-700"
                    />
                    <span className="text-sm text-gray-700">{ch === 'email' ? '✉️ Email' : '📱 SMS'}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Template */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Шаблон</label>
              <select
                value={notifTemplate}
                onChange={e => setNotifTemplate(e.target.value as typeof notifTemplate)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="confirm">Подтверждение</option>
                <option value="reminder">Напоминание</option>
                <option value="cancel">Отмена</option>
                <option value="custom">Произвольный</option>
              </select>
            </div>
          </div>

          {notifTemplate === 'custom' && (
            <textarea
              value={notifCustomText}
              onChange={e => setNotifCustomText(e.target.value)}
              rows={3}
              placeholder="Текст сообщения... Используйте {name}, {place}, {check_in} и др."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none mb-3"
            />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSendNotif}
              disabled={sendingNotif}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sendingNotif ? '⏳ Отправляю...' : '📨 Отправить'}
            </button>
            {notifResult && (
              <span className={`text-sm ${notifResult.status === 'sent' ? 'text-green-600' : 'text-red-500'}`}>
                {notifResult.status === 'sent' ? '✓ Отправлено' : `✗ ${notifResult.error ?? 'Ошибка'}`}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Получатель: {notifChannel === 'email'
              ? (booking.customer?.email ?? '— нет email')
              : (booking.customer?.phone ?? '— нет телефона')}
          </p>
        </div>
      </div>
    </div>
  );
}
