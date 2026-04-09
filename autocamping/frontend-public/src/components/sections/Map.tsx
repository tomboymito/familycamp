export default function Map() {
  return (
    <section id="map" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Как добраться</p>
          <h2 className="section-title">Мы на карте</h2>
          <p className="section-subtitle">
            Подмосковье, Дмитровский район. 70 км от МКАД по Дмитровскому шоссе
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Map placeholder */}
          <div
            className="h-80 rounded-2xl flex flex-col items-center justify-center gap-4 shadow-inner"
            style={{ background: 'linear-gradient(135deg, #d8f3dc, #95d5b2)' }}
          >
            <span className="text-6xl">🗺️</span>
            <p className="text-green-dark font-semibold">Интерактивная карта</p>
            <a
              href="https://yandex.ru/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm px-6 py-2"
            >
              Открыть в Яндекс.Картах
            </a>
          </div>
          {/* Directions */}
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-green-dark text-lg mb-3">🚗 На автомобиле</h3>
              <ol className="space-y-2 text-gray-700 text-sm list-decimal list-inside">
                <li>Выезд из Москвы по Дмитровскому шоссе (А104)</li>
                <li>Через 65 км поворот на деревню Озерецкое</li>
                <li>Через 2 км поворот направо у сосновой рощи</li>
                <li>Следуйте указателям «ФэмКэмп»</li>
              </ol>
            </div>
            <div>
              <h3 className="font-bold text-green-dark text-lg mb-3">🚌 Общественным транспортом</h3>
              <ol className="space-y-2 text-gray-700 text-sm list-decimal list-inside">
                <li>Электричка с Савёловского вокзала до ст. Дмитров</li>
                <li>Автобус № 25 до остановки «Озерецкое»</li>
                <li>Пешком 10 минут по лесной тропе</li>
              </ol>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm text-green-dark font-medium">📍 Координаты:</p>
              <p className="text-sm text-gray-700 font-mono mt-1">56.3456° N, 37.5123° E</p>
              <p className="text-sm text-gray-500 mt-2">
                Заезд с 14:00, выезд до 12:00. При необходимости согласуйте время.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
