import { createContext, useCallback, useContext, useState } from 'react';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';

interface AuthContextValue {
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(auth.isLoggedIn());

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    auth.setTokens(result.accessToken, result.refreshToken);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    auth.clear();
    setIsLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
