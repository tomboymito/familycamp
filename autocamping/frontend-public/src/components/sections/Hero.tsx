'use client';

interface HeroProps {
  onBookingOpen: () => void;
}

export default function Hero({ onBookingOpen }: HeroProps) {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center text-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 40%, #40916c 100%)',
      }}
    >
      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 left-1/4 w-80 h-80 rounded-full bg-white/5" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-32">
        <div className="text-6xl mb-6">🌲</div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Отдых на природе<br />
          <span className="text-amber-light">для всей семьи</span>
        </h1>
        <p className="text-lg sm:text-xl text-green-100 mb-4 max-w-xl mx-auto leading-relaxed">
          Автопитчи, уютные домики и палаточные места в сосновом лесу.<br />
          Речка, чистый воздух и настоящий отдых вдали от города.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button onClick={onBookingOpen} className="btn-primary text-base px-8 py-4 text-lg">
            Забронировать место
          </button>
          <a href="#about" className="btn-secondary text-base px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-green-dark transition-colors" style={{ borderColor: 'white' }}>
            Узнать больше
          </a>
        </div>
        <div className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto text-center">
          {[
            { icon: '🏕️', val: '10', label: 'мест' },
            { icon: '⭐', val: '4.9', label: 'рейтинг' },
            { icon: '👨‍👩‍👧‍👦', val: '500+', label: 'семей' },
          ].map((s) => (
            <div key={s.label} className="text-white">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold">{s.val}</div>
              <div className="text-green-200 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll arrow */}
      <a
        href="#about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 hover:text-white animate-bounce"
        aria-label="Прокрутить вниз"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </a>
    </section>
  );
}
