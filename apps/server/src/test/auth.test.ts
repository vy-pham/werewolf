import type { AuthResponse, UserView } from '@werewolf/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { guest, http, startMongo, startServer, stopMongo, type TestServer } from './helpers';

let server: TestServer;

beforeAll(async () => {
  server = await startServer(await startMongo());
});

afterAll(async () => {
  await server.close();
  await stopMongo();
});

describe('auth', () => {
  it('guest login returns tokens and a user', async () => {
    const auth = await guest(server.url, 'Alice');
    expect(auth.user).toMatchObject({ kind: 'guest', displayName: 'Alice', locale: 'en' });
    expect(auth.accessToken).toBeTruthy();
    expect(auth.refreshToken).toBeTruthy();
    expect(auth.accessTokenExpiresAt).toBeGreaterThan(Date.now());
  });

  it('validates the display name', async () => {
    const res = await http(server.url, 'POST', '/auth/guest', { displayName: 'A' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('GET /me needs a valid bearer token', async () => {
    expect((await http(server.url, 'GET', '/me')).status).toBe(401);
    expect((await http(server.url, 'GET', '/me', undefined, 'garbage')).status).toBe(401);

    const auth = await guest(server.url, 'Bob');
    const me = await http<UserView>(server.url, 'GET', '/me', undefined, auth.accessToken);
    expect(me.body).toMatchObject({ id: auth.user.id, displayName: 'Bob' });
  });

  it('PATCH /me updates the profile', async () => {
    const auth = await guest(server.url, 'Carol');
    const res = await http<UserView>(
      server.url,
      'PATCH',
      '/me',
      { locale: 'vi', captionLangs: ['vi', 'en'] },
      auth.accessToken,
    );
    expect(res.body).toMatchObject({ locale: 'vi', captionLangs: ['vi', 'en'] });
  });

  it('refresh rotates tokens and detects reuse', async () => {
    const auth = await guest(server.url, 'Dave');
    const first = await http<AuthResponse>(server.url, 'POST', '/auth/refresh', {
      refreshToken: auth.refreshToken,
    });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(auth.refreshToken);

    // Reusing the old token fails and revokes every session of the user.
    const reuse = await http(server.url, 'POST', '/auth/refresh', {
      refreshToken: auth.refreshToken,
    });
    expect(reuse.status).toBe(401);
    const afterReuse = await http(server.url, 'POST', '/auth/refresh', {
      refreshToken: first.body.refreshToken,
    });
    expect(afterReuse.status).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const auth = await guest(server.url, 'Erin');
    const out = await http(server.url, 'POST', '/auth/logout', { refreshToken: auth.refreshToken });
    expect(out.status).toBe(204);
    const res = await http(server.url, 'POST', '/auth/refresh', {
      refreshToken: auth.refreshToken,
    });
    expect(res.status).toBe(401);
  });

  it('google login creates the user once and reuses it afterwards', async () => {
    const a = await http<AuthResponse>(server.url, 'POST', '/auth/google', {
      idToken: 'google:12345',
    });
    expect(a.status).toBe(200);
    expect(a.body.user).toMatchObject({ kind: 'google', displayName: 'Google 12345' });
    const b = await http<AuthResponse>(server.url, 'POST', '/auth/google', {
      idToken: 'google:12345',
    });
    expect(b.body.user.id).toBe(a.body.user.id);

    const bad = await http(server.url, 'POST', '/auth/google', { idToken: 'not-a-google-token' });
    expect(bad.status).toBe(401);
  });
});
