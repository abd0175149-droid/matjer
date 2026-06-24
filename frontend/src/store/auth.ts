'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiPost } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}
interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (email, password) => {
        const res = await apiPost('/auth/login', { email, password });
        set({ token: res.accessToken, user: res.user });
      },
      register: async (name, email, phone, password) => {
        const res = await apiPost('/auth/register', { name, email, phone, password });
        set({ token: res.accessToken, user: res.user });
      },
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'matjer-auth' },
  ),
);

export function authHeader(): Record<string, string> {
  const t = useAuth.getState().token;
  return t ? { Authorization: `Bearer ${t}` } : {};
}
