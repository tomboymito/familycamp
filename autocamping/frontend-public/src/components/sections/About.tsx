export default function About() {
  return (
    <section id="about" className="py-20 bg-cream">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">О нас</p>
            <h2 className="section-title text-left">Ваш дом на природе</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              ФэмКэмп — это уютный автокемпинг в сосновом лесу Подмосковья, созданный специально
              для семейного отдыха. Мы открылись в 2019 году и с тех пор стали любимым местом для
              сотен семей.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              У нас есть всё для комфортного отдыха: чистые санузлы, горячий душ, зоны для барбекю,
              детская площадка и доброжелательный персонал, готовый помочь в любой момент.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🚿', text: 'Горячий душ' },
                { icon: '🔌', text: 'Электричество' },
                { icon: '🏊', text: 'Купание' },
                { icon: '🔥', text: 'Зоны барбекю' },
                { icon: '🧒', text: 'Детская площадка' },
                { icon: '🐕', text: 'Можно с питомцем' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-sm text-gray-700">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Placeholder images using colored blocks */}
            <div className="h-48 rounded-2xl bg-green-100 flex items-center justify-center text-5xl col-span-2">🌲🏕️🌲</div>
            <div className="h-32 rounded-2xl bg-amber-50 flex items-center justify-center text-4xl">🌅</div>
            <div className="h-32 rounded-2xl bg-green-50 flex items-center justify-center text-4xl">🏞️</div>
          </div>
        </div>
      </div>
    </section>
  );
}
