import type { AuthResponse, UserView } from '@werewolf/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SessionState {
  accessToken: string | null;
  accessTokenExpiresAt: number;
  refreshToken: string | null;
  user: UserView | null;
  setAuth: (auth: AuthResponse) => void;
  setUser: (user: UserView) => void;
  clear: () => void;
}

/** Storage that never throws (private mode, blocked storage). */
const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // ignore
    }
  },
  removeItem: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  },
}));

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      accessTokenExpiresAt: 0,
      refreshToken: null,
      user: null,
      setAuth: (auth) =>
        set({
          accessToken: auth.accessToken,
          accessTokenExpiresAt: auth.accessTokenExpiresAt,
          refreshToken: auth.refreshToken,
          user: auth.user,
        }),
      setUser: (user) => set({ user }),
      clear: () =>
        set({ accessToken: null, accessTokenExpiresAt: 0, refreshToken: null, user: null }),
    }),
    { name: 'werewolf-session', storage: safeStorage },
  ),
);
