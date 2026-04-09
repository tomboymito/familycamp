'use client';

interface ContactsProps {
  onBookingOpen: () => void;
}

export default function Contacts({ onBookingOpen }: ContactsProps) {
  return (
    <section id="contacts" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Контакты</p>
          <h2 className="section-title">Свяжитесь с нами</h2>
          <p className="section-subtitle">
            Есть вопросы? Мы всегда рады помочь
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                📞
              </div>
              <div>
                <p className="font-semibold text-green-dark">Телефон</p>
                <a href="tel:+79001234567" className="text-gray-700 hover:text-green-600 transition-colors">
                  +7 (900) 123-45-67
                </a>
                <p className="text-gray-500 text-sm">Пн–Вс, 9:00–21:00</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                📧
              </div>
              <div>
                <p className="font-semibold text-green-dark">Email</p>
                <a href="mailto:info@famcamp.ru" className="text-gray-700 hover:text-green-600 transition-colors">
                  info@famcamp.ru
                </a>
                <p className="text-gray-500 text-sm">Ответим в течение часа</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                💬
              </div>
              <div>
                <p className="font-semibold text-green-dark">Мессенджеры</p>
                <div className="flex gap-3 mt-1">
                  <a href="#" className="text-sm text-gray-700 hover:text-green-600">Telegram</a>
                  <a href="#" className="text-sm text-gray-700 hover:text-green-600">WhatsApp</a>
                  <a href="#" className="text-sm text-gray-700 hover:text-green-600">VK</a>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                📍
              </div>
              <div>
                <p className="font-semibold text-green-dark">Адрес</p>
                <p className="text-gray-700">Московская обл., Дмитровский р-н,</p>
                <p className="text-gray-700">д. Озерецкое, 1</p>
              </div>
            </div>
          </div>
          <div className="bg-green-dark rounded-2xl p-8 text-white flex flex-col justify-center">
            <h3 className="text-2xl font-bold mb-4">Готовы к отдыху?</h3>
            <p className="text-green-100 leading-relaxed mb-6">
              Забронируйте место прямо сейчас и получите подтверждение в течение нескольких минут.
              Оплата при заезде или онлайн.
            </p>
            <button onClick={onBookingOpen} className="btn-primary">
              Забронировать место
            </button>
            <p className="text-green-300 text-sm mt-4">
              Бесплатная отмена за 48 часов до заезда
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
