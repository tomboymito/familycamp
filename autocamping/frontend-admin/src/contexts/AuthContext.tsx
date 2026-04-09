import { useCallback, useState } from 'react';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { AuthContext } from './AuthContextDef';

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
