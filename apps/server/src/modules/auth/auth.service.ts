import type { AuthResponse, Locale } from '@werewolf/shared';
import { AppError } from '../../lib/errors';
import { newOpaqueToken, sha256 } from '../../lib/ids';
import { toUserView, User, type UserDoc } from '../users/user.model';
import type { GoogleVerifier } from './google';
import { Session } from './session.model';
import type { TokenService } from './token.service';

const REFRESH_TTL_MS = 30 * 24 * 3600 * 1000;

/** Guest + Google only (no passwords). Refresh tokens rotate; reusing a revoked one revokes all. */
export class AuthService {
  constructor(
    private readonly tokens: TokenService,
    private readonly google: GoogleVerifier,
  ) {}

  async loginGuest(displayName: string, locale: Locale | undefined, userAgent?: string) {
    const user = await User.create({ kind: 'guest', displayName, locale: locale ?? 'en' });
    return this.issue(user.toObject() as UserDoc, userAgent);
  }

  async loginGoogle(idToken: string, locale: Locale | undefined, userAgent?: string) {
    const profile = await this.google.verify(idToken);
    const user = await User.findOneAndUpdate(
      { googleSub: profile.sub },
      {
        $setOnInsert: {
          kind: 'google',
          googleSub: profile.sub,
          displayName: displayNameFrom(profile.name),
          locale: locale ?? 'en',
        },
        $set: {
          email: profile.email ?? null,
          avatarUrl: profile.picture ?? null,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true, new: true },
    ).lean<UserDoc>();
    if (!user) throw new AppError('INTERNAL', 'Could not create user');
    return this.issue(user, userAgent);
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<AuthResponse> {
    const tokenHash = sha256(refreshToken);
    const session = await Session.findOne({ tokenHash }).lean();
    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token');
    }
    if (session.revokedAt) {
      // A rotated token was used again: assume theft and log the user out everywhere.
      await Session.updateMany(
        { userId: session.userId, revokedAt: null },
        { revokedAt: new Date() },
      );
      throw new AppError('UNAUTHORIZED', 'Refresh token reuse detected');
    }
    const rotated = await Session.findOneAndUpdate(
      { _id: session._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    if (!rotated) throw new AppError('UNAUTHORIZED', 'Invalid refresh token');
    const user = await User.findByIdAndUpdate(
      session.userId,
      { $set: { lastSeenAt: new Date() } },
      { new: true },
    ).lean<UserDoc>();
    if (!user) throw new AppError('UNAUTHORIZED', 'User no longer exists');
    return this.issue(user, userAgent);
  }

  async logout(refreshToken: string) {
    await Session.updateOne(
      { tokenHash: sha256(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  private async issue(user: UserDoc, userAgent?: string): Promise<AuthResponse> {
    const access = await this.tokens.signAccess({ userId: String(user._id), kind: user.kind });
    const refreshToken = newOpaqueToken();
    await Session.create({
      userId: user._id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: userAgent?.slice(0, 200) ?? null,
    });
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken,
      user: toUserView(user),
    };
  }
}

/** Google names can be empty or long; display names must be 3–20 chars. */
function displayNameFrom(name: string | undefined): string {
  const trimmed = (name ?? '').trim().slice(0, 20);
  return trimmed.length >= 3 ? trimmed : 'Player';
}
