'use client';

import { useEffect, useState } from 'react';

interface Review {
  id: string;
  source: string;
  authorName: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
}

const staticReviews: Review[] = [
  { id: '1', source: 'yandex', authorName: 'Алексей К.', rating: 5, reviewText: 'Отличный кемпинг! Чисто, уютно, персонал очень приветливый. Обязательно вернёмся!', reviewDate: '2025-06-15' },
  { id: '2', source: 'google', authorName: 'Елена М.', rating: 5, reviewText: 'Прекрасное место для отдыха с семьёй. Дети в восторге от природы. Удобства на высоте.', reviewDate: '2025-06-20' },
  { id: '3', source: '2gis', authorName: 'Дмитрий В.', rating: 4, reviewText: 'Хорошее место, тихо и спокойно. Рядом лес и речка. Немного далеко от города, но оно того стоит.', reviewDate: '2025-07-01' },
  { id: '4', source: 'yandex', authorName: 'Наталья С.', rating: 5, reviewText: 'Провели выходные всей семьёй — дети счастливы, родители отдохнули. Вернёмся ещё!', reviewDate: '2025-07-10' },
];

const sourceLabel: Record<string, string> = {
  yandex: 'Яндекс',
  google: 'Google',
  '2gis': '2ГИС',
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'text-amber' : 'text-gray-300'}>★</span>
      ))}
    </div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>(staticReviews);

  useEffect(() => {
    // Try fetching from backend, fall back to static data
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api/v1';
    fetch(`${apiUrl}/reviews-cache`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setReviews(data as Review[]);
      })
      .catch(() => {/* use static */});
  }, []);

  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <section id="reviews" className="py-20 bg-cream">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Отзывы</p>
        <h2 className="section-title">Что говорят гости</h2>
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className="text-5xl font-bold text-green-dark">{avg}</span>
          <div>
            <Stars rating={5} />
            <p className="text-gray-500 text-sm mt-1">на основе {reviews.length} отзывов</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <Stars rating={r.rating} />
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {sourceLabel[r.source] ?? r.source}
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-4">{r.reviewText}</p>
              <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 pt-3">
                <span className="font-medium">{r.authorName}</span>
                <span>{new Date(r.reviewDate).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
