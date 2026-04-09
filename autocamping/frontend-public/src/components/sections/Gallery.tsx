const photos = [
  { emoji: '🌅', label: 'Рассвет в лесу', bg: '#d8f3dc' },
  { emoji: '🏕️', label: 'Автопитч', bg: '#b7e4c7' },
  { emoji: '🔥', label: 'Вечер у костра', bg: '#f4a261' },
  { emoji: '🌲', label: 'Сосновый лес', bg: '#52b788' },
  { emoji: '⛺', label: 'Палатки', bg: '#d8f3dc' },
  { emoji: '🚗', label: 'Заезд', bg: '#b7e4c7' },
  { emoji: '🏠', label: 'Домики', bg: '#95d5b2' },
  { emoji: '🌙', label: 'Ночное небо', bg: '#1b4332' },
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Галерея</p>
        <h2 className="section-title">Как это выглядит</h2>
        <p className="section-subtitle mb-12">
          Несколько снимков из жизни нашего кемпинга
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((p, i) => (
            <div
              key={i}
              className={`rounded-xl flex flex-col items-center justify-center text-5xl transition-transform hover:scale-105 cursor-pointer ${i === 0 ? 'col-span-2 row-span-2 h-64' : 'h-32'}`}
              style={{ background: p.bg }}
            >
              <span>{p.emoji}</span>
              <span className="text-xs font-medium mt-2" style={{ color: '#1b4332' }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
