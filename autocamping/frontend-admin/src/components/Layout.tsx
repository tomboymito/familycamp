import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const nav = [
  { to: '/dashboard',  icon: '🏠',  label: 'Главная' },
  { to: '/chess-board', icon: '📋', label: 'Шахматка' },
  { to: '/bookings',   icon: '📅',  label: 'Бронирования' },
  { to: '/blockings',  icon: '🚫',  label: 'Блокировки' },
  { to: '/places',     icon: '🏕️', label: 'Места и цены' },
  { to: '/customers',  icon: '👥',  label: 'Клиенты' },
  { to: '/reports',    icon: '📊',  label: 'Аналитика' },
  { to: '/ical',       icon: '🔄',  label: 'iCal синхронизация' },
  { to: '/webhooks',   icon: '🔌',  label: 'OTA вебхуки' },
  { to: '/settings',   icon: '⚙️',  label: 'Настройки' },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-green-700 text-white'
        : 'text-green-100 hover:bg-green-700/50'
    }`;

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-green-700">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <span>🌲</span>
          <span>ФэмКэмп</span>
          <span className="text-green-300 text-xs font-normal ml-1">Admin</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setSidebarOpen(false)}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-green-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-200 hover:bg-green-700/50 w-full transition-colors"
        >
          <span>🚪</span>
          <span>Выйти</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-green-dark flex-shrink-0" style={{ backgroundColor: '#1b4332' }}>
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-56 flex flex-col z-50" style={{ backgroundColor: '#1b4332' }}>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-green-dark">🌲 ФэмКэмп Admin</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
