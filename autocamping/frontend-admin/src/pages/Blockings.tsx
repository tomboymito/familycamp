import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '@/lib/api';
import type { Blocking, Place } from '@/lib/api';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function Blockings() {
  const [blockings, setBlockings] = useState<Blocking[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ placeId: '', dateFrom: today(), dateTo: tomorrow(), reason: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bl, pl] = await Promise.all([api.blockings(), api.places()]);
      setBlockings(bl);
      setPlaces(pl);
      if (!form.placeId && pl.length > 0) setForm((f) => ({ ...f, placeId: pl[0].id }));
    } catch {/* keep */} finally {
      setLoading(false);
    }
  }, [form.placeId]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.placeId || form.dateFrom >= form.dateTo) return;
    setSaving(true);
    try {
      const created = await api.createBlocking({
        placeId: form.placeId,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        reason: form.reason || undefined,
      });
      setBlockings((prev) => [created, ...prev]);
      setShowForm(false);
      setForm((f) => ({ ...f, reason: '', dateFrom: today(), dateTo: tomorrow() }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить блокировку?')) return;
    setDeleting(id);
    try {
      await api.deleteBlocking(id);
      setBlockings((prev) => prev.filter((b) => b.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setDeleting(null);
    }
  };

  const placeMap = new Map(places.map((p) => [p.id, p]));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Блокировки</h1>
          <p className="text-gray-500 text-sm">Закрытые даты для технических работ</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors"
        >
          + Добавить
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-4">Новая блокировка</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Место *</label>
              <select
                value={form.placeId}
                onChange={(e) => setForm((f) => ({ ...f, placeId: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              >
                {places.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Причина</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Техническое обслуживание"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">С (включительно) *</label>
              <input
                type="date"
                value={form.dateFrom}
                onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">По (не включая) *</label>
              <input
                type="date"
                value={form.dateTo}
                min={form.dateFrom}
                onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || !form.placeId || form.dateFrom >= form.dateTo}
              className="px-4 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {saving ? 'Сохраняем...' : 'Создать'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">⏳ Загружаем...</div>
        )}
        {!loading && blockings.length === 0 && (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
            Блокировок нет
          </div>
        )}
        {!loading && blockings.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Место</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">С</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">По</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Причина</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {blockings.map((bl) => {
                const place = placeMap.get(bl.placeId) ?? bl.place;
                const isPast = bl.dateTo < today();
                return (
                  <tr key={bl.id} className={`border-b border-gray-100 ${isPast ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {place ? `${(place as Place).code ?? ''} — ${(place as Place).name}` : bl.placeId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{bl.dateFrom}</td>
                    <td className="px-4 py-3 text-gray-700">{bl.dateTo}</td>
                    <td className="px-4 py-3 text-gray-500">{bl.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(bl.id)}
                        disabled={deleting === bl.id}
                        className="text-red-500 hover:text-red-700 text-xs disabled:opacity-40"
                      >
                        {deleting === bl.id ? '⏳' : 'Удалить'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
