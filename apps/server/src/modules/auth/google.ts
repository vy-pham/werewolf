import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../lib/errors';

export interface GoogleProfile {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

/** Verifies a Google ID token. Injected so tests can use a fake. */
export interface GoogleVerifier {
  verify(idToken: string): Promise<GoogleProfile>;
}

/** Accepts ID tokens whose audience is one of our web / iOS / Android OAuth client IDs. */
export function createGoogleVerifier(clientIds: string[]): GoogleVerifier {
  const client = new OAuth2Client();
  return {
    async verify(idToken) {
      if (clientIds.length === 0) {
        throw new AppError('FORBIDDEN', 'Google sign-in is not configured on this server');
      }
      try {
        const ticket = await client.verifyIdToken({ idToken, audience: clientIds });
        const p = ticket.getPayload();
        if (!p?.sub) throw new Error('missing sub');
        return { sub: p.sub, email: p.email, name: p.name, picture: p.picture };
      } catch {
        throw new AppError('UNAUTHORIZED', 'Invalid Google ID token');
      }
    },
  };
}
