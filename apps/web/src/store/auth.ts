import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSummary } from '../types';

interface AuthState {
  user: UserSummary | null;
  deviceId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: {
    user: UserSummary;
    deviceId: string;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      deviceId: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, deviceId, accessToken, refreshToken }) =>
        set({ user, deviceId, accessToken, refreshToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ user: null, deviceId: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'nfs-auth' },
  ),
);
