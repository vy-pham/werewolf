import type { AppErrorBody, AuthResponse } from '@werewolf/shared';
import { useSession } from '../stores/session';
import { API_URL } from './config';

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

let refreshing: Promise<boolean> | null = null;

/** Rotates the refresh token once, even if many callers ask at the same time. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const { refreshToken, setAuth, clear } = useSession.getState();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
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

/** Returns a non-expired access token, refreshing it first when it is about to expire. */
export async function freshAccessToken(): Promise<string | null> {
  const { accessToken, accessTokenExpiresAt } = useSession.getState();
  if (accessToken && accessTokenExpiresAt - Date.now() > 60_000) return accessToken;
  return (await refreshSession()) ? useSession.getState().accessToken : null;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {},
) {
  const send = async () => {
    const token = auth ? await freshAccessToken() : null;
    return fetch(`${API_URL}${path}`, {
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

export async function logout() {
  const { refreshToken, clear } = useSession.getState();
  if (refreshToken) {
    await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(
      () => undefined,
    );
  }
  clear();
}
