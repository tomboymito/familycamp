import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminUser } from '@/lib/api';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-5 text-base">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [tab, setTab] = useState<'general' | 'booking' | 'payment' | 'users' | 'notifications'>('general');

  const [users,       setUsers]       = useState<AdminUser[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser,     setNewUser]     = useState({ email: '', name: '', password: '' });
  const [newUserErr,  setNewUserErr]  = useState<string | null>(null);
  const [editPwd,     setEditPwd]     = useState<{ id: string; value: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([api.settings(), api.adminUsers()]);
      setSettings(s);
      setUsers(u);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    setNewUserErr(null);
    if (!newUser.email.trim() || !newUser.name.trim() || newUser.password.length < 8) {
      setNewUserErr('Заполните email, имя и пароль (мин. 8 символов)'); return;
    }
    setUserLoading(true);
    try {
      const created = await api.createAdminUser(newUser);
      setUsers(prev => [...prev, created]);
      setNewUser({ email: '', name: '', password: '' });
      setShowNewUser(false);
    } catch (e: unknown) {
      setNewUserErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setUserLoading(false);
    }
  };

  const handleToggleUser = async (id: string, isActive: boolean) => {
    const updated = await api.updateAdminUser(id, { isActive: !isActive });
    setUsers(prev => prev.map(u => u.id === id ? updated : u));
  };

  const handleChangePassword = async (id: string) => {
    if (!editPwd || editPwd.id !== id || editPwd.value.length < 8) return;
    await api.updateAdminUser(id, { password: editPwd.value });
    setEditPwd(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">⏳ Загружаем...</div>;
  }

  const s = settings;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
          <p className="text-gray-500 text-sm">Параметры кемпинга и системы</p>
        </div>
        {tab !== 'users' && tab !== 'notifications' && (
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors self-start sm:self-auto">
            {saving ? 'Сохраняем...' : saved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1 overflow-x-auto">
        {([
          ['general',       '🏕️ Общее'],
          ['booking',       '📅 Бронирование'],
          ['payment',       '💳 Реквизиты'],
          ['notifications', '📨 Уведомления'],
          ['users',         '👥 Администраторы'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === key ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ── */}
      {tab === 'general' && (
        <div className="space-y-4">
          <Section title="Информация о кемпинге">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Название кемпинга">
                <Input value={s.camp_name ?? ''} onChange={v => set('camp_name', v)} placeholder="ФэмКэмп" />
              </Field>
              <Field label="Телефон">
                <Input value={s.camp_phone ?? ''} onChange={v => set('camp_phone', v)} placeholder="+7 900 000 00 00" />
              </Field>
              <Field label="Email">
                <Input type="email" value={s.camp_email ?? ''} onChange={v => set('camp_email', v)} placeholder="info@famcamp.ru" />
              </Field>
              <Field label="GPS-координаты" hint="Формат: 55.751244, 37.618423">
                <Input value={s.camp_gps ?? ''} onChange={v => set('camp_gps', v)} placeholder="55.751244, 37.618423" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Адрес">
                  <Input value={s.camp_address ?? ''} onChange={v => set('camp_address', v)} placeholder="Московская обл., Сергиево-Посадский р-н..." />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Время заезда и выезда по умолчанию">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Время заезда" hint="Применяется к новым бронированиям с сайта">
                <input type="time" value={s.checkin_time ?? '12:00'}
                  onChange={e => set('checkin_time', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </Field>
              <Field label="Время выезда">
                <input type="time" value={s.checkout_time ?? '14:00'}
                  onChange={e => set('checkout_time', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* ── BOOKING ── */}
      {tab === 'booking' && (
        <div className="space-y-4">
          <Section title="Параметры бронирования">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Время удержания места (холд), мин." hint="Гость должен оплатить за это время">
                <Input type="number" value={s.hold_ttl_minutes ?? '15'} onChange={v => set('hold_ttl_minutes', v)} />
              </Field>
              <Field label="Горизонт бронирования, дней" hint="На сколько дней вперёд можно бронировать">
                <Input type="number" value={s.booking_horizon ?? '365'} onChange={v => set('booking_horizon', v)} />
              </Field>
              <Field label="Минимальный срок, ночей">
                <Input type="number" value={s.min_nights ?? '1'} onChange={v => set('min_nights', v)} />
              </Field>
              <Field label="Максимальный срок, ночей">
                <Input type="number" value={s.max_nights ?? '30'} onChange={v => set('max_nights', v)} />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* ── PAYMENT ── */}
      {tab === 'payment' && (
        <div className="space-y-4">
          <Section title="Банковские реквизиты">
            <p className="text-xs text-gray-500 mb-4">Используются для формирования счетов и договоров</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ИНН">
                <Input value={s.inn ?? ''} onChange={v => set('inn', v)} placeholder="1234567890" />
              </Field>
              <Field label="Банк">
                <Input value={s.bank_name ?? ''} onChange={v => set('bank_name', v)} placeholder="Сбербанк" />
              </Field>
              <Field label="Расчётный счёт">
                <Input value={s.bank_account ?? ''} onChange={v => set('bank_account', v)} placeholder="40802810000000000000" />
              </Field>
              <Field label="БИК">
                <Input value={s.bank_bik ?? ''} onChange={v => set('bank_bik', v)} placeholder="044525225" />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {tab === 'notifications' && (
        <div className="space-y-4">
          <Section title="Email (SMTP)">
            <p className="text-xs text-gray-500 mb-4">Настройки для отправки писем гостям</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="SMTP хост" hint="Например: smtp.gmail.com">
                <Input value={s.smtp_host ?? ''} onChange={v => set('smtp_host', v)} placeholder="smtp.gmail.com" />
              </Field>
              <Field label="Порт" hint="Обычно 587 (STARTTLS) или 465 (SSL)">
                <Input type="number" value={s.smtp_port ?? '587'} onChange={v => set('smtp_port', v)} />
              </Field>
              <Field label="Логин (email отправителя)">
                <Input type="email" value={s.smtp_user ?? ''} onChange={v => set('smtp_user', v)} placeholder="noreply@famcamp.ru" />
              </Field>
              <Field label="Пароль">
                <Input type="password" value={s.smtp_pass ?? ''} onChange={v => set('smtp_pass', v)} />
              </Field>
              <Field label="Имя отправителя (From)">
                <Input value={s.smtp_from ?? ''} onChange={v => set('smtp_from', v)} placeholder="ФэмКэмп <noreply@famcamp.ru>" />
              </Field>
            </div>
          </Section>

          <Section title="SMS-рассылка">
            <p className="text-xs text-gray-500 mb-4">Поддерживаются провайдеры: <strong>smsru</strong>, <strong>smsc</strong></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Провайдер" hint="smsru или smsc">
                <Input value={s.sms_provider ?? ''} onChange={v => set('sms_provider', v)} placeholder="smsru" />
              </Field>
              <Field label="API ключ">
                <Input value={s.sms_api_key ?? ''} onChange={v => set('sms_api_key', v)} />
              </Field>
              <Field label="Имя отправителя (Sender ID)">
                <Input value={s.sms_sender ?? ''} onChange={v => set('sms_sender', v)} placeholder="FAMCAMP" />
              </Field>
            </div>
          </Section>

          <Section title="Шаблоны сообщений">
            <p className="text-xs text-gray-500 mb-4">
              Доступные переменные: <code className="bg-gray-100 px-1 rounded">{'{name}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{booking_id}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{place}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{check_in}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{check_out}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{check_in_time}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{check_out_time}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{total_price}'}</code>
            </p>
            <div className="space-y-4">
              {[
                { key: 'tpl_confirm_email',  label: 'Подтверждение — Email' },
                { key: 'tpl_confirm_sms',    label: 'Подтверждение — SMS' },
                { key: 'tpl_reminder_email', label: 'Напоминание — Email' },
                { key: 'tpl_reminder_sms',   label: 'Напоминание — SMS' },
                { key: 'tpl_cancel_email',   label: 'Отмена — Email' },
                { key: 'tpl_cancel_sms',     label: 'Отмена — SMS' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <textarea
                    value={s[key] ?? ''}
                    onChange={e => set(key, e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 resize-y"
                  />
                </div>
              ))}
            </div>
          </Section>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors">
              {saving ? 'Сохраняем...' : saved ? '✓ Сохранено' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <Section title="Администраторы системы">
            <div className="space-y-3 mb-4">
              {users.map(u => (
                <div key={u.id} className={`border rounded-xl p-4 ${!u.isActive ? 'opacity-50 border-gray-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {u.isActive ? '✓ Активен' : '✕ Отключён'} · с {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleUser(u.id, u.isActive)}
                        className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                          u.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'
                        }`}>
                        {u.isActive ? 'Отключить' : 'Включить'}
                      </button>
                      <button
                        onClick={() => setEditPwd(editPwd?.id === u.id ? null : { id: u.id, value: '' })}
                        className="text-xs px-3 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                        Сменить пароль
                      </button>
                    </div>
                  </div>
                  {editPwd?.id === u.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="password"
                        value={editPwd.value}
                        onChange={e => setEditPwd({ id: u.id, value: e.target.value })}
                        placeholder="Новый пароль (мин. 8 символов)"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={() => handleChangePassword(u.id)}
                        disabled={editPwd.value.length < 8}
                        className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-40">
                        Сохранить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setShowNewUser(!showNewUser)}
              className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors">
              + Добавить администратора
            </button>

            {showNewUser && (
              <div className="mt-4 border border-green-200 rounded-2xl p-5 space-y-3">
                <h3 className="font-semibold text-gray-900">Новый администратор</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Имя"><Input value={newUser.name} onChange={v => setNewUser(f => ({ ...f, name: v }))} placeholder="Иван Петров" /></Field>
                  <Field label="Email"><Input type="email" value={newUser.email} onChange={v => setNewUser(f => ({ ...f, email: v }))} placeholder="admin@famcamp.ru" /></Field>
                  <div className="sm:col-span-2">
                    <Field label="Пароль" hint="Минимум 8 символов">
                      <Input type="password" value={newUser.password} onChange={v => setNewUser(f => ({ ...f, password: v }))} />
                    </Field>
                  </div>
                </div>
                {newUserErr && <p className="text-red-600 text-sm">{newUserErr}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowNewUser(false)} className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">Отмена</button>
                  <button onClick={handleCreateUser} disabled={userLoading}
                    className="flex-1 bg-green-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-green-600 disabled:opacity-50">
                    {userLoading ? 'Создаём...' : 'Создать'}
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
