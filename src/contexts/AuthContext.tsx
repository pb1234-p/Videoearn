import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (displayName: string, upiId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await api.post('/auth/signin', { email, password });
    setUser(response.data.user);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const response = await api.post('/auth/signup', { email, password, displayName });
    setUser(response.data.user);
  };

  const signOut = async () => {
    await api.post('/auth/signout');
    setUser(null);
  };

  const updateProfile = async (displayName: string, upiId: string) => {
    await api.patch('/user/profile', { displayName, upiId });
    await refreshUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
