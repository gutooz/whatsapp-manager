'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),

      login: async (email, password) => {
        const { data } = await api.post<{ user: User; token: string }>('/auth/login', {
          email,
          password,
        });
        set({ user: data.user, token: data.token });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch {}
        set({ user: null, token: null });
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
      },

      fetchMe: async () => {
        const { data } = await api.get<User>('/auth/me');
        set({ user: data });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    },
  ),
);
