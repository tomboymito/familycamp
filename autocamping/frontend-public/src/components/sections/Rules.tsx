const rules = [
  {
    icon: '🔇',
    title: 'Тишина с 23:00',
    desc: 'После 23:00 просьба соблюдать тишину. Это позволяет всем гостям полноценно отдохнуть.',
  },
  {
    icon: '🐾',
    title: 'Питомцы на поводке',
    desc: 'Мы рады животным! Но просим держать их на поводке за пределами вашего места.',
  },
  {
    icon: '🗑️',
    title: 'Чистота',
    desc: 'Оставляем место чище, чем нашли. Мусор — только в специальных контейнерах.',
  },
  {
    icon: '🔥',
    title: 'Костры в отведённых местах',
    desc: 'Разведение костров только в специальных зонах. За пределами — только мангалы.',
  },
  {
    icon: '🍺',
    title: 'Алкоголь умеренно',
    desc: 'Мы взрослые люди. Просим учитывать других гостей, особенно детей.',
  },
  {
    icon: '🅿️',
    title: 'Парковка',
    desc: 'Автомобиль паркуется только на вашем месте или на общей стоянке.',
  },
];

export default function Rules() {
  return (
    <section id="rules" className="py-20 bg-cream">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Правила</p>
        <h2 className="section-title">Правила кемпинга</h2>
        <p className="section-subtitle mb-12">
          Несколько простых правил для комфорта всех наших гостей
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
          {rules.map((r) => (
            <div key={r.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{r.icon}</span>
                <div>
                  <h3 className="font-semibold text-green-dark mb-1">{r.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{r.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6 max-w-2xl mx-auto text-left">
          <p className="font-semibold text-green-dark mb-2">📋 Заезд и выезд</p>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Заезд: <strong>с 14:00</strong> в день заезда</li>
            <li>• Выезд: <strong>до 12:00</strong> в день выезда</li>
            <li>• Ранний заезд и поздний выезд — по согласованию (+500 ₽)</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
