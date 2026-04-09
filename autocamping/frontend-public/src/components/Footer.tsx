export default function Footer() {
  return (
    <footer className="bg-green-dark text-white py-12 mt-auto">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 font-bold text-xl mb-3">
            <span>🌲</span>
            <span>ФэмКэмп</span>
          </div>
          <p className="text-green-200 text-sm leading-relaxed">
            Уютный автокемпинг для всей семьи. Отдых на природе в любое время года.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-3">Навигация</h3>
          <ul className="space-y-2 text-green-200 text-sm">
            {[['#about', 'О нас'], ['#places', 'Места'], ['#rules', 'Правила'], ['#contacts', 'Контакты']].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="hover:text-white transition-colors">{label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-3">Контакты</h3>
          <ul className="space-y-2 text-green-200 text-sm">
            <li>📞 +7 (900) 123-45-67</li>
            <li>📧 info@famcamp.ru</li>
            <li>📍 Подмосковье, Дмитровский р-н</li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-green-700 text-center text-green-300 text-sm">
        © {new Date().getFullYear()} ФэмКэмп. Все права защищены.
      </div>
    </footer>
  );
}
