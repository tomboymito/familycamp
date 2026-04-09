'use client';

interface PlacesSectionProps {
  onBookingOpen: () => void;
}

const placeTypes = [
  {
    icon: '🚗',
    name: 'Автопитч',
    price: 'от 1 200 ₽/ночь',
    desc: 'Просторное место для палатки и автомобиля. Электричество и вода по запросу. Идеально для путешественников на машине.',
    capacity: 'до 5 человек',
    count: '4 места',
    highlights: ['Заезд на автомобиле', 'Подключение 220В', 'Вода рядом', 'Твёрдое покрытие'],
  },
  {
    icon: '⛺',
    name: 'Палатка',
    price: 'от 600 ₽/ночь',
    desc: 'Уютное место для палатки в тени деревьев. Лёгкий доступ к санузлам и душу. Для тех, кто любит настоящий кемпинг.',
    capacity: 'до 4 человек',
    count: '4 места',
    highlights: ['Ровная площадка', 'Газон', 'Рядом душ', 'Общая кухня'],
  },
  {
    icon: '🏠',
    name: 'Домик',
    price: 'от 5 000 ₽/ночь',
    desc: 'Деревянный домик с кроватями, мини-кухней и всеми удобствами. Максимальный комфорт в окружении природы.',
    capacity: 'до 6 человек',
    count: '2 домика',
    highlights: ['Кровати и постельное', 'Мини-кухня', 'Личный санузел', 'Веранда'],
  },
];

export default function Places({ onBookingOpen }: PlacesSectionProps) {
  return (
    <section id="places" className="py-20 bg-cream">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Размещение</p>
        <h2 className="section-title">Выберите своё место</h2>
        <p className="section-subtitle mb-12">
          10 мест трёх видов для любого стиля отдыха и бюджета
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {placeTypes.map((p) => (
            <div
              key={p.name}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col"
            >
              <div
                className="h-40 flex items-center justify-center text-6xl"
                style={{ background: 'linear-gradient(135deg, #d8f3dc, #b7e4c7)' }}
              >
                {p.icon}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-green-dark">{p.name}</h3>
                  <span className="text-green-600 font-semibold text-sm whitespace-nowrap ml-2">{p.price}</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{p.desc}</p>
                <ul className="space-y-1 mb-4">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-green-500 font-bold">✓</span>
                      {h}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100 text-sm text-gray-500">
                  <span>👥 {p.capacity}</span>
                  <span>🏕️ {p.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <button onClick={onBookingOpen} className="btn-primary px-8 py-3 text-base">
            Забронировать место
          </button>
        </div>
      </div>
    </section>
  );
}
