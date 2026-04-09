'use client';

import { useState } from 'react';

interface HeaderProps {
  onBookingOpen: () => void;
}

const navLinks = [
  { href: '#about', label: 'О нас' },
  { href: '#places', label: 'Места' },
  { href: '#reviews', label: 'Отзывы' },
  { href: '#contacts', label: 'Контакты' },
];

export default function Header({ onBookingOpen }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 font-bold text-xl text-green-dark">
          <span className="text-2xl">🌲</span>
          <span>ФэмКэмп</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <button onClick={onBookingOpen} className="btn-primary text-sm px-4 py-2">
            Забронировать
          </button>
        </nav>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Меню"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4 flex flex-col gap-4">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-base font-medium text-gray-700 hover:text-green-600"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => { setMenuOpen(false); onBookingOpen(); }}
            className="btn-primary w-full"
          >
            Забронировать
          </button>
        </div>
      )}
    </header>
  );
}
