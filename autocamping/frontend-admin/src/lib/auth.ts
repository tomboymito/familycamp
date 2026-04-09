const ACCESS_KEY = 'admin_access_token';
const REFRESH_KEY = 'admin_refresh_token';

export const auth = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  isLoggedIn: () => !!localStorage.getItem(ACCESS_KEY),
};
