import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { WebhookLog } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  ok:        'bg-green-100 text-green-700',
  conflict:  'bg-red-100 text-red-700',
  duplicate: 'bg-yellow-100 text-yellow-700',
  error:     'bg-gray-100 text-gray-600',
  pending:   'bg-blue-100 text-blue-700',
};

const STATUS_LABELS: Record<string, string> = {
  ok:        'Принято',
  conflict:  'Конфликт',
  duplicate: 'Дубль',
  error:     'Ошибка',
  pending:   'Ожидает',
};

const SOURCE_ICONS: Record<string, string> = {
  'booking.com': '🏨',
  avito:         '🅰️',
  generic:       '🔗',
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`text-xs px-2 py-0.5 rounded border transition-colors ${copied ? 'bg-green-100 text-green-700 border-green-300' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
    >
      {copied ? '✓' : 'Копировать'}
    </button>
  );
}

export default function Webhooks() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const load = (pg: number) => {
    setLoading(true);
    api.webhookLogs(pg)
      .then(r => { setLogs(r.items); setTotal(r.total); setPages(r.pages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => { load(page); }, 0);
    return () => clearTimeout(t);
  }, [page]);

  const copyUrl = async (key: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(c => ({ ...c, [key]: true }));
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 1500);
  };

  const genericUrl    = api.webhookGenericUrl();
  const bookingComUrl = api.webhookBookingComUrl();
  const avitoUrl      = api.webhookAvitoUrl();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">OTA Вебхуки</h1>
        <p className="text-gray-500 text-sm mt-1">Входящие бронирования от внешних сервисов и лог событий</p>
      </div>

      {/* Webhook URLs */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Адреса для подключения</h2>
        <p className="text-xs text-gray-500">Передайте эти URL в настройки внешнего сервиса. Код места (placeCode) должен совпадать с кодом в шахматке.</p>

        {[
          {
            key: 'booking-com',
            icon: '🏨',
            label: 'Booking.com',
            url: bookingComUrl,
            method: 'POST',
            format: 'XML (OTA_HotelResNotifRQ)',
            hint: 'Extranet → Настройки → Push-уведомления → URL',
          },
          {
            key: 'avito',
            icon: '🅰️',
            label: 'Авито Путешествия',
            url: avitoUrl,
            method: 'POST',
            format: 'JSON',
            hint: 'Кабинет партнёра → Интеграции → Webhook URL',
          },
          {
            key: 'generic',
            icon: '🔗',
            label: 'Универсальный (JSON)',
            url: genericUrl,
            method: 'POST',
            format: 'JSON { source, placeCode, guestName, checkIn, checkOut, ... }',
            hint: 'Любой сервис / ручное тестирование',
          },
        ].map(({ key, icon, label, url, method, format, hint }) => (
          <div key={key} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span>{icon}</span>
              <span className="font-medium text-gray-800">{label}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">{method}</span>
            </div>
            <div className="flex gap-2 mb-1.5">
              <input readOnly value={url}
                className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-xs font-mono text-gray-600 focus:outline-none" />
              <button
                onClick={() => copyUrl(key, url)}
                className={`px-3 py-1.5 text-xs rounded border transition-colors flex-shrink-0 ${
                  copied[key] ? 'bg-green-100 text-green-700 border-green-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >{copied[key] ? '✓ Скопировано' : 'Копировать'}</button>
            </div>
            <div className="text-xs text-gray-400">Формат: {format}</div>
            <div className="text-xs text-gray-400 mt-0.5">Где указать: {hint}</div>
          </div>
        ))}

        {/* Generic JSON example */}
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Пример JSON для универсального вебхука</summary>
          <pre className="mt-2 bg-gray-50 border border-gray-200 rounded p-3 text-gray-700 overflow-x-auto">
{`{
  "source": "generic",
  "placeCode": "A1",
  "guestName": "Иван Иванов",
  "guestPhone": "+79001234567",
  "guestEmail": "ivan@example.com",
  "checkIn": "2026-07-01",
  "checkOut": "2026-07-05",
  "guestsCount": 2,
  "totalPrice": 12000,
  "notes": "Ранний заезд"
}`}
          </pre>
        </details>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Лог входящих событий
            {total > 0 && <span className="text-gray-400 font-normal text-sm ml-2">({total})</span>}
          </h2>
          <button onClick={() => load(page)} className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-2 py-1 rounded">
            ↻ Обновить
          </button>
        </div>

        {loading && <div className="px-5 py-8 text-center text-gray-400 text-sm">Загружаем...</div>}

        {!loading && logs.length === 0 && (
          <div className="px-5 py-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm">Входящих вебхуков пока нет</p>
            <p className="text-xs mt-1">Подключите OTA-сервис по адресам выше</p>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="divide-y divide-gray-50">
            {logs.map(log => (
              <div key={log.id}>
                <div
                  className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <span className="text-lg flex-shrink-0">{SOURCE_ICONS[log.source] ?? '🔗'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{log.source}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[log.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[log.status] ?? log.status}
                      </span>
                      {log.bookingId && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/bookings/${log.bookingId}`); }}
                          className="text-xs text-green-700 hover:underline"
                        >
                          Бронь #{log.bookingId.slice(0, 8)}
                        </button>
                      )}
                    </div>
                    {log.error && (
                      <div className="text-xs text-red-600 mt-0.5 truncate">{log.error}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                    {new Date(log.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <span className="text-gray-300 text-xs">{expanded === log.id ? '▲' : '▼'}</span>
                </div>

                {expanded === log.id && log.rawPayload && (
                  <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2 pt-3">
                      <span className="text-xs font-medium text-gray-500">Сырой payload</span>
                      <CopyButton value={log.rawPayload} />
                    </div>
                    <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded p-3 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                      {log.rawPayload}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="text-xs px-3 py-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">
              ← Назад
            </button>
            <span className="text-xs text-gray-500">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
              className="text-xs px-3 py-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">
              Вперёд →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
