import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ChessBoard from '@/pages/ChessBoard';
import Bookings from '@/pages/Bookings';
import BookingDetail from '@/pages/BookingDetail';
import Blockings from '@/pages/Blockings';
import Places from '@/pages/Places';
import Settings from '@/pages/Settings';
import Customers from '@/pages/Customers';
import Reports from '@/pages/Reports';
import IcalSync from '@/pages/IcalSync';
import Webhooks from '@/pages/Webhooks';

export default function App() {
  const basename = (import.meta.env.BASE_URL || '/admin/').replace(/\/$/, '') || '/';

  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="chess-board" element={<ChessBoard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="blockings" element={<Blockings />} />
            <Route path="places" element={<Places />} />
            <Route path="customers" element={<Customers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="ical" element={<IcalSync />} />
            <Route path="webhooks" element={<Webhooks />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
