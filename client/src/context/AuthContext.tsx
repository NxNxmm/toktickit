import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, loginApi, getMeApi, logoutApi, changePasswordApi } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('toktickit_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const currentUser = await getMeApi();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (err) {
        // Not authenticated or expired
        if (isMounted) {
          localStorage.removeItem('toktickit_auth_token');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await loginApi(email, password);
    localStorage.removeItem('toktickit_selected_requester');
    localStorage.setItem('toktickit_auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('toktickit_auth_token');
      localStorage.removeItem('toktickit_selected_requester');
      setToken(null);
      setUser(null);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const res = await changePasswordApi(currentPassword, newPassword);
    if (user) {
      setUser({
        ...user,
        requiresPasswordChange: res.requiresPasswordChange ?? false,
      });
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    changePassword,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    // Return a safe no-op context when used outside AuthProvider (e.g. in Lab-2 tests
    // that only wrap components with RequesterProvider).
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => { throw new Error('AuthProvider not mounted'); },
      logout: async () => {},
      changePassword: async () => {},
      setUser: () => {},
    };
  }
  return context;
};
