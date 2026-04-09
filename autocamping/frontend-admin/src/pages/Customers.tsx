import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { CustomerDetail, CustomerListResult } from '@/lib/api';

const TAGS = ['VIP', 'постоянный', 'проблемный', 'корпоративный'];

const TAG_COLORS: Record<string, string> = {
  VIP: 'bg-yellow-100 text-yellow-800',
  постоянный: 'bg-green-100 text-green-800',
  проблемный: 'bg-red-100 text-red-800',
  корпоративный: 'bg-blue-100 text-blue-800',
};

function tagColor(tag: string) {
  return TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-700';
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    awaiting_payment: 'bg-yellow-100 text-yellow-800',
    draft: 'bg-gray-100 text-gray-600',
    expired: 'bg-gray-100 text-gray-400',
  };
  const labels: Record<string, string> = {
    confirmed: 'Подтверждено',
    cancelled: 'Отменено',
    awaiting_payment: 'Ожидает оплаты',
    draft: 'Черновик',
    expired: 'Истекло',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const [result, setResult] = useState<CustomerListResult | null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string; phone: string; email: string; carNumber: string; notes: string; tags: string[];
  }>({ name: '', phone: '', email: '', carNumber: '', notes: '', tags: [] });
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = (qVal: string, tagVal: string, pg: number) => {
    setLoading(true);
    api.customers({ q: qVal || undefined, tag: tagVal || undefined, page: pg, limit: 25 })
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(debouncedQ, activeTag, page);
  }, [debouncedQ, activeTag, page]);

  const handleSearch = (val: string) => {
    setQ(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedQ(val);
      setPage(1);
    }, 300);
  };

  const handleTag = (tag: string) => {
    const next = activeTag === tag ? '' : tag;
    setActiveTag(next);
    setPage(1);
  };

  const handlePage = (pg: number) => {
    setPage(pg);
  };

  const openCustomer = async (id: string) => {
    setLoadingDetail(true);
    setEditing(false);
    try {
      const c = await api.customer(id);
      setSelected(c);
      setEditForm({
        name: c.name,
        phone: c.phone ?? '',
        email: c.email ?? '',
        carNumber: c.carNumber ?? '',
        notes: c.notes ?? '',
        tags: c.tags ?? [],
      });
    } catch (e) { console.error(e); }
    finally { setLoadingDetail(false); }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await api.updateCustomer(selected.id, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email || undefined,
        carNumber: editForm.carNumber || undefined,
        notes: editForm.notes || undefined,
        tags: editForm.tags,
      });
      setSelected(updated);
      setEditing(false);
      load(debouncedQ, activeTag, page);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const toggleTag = (tag: string) => {
    setEditForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  return (
    <div className="flex gap-4 h-full min-h-0" style={{ height: 'calc(100vh - 88px)' }}>
      {/* Left panel — list */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-gray-100">
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Имя, телефон или email..."
            value={q}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {/* Tag filter */}
        <div className="px-3 py-2 border-b border-gray-100 flex flex-wrap gap-1.5">
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => handleTag(tag)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                activeTag === tag
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-200 text-gray-600 hover:border-green-400'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-4 text-sm text-gray-500 text-center">Загрузка...</div>}
          {!loading && result?.items.length === 0 && (
            <div className="p-4 text-sm text-gray-400 text-center">Клиентов не найдено</div>
          )}
          {result?.items.map(c => (
            <button
              key={c.id}
              onClick={() => openCustomer(c.id)}
              className={`w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected?.id === c.id ? 'bg-green-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{c.name}</div>
                  <div className="text-xs text-gray-500 truncate">{c.phone}</div>
                  {c.email && <div className="text-xs text-gray-400 truncate">{c.email}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-500">{c.bookingsCount ?? 0} бр.</div>
                  {(c.totalSpend ?? 0) > 0 && (
                    <div className="text-xs text-green-700 font-medium">
                      {(c.totalSpend ?? 0).toLocaleString('ru-RU')} ₽
                    </div>
                  )}
                </div>
              </div>
              {c.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {c.tags.map(t => (
                    <span key={t} className={`text-xs px-1.5 py-0.5 rounded-full ${tagColor(t)}`}>{t}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Pagination */}
        {result && result.pages > 1 && (
          <div className="p-2 border-t border-gray-100 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => handlePage(page - 1)}
              className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40"
            >← Назад</button>
            <span className="text-xs text-gray-500">{page} / {result.pages}</span>
            <button
              disabled={page >= result.pages}
              onClick={() => handlePage(page + 1)}
              className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40"
            >Вперёд →</button>
          </div>
        )}
      </div>

      {/* Right panel — detail */}
      <div className="flex-1 overflow-y-auto">
        {loadingDetail && (
          <div className="flex items-center justify-center h-full text-gray-400">Загрузка...</div>
        )}
        {!loadingDetail && !selected && (
          <div className="flex items-center justify-center h-full text-gray-400">
            Выберите клиента из списка
          </div>
        )}
        {!loadingDetail && selected && (
          <div className="space-y-4">
            {/* Header card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  {editing ? (
                    <input
                      className="text-xl font-bold border-b border-gray-300 focus:outline-none focus:border-green-500 mb-1"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(editing ? editForm.tags : selected.tags)?.map(t => (
                      <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${tagColor(t)}`}>
                        {t}
                        {editing && (
                          <button className="ml-1 text-gray-500 hover:text-red-600" onClick={() => toggleTag(t)}>×</button>
                        )}
                      </span>
                    ))}
                    {editing && (
                      <div className="flex flex-wrap gap-1">
                        {TAGS.filter(t => !editForm.tags.includes(t)).map(t => (
                          <button
                            key={t}
                            onClick={() => toggleTag(t)}
                            className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-green-500 hover:text-green-700"
                          >+ {t}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                      >Отмена</button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                      >{saving ? 'Сохраняю...' : 'Сохранить'}</button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >Редактировать</button>
                  )}
                </div>
              </div>

              {/* Contact fields */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Телефон', key: 'phone' as const },
                  { label: 'Email', key: 'email' as const },
                  { label: 'Авто', key: 'carNumber' as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                    {editing ? (
                      <input
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                        value={editForm[key]}
                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      />
                    ) : (
                      <div className="text-sm text-gray-700">{(selected as unknown as Record<string, string>)[key] || '—'}</div>
                    )}
                  </div>
                ))}
                <div className="col-span-2">
                  <div className="text-xs text-gray-400 mb-0.5">Заметки</div>
                  {editing ? (
                    <textarea
                      className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 resize-none"
                      rows={3}
                      value={editForm.notes}
                      onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  ) : (
                    <div className="text-sm text-gray-700">{selected.notes || '—'}</div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 flex gap-6 pt-4 border-t border-gray-100">
                <div>
                  <div className="text-xs text-gray-400">Всего броней</div>
                  <div className="text-lg font-semibold text-gray-900">{selected.bookings?.length ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Сумма оплат</div>
                  <div className="text-lg font-semibold text-green-700">
                    {(selected.totalSpend ?? 0).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              </div>
            </div>

            {/* Booking history */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">История бронирований</h3>
              </div>
              {selected.bookings?.length === 0 && (
                <div className="px-5 py-4 text-sm text-gray-400">Нет бронирований</div>
              )}
              <div className="divide-y divide-gray-50">
                {selected.bookings?.map(b => (
                  <div
                    key={b.id}
                    className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/bookings/${b.id}`)}
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {b.place_code} — {b.place_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {b.check_in} → {b.check_out}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(b.status)}
                      {b.total_price && (
                        <div className="text-sm font-medium text-gray-700">
                          {parseFloat(b.total_price).toLocaleString('ru-RU')} ₽
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
