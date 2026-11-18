import type { AppErrorBody, AuthResponse, CaptionLang, Locale, UserView } from '@werewolf/shared';
import type { SessionStore } from './session';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: AppErrorBody,
  ) {
    super(body.message);
  }
  get code() {
    return this.body.code;
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

/** REST client with automatic access-token refresh (single-flight). */
export function createApi({ apiUrl, session }: { apiUrl: string; session: SessionStore }) {
  let refreshing: Promise<boolean> | null = null;

  function refreshSession(): Promise<boolean> {
    refreshing ??= (async () => {
      const { refreshToken, setAuth, clear } = session.getState();
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${apiUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clear();
          return false;
        }
        setAuth((await res.json()) as AuthResponse);
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  /** A non-expired access token, refreshed first when it is about to expire. */
  async function freshAccessToken(): Promise<string | null> {
    const { accessToken, accessTokenExpiresAt } = session.getState();
    if (accessToken && accessTokenExpiresAt - Date.now() > 60_000) return accessToken;
    return (await refreshSession()) ? session.getState().accessToken : null;
  }

  async function api<T>(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}) {
    const send = async () => {
      const token = auth ? await freshAccessToken() : null;
      return fetch(`${apiUrl}${path}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    };
    let res = await send();
    if (res.status === 401 && auth && (await refreshSession())) res = await send();
    if (!res.ok) {
      const errorBody = (await res.json().catch(() => null)) as AppErrorBody | null;
      throw new ApiError(res.status, errorBody ?? { code: 'INTERNAL', message: res.statusText });
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  async function logout() {
    const { refreshToken, clear } = session.getState();
    if (refreshToken) {
      await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(
        () => undefined,
      );
    }
    clear();
  }

  /** Saves profile fields (language, caption language…) when signed in; no-op otherwise. */
  async function updateMe(patch: { locale?: Locale; captionLangs?: CaptionLang[] }) {
    if (!session.getState().refreshToken) return;
    const user = await api<UserView>('/me', { method: 'PATCH', body: patch });
    session.getState().setUser(user);
  }

  return { api, refreshSession, freshAccessToken, logout, updateMe };
}

export type ApiClient = ReturnType<typeof createApi>;
