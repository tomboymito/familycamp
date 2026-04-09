import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
