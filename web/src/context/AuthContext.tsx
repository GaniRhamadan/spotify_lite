import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types';
import { apiRequest, setAuthToken, removeAuthToken } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('spotify_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          const res = await apiRequest('/auth/me');
          if (res.success) {
            setUser(res.data);
            localStorage.setItem('spotify_user', JSON.stringify(res.data));
          }
        } catch {
          removeAuthToken();
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.success) {
      setAuthToken(res.data.token);
      localStorage.setItem('spotify_refresh_token', res.data.refreshToken);
      localStorage.setItem('spotify_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    if (res.success) {
      setAuthToken(res.data.token);
      localStorage.setItem('spotify_refresh_token', res.data.refreshToken);
      localStorage.setItem('spotify_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {}
    removeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return context;
};
