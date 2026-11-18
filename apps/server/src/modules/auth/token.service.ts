import { jwtVerify, SignJWT } from 'jose';
import { AppError } from '../../lib/errors';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface AccessClaims {
  userId: string;
  kind: string;
}

/** Short-lived HS256 access tokens (FR-AUTH-05). Refresh tokens are opaque, see AuthService. */
export class TokenService {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }

  async signAccess(claims: AccessClaims): Promise<{ token: string; expiresAt: number }> {
    const nowSec = Math.floor(Date.now() / 1000);
    const exp = nowSec + ACCESS_TOKEN_TTL_SECONDS;
    const token = await new SignJWT({ kind: claims.kind })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.userId)
      .setIssuedAt(nowSec)
      .setExpirationTime(exp)
      .sign(this.key);
    return { token, expiresAt: exp * 1000 };
  }

  async verifyAccess(token: string | undefined): Promise<AccessClaims> {
    if (!token) throw new AppError('UNAUTHORIZED', 'Missing access token');
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'] });
      if (!payload.sub) throw new Error('no subject');
      return { userId: payload.sub, kind: String(payload.kind ?? 'guest') };
    } catch {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired access token');
    }
  }
}
