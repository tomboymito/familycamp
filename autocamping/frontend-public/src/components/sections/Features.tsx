const features = [
  {
    icon: '🌲',
    title: 'Сосновый лес',
    desc: 'Кемпинг расположен в вековом сосновом лесу. Свежий воздух и тишина — лучшее лекарство от городской суеты.',
  },
  {
    icon: '🏞️',
    title: 'Речка рядом',
    desc: 'До речки всего 5 минут пешком. Купание, рыбалка, закаты над водой — всё это ждёт вас.',
  },
  {
    icon: '🔌',
    title: 'Удобства',
    desc: 'Электрические подключения, горячий душ, чистые туалеты — для тех, кто ценит комфорт.',
  },
  {
    icon: '🐾',
    title: 'Питомцы welcome',
    desc: 'Мы любим животных! Приезжайте с вашими четвероногими друзьями — для них тут раздолье.',
  },
  {
    icon: '🔥',
    title: 'Зоны отдыха',
    desc: 'Специальные зоны для барбекю и костра, беседки, столы — всё для незабываемых вечеров.',
  },
  {
    icon: '🛡️',
    title: 'Безопасность',
    desc: 'Закрытая территория, охрана, видеонаблюдение. Ваша семья под надёжной защитой.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Преимущества</p>
        <h2 className="section-title">Почему выбирают нас</h2>
        <p className="section-subtitle mb-12">
          Мы создали место, где каждая деталь продумана для вашего комфорта и удовольствия
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all text-left"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-green-dark mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
