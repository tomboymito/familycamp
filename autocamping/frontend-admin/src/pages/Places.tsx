import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Place, PricingRule } from '@/lib/api';

interface AccomType {
  id: string; name: string; slug: string;
  defaultCapacity: number; description: string | null; isActive: boolean;
}

const TYPE_ICONS: Record<string, string> = { pitch: '🚗', tent: '⛺', cabin: '🏠', glamping: '🌟' };

// ─── Place form modal ─────────────────────────────────────────────────────────

function PlaceModal({ types, place, onSave, onClose }: {
  types: AccomType[];
  place: Place | null;
  onSave: (data: Omit<Place, 'id' | 'sortOrder' | 'accommodationType'>, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    typeId:          place?.typeId         ?? (types[0]?.id ?? ''),
    name:            place?.name           ?? '',
    code:            place?.code           ?? '',
    capacity:        place?.capacity       ?? 4,
    hasElectricity:  place?.hasElectricity ?? false,
    hasWater:        place?.hasWater       ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.typeId) {
      setError('Заполните название, код и тип'); return;
    }
    setSaving(true);
    try {
      await onSave(form, place?.id);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-lg text-gray-900">{place ? 'Редактировать место' : 'Новое место'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Название *</label>
              <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Автопитч А1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Код *</label>
              <input type="text" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="A1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Тип размещения *</label>
            <select value={form.typeId} onChange={(e) => setForm(f => ({ ...f, typeId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500">
              {types.filter(t => t.isActive).map(t => (
                <option key={t.id} value={t.id}>{TYPE_ICONS[t.slug] ?? '🏕️'} {t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Вместимость (чел.)</label>
            <input type="number" min={1} max={50} value={form.capacity}
              onChange={(e) => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={form.hasElectricity}
                onChange={(e) => setForm(f => ({ ...f, hasElectricity: e.target.checked }))}
                className="accent-green-700 w-4 h-4" />
              ⚡ Электричество
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={form.hasWater}
                onChange={(e) => setForm(f => ({ ...f, hasWater: e.target.checked }))}
                className="accent-green-700 w-4 h-4" />
              💧 Вода
            </label>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-300 rounded-xl py-2 text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 bg-green-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-green-600 disabled:opacity-50">
              {saving ? 'Сохраняем...' : place ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing rule form ────────────────────────────────────────────────────────

function RuleModal({ types, rule, onSave, onClose }: {
  types: AccomType[];
  rule: PricingRule | null;
  onSave: (data: Partial<PricingRule>, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    typeId:       rule?.typeId        ?? (types[0]?.id ?? ''),
    seasonLabel:  rule?.seasonLabel   ?? '',
    validFrom:    rule?.validFrom     ?? '',
    validTo:      rule?.validTo       ?? '',
    pricePerNight: rule ? Number(rule.pricePerNight) : 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.seasonLabel.trim() || !form.validFrom || !form.validTo || form.pricePerNight <= 0) {
      setError('Заполните все поля'); return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, pricePerNight: String(form.pricePerNight), isActive: true }, rule?.id);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-lg text-gray-900">{rule ? 'Редактировать тариф' : 'Новый тариф'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Тип размещения</label>
            <select value={form.typeId} onChange={(e) => setForm(f => ({ ...f, typeId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500">
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Название сезона *</label>
            <input type="text" value={form.seasonLabel}
              onChange={(e) => setForm(f => ({ ...f, seasonLabel: e.target.value }))}
              placeholder="Высокий сезон"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">С</label>
              <input type="date" value={form.validFrom}
                onChange={(e) => setForm(f => ({ ...f, validFrom: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">По</label>
              <input type="date" value={form.validTo} min={form.validFrom}
                onChange={(e) => setForm(f => ({ ...f, validTo: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Цена за ночь, ₽ *</label>
            <input type="number" min={0} value={form.pricePerNight}
              onChange={(e) => setForm(f => ({ ...f, pricePerNight: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-300 rounded-xl py-2 text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 bg-green-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-green-600 disabled:opacity-50">
              {saving ? 'Сохраняем...' : rule ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Places() {
  const [places,  setPlaces]  = useState<Place[]>([]);
  const [types,   setTypes]   = useState<AccomType[]>([]);
  const [rules,   setRules]   = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'places' | 'types' | 'pricing'>('places');

  const [placeModal, setPlaceModal] = useState<Place | null | 'new'>(null);
  const [ruleModal,  setRuleModal]  = useState<PricingRule | null | 'new'>(null);

  // Accommodation type inline edit
  const [typeForm, setTypeForm] = useState<{ name: string; defaultCapacity: number; description: string } | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [newTypeForm, setNewTypeForm] = useState({ name: '', slug: '', defaultCapacity: 4, description: '' });
  const [showNewType, setShowNewType] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pl, ty, ru] = await Promise.all([
        api.adminPlaces(),
        api.accommodationTypesAdmin(),
        api.pricingRulesAdmin(),
      ]);
      setPlaces(pl);
      setTypes(ty);
      setRules(ru);
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Place handlers ──
  const handleSavePlace = async (
    data: Omit<Place, 'id' | 'sortOrder' | 'accommodationType'>,
    id?: string,
  ) => {
    if (id) {
      const updated = await api.updatePlace(id, data);
      setPlaces(prev => prev.map(p => p.id === id ? updated : p));
    } else {
      const created = await api.createPlace(data);
      setPlaces(prev => [...prev, created]);
    }
  };

  const handleTogglePlace = async (id: string) => {
    const updated = await api.togglePlace(id);
    setPlaces(prev => prev.map(p => p.id === id ? updated : p));
  };

  // ── Rule handlers ──
  const handleSaveRule = async (data: Partial<PricingRule>, id?: string) => {
    if (id) {
      const updated = await api.updatePricingRule(id, data);
      setRules(prev => prev.map(r => r.id === id ? updated : r));
    } else {
      const created = await api.createPricingRuleAdmin(data as Omit<PricingRule, 'id' | 'accommodationType'>);
      setRules(prev => [...prev, created]);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Удалить тариф?')) return;
    await api.deletePricingRuleAdmin(id);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleToggleRule = async (rule: PricingRule) => {
    const updated = await api.updatePricingRule(rule.id, { isActive: !rule.isActive });
    setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
  };

  // ── Type handlers ──
  const handleSaveType = async (id: string) => {
    if (!typeForm) return;
    await api.updateAccommodationType(id, typeForm);
    setEditingTypeId(null);
    void load();
  };

  const handleToggleType = async (id: string, isActive: boolean) => {
    await api.updateAccommodationType(id, { isActive: !isActive });
    void load();
  };

  const handleCreateType = async () => {
    if (!newTypeForm.name.trim() || !newTypeForm.slug.trim()) return;
    await api.createAccommodationType(newTypeForm);
    setShowNewType(false);
    setNewTypeForm({ name: '', slug: '', defaultCapacity: 4, description: '' });
    void load();
  };

  const typeMap = new Map(types.map(t => [t.id, t]));

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">⏳ Загружаем...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Объект</h1>
          <p className="text-gray-500 text-sm">Места, типы размещения и тарифы</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {([['places', 'Места'], ['types', 'Типы размещения'], ['pricing', 'Тарифы']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PLACES ── */}
      {tab === 'places' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setPlaceModal('new')}
              className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors">
              + Добавить место
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {places.map(p => {
              const type = typeMap.get(p.typeId);
              return (
                <div key={p.id} className={`bg-white rounded-xl border p-4 transition-opacity ${!p.isActive ? 'opacity-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-bold text-gray-900 text-lg">{p.code}</span>
                      <span className="text-gray-500 text-sm ml-2">{p.name}</span>
                    </div>
                    <span className="text-2xl">{TYPE_ICONS[type?.slug ?? ''] ?? '🏕️'}</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5 mb-3">
                    <p>Тип: {type?.name ?? '—'}</p>
                    <p>Вместимость: {p.capacity} чел.</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {p.hasElectricity && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">⚡ Электро</span>}
                      {p.hasWater       && <span className="bg-blue-100   text-blue-700   px-2 py-0.5 rounded-full text-xs">💧 Вода</span>}
                      {!p.isActive      && <span className="bg-gray-100   text-gray-500   px-2 py-0.5 rounded-full text-xs">Неактивно</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPlaceModal(p)}
                      className="flex-1 text-xs border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors">
                      Изменить
                    </button>
                    <button onClick={() => handleTogglePlace(p.id)}
                      className={`flex-1 text-xs rounded-lg py-1.5 transition-colors ${
                        p.isActive
                          ? 'border border-red-200 text-red-600 hover:bg-red-50'
                          : 'border border-green-200 text-green-700 hover:bg-green-50'
                      }`}>
                      {p.isActive ? 'Деактивировать' : 'Активировать'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TYPES ── */}
      {tab === 'types' && (
        <div className="space-y-3">
          <div className="flex justify-end mb-2">
            <button onClick={() => setShowNewType(true)}
              className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors">
              + Добавить тип
            </button>
          </div>

          {showNewType && (
            <div className="bg-white border border-green-200 rounded-2xl p-5 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Новый тип размещения</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Название *</label>
                  <input type="text" value={newTypeForm.name}
                    onChange={e => setNewTypeForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Автопитч" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Slug *</label>
                  <input type="text" value={newTypeForm.slug}
                    onChange={e => setNewTypeForm(f => ({ ...f, slug: e.target.value.toLowerCase() }))}
                    placeholder="pitch" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Вместимость</label>
                  <input type="number" min={1} value={newTypeForm.defaultCapacity}
                    onChange={e => setNewTypeForm(f => ({ ...f, defaultCapacity: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Описание</label>
                  <input type="text" value={newTypeForm.description}
                    onChange={e => setNewTypeForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Для автомобилей и палаток"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNewType(false)} className="flex-1 border border-gray-300 rounded-xl py-2 text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
                <button onClick={handleCreateType} className="flex-1 bg-green-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-green-600">Создать</button>
              </div>
            </div>
          )}

          {types.map(t => (
            <div key={t.id} className={`bg-white border rounded-2xl p-5 ${!t.isActive ? 'opacity-60' : 'border-gray-200'}`}>
              {editingTypeId === t.id && typeForm ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Название</label>
                      <input type="text" value={typeForm.name}
                        onChange={e => setTypeForm(f => f ? ({ ...f, name: e.target.value }) : f)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Вместимость</label>
                      <input type="number" min={1} value={typeForm.defaultCapacity}
                        onChange={e => setTypeForm(f => f ? ({ ...f, defaultCapacity: Number(e.target.value) }) : f)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Описание</label>
                    <input type="text" value={typeForm.description}
                      onChange={e => setTypeForm(f => f ? ({ ...f, description: e.target.value }) : f)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setEditingTypeId(null)} className="flex-1 border border-gray-300 rounded-xl py-1.5 text-sm hover:bg-gray-50">Отмена</button>
                    <button onClick={() => handleSaveType(t.id)} className="flex-1 bg-green-700 text-white rounded-xl py-1.5 text-sm font-semibold hover:bg-green-600">Сохранить</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{TYPE_ICONS[t.slug] ?? '🏕️'}</span>
                      <span className="font-semibold text-gray-900">{t.name}</span>
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{t.slug}</code>
                      {!t.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Неактивно</span>}
                    </div>
                    <p className="text-sm text-gray-500">{t.description ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Вместимость по умолчанию: {t.defaultCapacity} чел.</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <button onClick={() => { setEditingTypeId(t.id); setTypeForm({ name: t.name, defaultCapacity: t.defaultCapacity, description: t.description ?? '' }); }}
                      className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">Изменить</button>
                    <button onClick={() => handleToggleType(t.id, t.isActive)}
                      className={`text-xs rounded-lg px-3 py-1.5 ${t.isActive ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'border border-green-200 text-green-700 hover:bg-green-50'}`}>
                      {t.isActive ? 'Откл.' : 'Вкл.'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PRICING ── */}
      {tab === 'pricing' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setRuleModal('new')}
              className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors">
              + Добавить тариф
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {rules.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm">Нет тарифов</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Тип</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Сезон</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">С</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">По</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">₽/ночь</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Статус</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(rule => {
                      const type = typeMap.get(rule.typeId);
                      return (
                        <tr key={rule.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!rule.isActive ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3">{TYPE_ICONS[type?.slug ?? ''] ?? '🏕️'} {type?.name ?? '—'}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{rule.seasonLabel}</td>
                          <td className="px-4 py-3 text-gray-500">{rule.validFrom}</td>
                          <td className="px-4 py-3 text-gray-500">{rule.validTo}</td>
                          <td className="px-4 py-3 text-right font-semibold">{Number(rule.pricePerNight).toLocaleString('ru-RU')} ₽</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleToggleRule(rule)}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {rule.isActive ? 'Активен' : 'Откл.'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setRuleModal(rule)} className="text-xs text-blue-600 hover:underline">Изм.</button>
                              <button onClick={() => handleDeleteRule(rule.id)} className="text-xs text-red-500 hover:underline">Удалить</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {placeModal !== null && (
        <PlaceModal
          types={types}
          place={placeModal === 'new' ? null : placeModal}
          onSave={handleSavePlace}
          onClose={() => setPlaceModal(null)}
        />
      )}
      {ruleModal !== null && (
        <RuleModal
          types={types}
          rule={ruleModal === 'new' ? null : ruleModal}
          onSave={handleSaveRule}
          onClose={() => setRuleModal(null)}
        />
      )}
    </div>
  );
}
