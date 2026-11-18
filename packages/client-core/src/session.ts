import type { AuthResponse, UserView } from '@werewolf/shared';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export interface SessionState {
  accessToken: string | null;
  accessTokenExpiresAt: number;
  refreshToken: string | null;
  user: UserView | null;
  setAuth: (auth: AuthResponse) => void;
  setUser: (user: UserView) => void;
  clear: () => void;
}

/**
 * The signed-in session, persisted with the platform's storage (localStorage on the web,
 * SecureStore on mobile). Storage may be async.
 */
export function createSessionStore(storage: StateStorage) {
  return create<SessionState>()(
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
      { name: 'werewolf-session', storage: createJSONStorage(() => storage) },
    ),
  );
}

export type SessionStore = ReturnType<typeof createSessionStore>;

/** localStorage that never throws (private mode, blocked storage, server rendering). */
export const safeLocalStorage: StateStorage = {
  getItem: (key) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: (key) => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
  },
};
