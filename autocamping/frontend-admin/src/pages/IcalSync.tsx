import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Place } from '@/lib/api';

interface ImportResult {
  placeId: string;
  created: number;
  skipped: number;
  error?: string;
}

export default function IcalSync() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Import state per place
  const [importUrls, setImportUrls] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ImportResult>>({});

  useEffect(() => {
    api.adminPlaces()
      .then(setPlaces)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const copyLink = async (placeId: string) => {
    const url = api.icalFeedUrl(placeId);
    await navigator.clipboard.writeText(url);
    setCopied(placeId);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleImport = async (placeId: string) => {
    const url = importUrls[placeId]?.trim();
    if (!url) return;
    setImporting(placeId);
    setResults(r => { const n = { ...r }; delete n[placeId]; return n; });
    try {
      const res = await api.icalImport(placeId, url);
      setResults(r => ({ ...r, [placeId]: { placeId, ...res } }));
    } catch (e: unknown) {
      setResults(r => ({ ...r, [placeId]: { placeId, created: 0, skipped: 0, error: e instanceof Error ? e.message : 'Ошибка' } }));
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Синхронизация iCal</h1>
        <p className="text-gray-500 text-sm mt-1">
          Экспортируйте ссылку и подключите к Airbnb / Booking.com / ЦИАН / Google Calendar.
          Импортируйте внешний календарь — занятые даты превратятся в блокировки.
        </p>
      </div>

      {/* How-to */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">Как подключить к Airbnb / Booking.com:</p>
        <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
          <li>Скопируйте ссылку нужного места (кнопка ниже)</li>
          <li>В Airbnb: <strong>Календарь → Доступность → Синхронизация</strong> → вставьте ссылку</li>
          <li>В Booking.com: <strong>Ставки и доступность → iCal</strong> → «Импортировать календарь»</li>
        </ol>
        <p className="font-semibold mt-2">Как импортировать из внешнего сервиса:</p>
        <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
          <li>Возьмите ссылку экспорта из Airbnb/Booking.com (формат .ics)</li>
          <li>Вставьте в поле «URL для импорта» нужного места и нажмите «Импортировать»</li>
          <li>Занятые даты добавятся как блокировки в шахматку</li>
        </ol>
      </div>

      {loading && <div className="text-gray-400 text-sm">Загружаем места...</div>}

      <div className="space-y-4">
        {places.map(place => {
          const feedUrl = api.icalFeedUrl(place.id);
          const result  = results[place.id];
          const isImporting = importing === place.id;

          return (
            <div key={place.id} className="bg-white rounded-xl border border-gray-200 p-5">
              {/* Place header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center font-bold text-green-700 text-sm">
                  {place.code}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{place.name}</div>
                  <div className="text-xs text-gray-400">{place.accommodationType?.name ?? '—'} · {place.capacity} чел.</div>
                </div>
              </div>

              {/* Export */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  📤 Ссылка для экспорта (скопируйте в Airbnb / Booking.com)
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={feedUrl}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => copyLink(place.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex-shrink-0 ${
                      copied === place.id
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {copied === place.id ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
              </div>

              {/* Import */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  📥 URL для импорта (из Airbnb / Booking.com / другого сервиса)
                </label>
                <div className="flex gap-2">
                  <input
                    value={importUrls[place.id] ?? ''}
                    onChange={e => setImportUrls(u => ({ ...u, [place.id]: e.target.value }))}
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={() => handleImport(place.id)}
                    disabled={!importUrls[place.id]?.trim() || isImporting}
                    className="px-3 py-1.5 text-sm bg-green-700 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {isImporting ? '⏳' : 'Импортировать'}
                  </button>
                </div>

                {result && (
                  <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {result.error
                      ? `✗ Ошибка: ${result.error}`
                      : `✓ Создано блокировок: ${result.created}, пропущено (дубли): ${result.skipped}`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
