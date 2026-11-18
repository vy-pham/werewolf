import type { UserView } from '@werewolf/shared';
import { type InferSchemaType, model, Schema, type Types } from 'mongoose';

const userSchema = new Schema(
  {
    kind: { type: String, enum: ['guest', 'google'], required: true },
    googleSub: { type: String },
    email: { type: String, default: null },
    displayName: { type: String, required: true },
    avatarUrl: { type: String, default: null },
    locale: { type: String, enum: ['en', 'vi'], default: 'en' },
    captionLangs: { type: [String], default: [] },
    stats: {
      games: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      /** { [roleId]: { games, wins } } */
      byRole: { type: Schema.Types.Mixed, default: {} },
    },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true, minimize: false },
);

userSchema.index(
  { googleSub: 1 },
  { unique: true, partialFilterExpression: { googleSub: { $type: 'string' } } },
);
// Guests inactive for 90 days are removed automatically.
userSchema.index(
  { lastSeenAt: 1 },
  { expireAfterSeconds: 90 * 24 * 3600, partialFilterExpression: { kind: 'guest' } },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const User = model('User', userSchema);

export const toUserView = (u: UserDoc): UserView => ({
  id: String(u._id),
  kind: u.kind as UserView['kind'],
  displayName: u.displayName,
  avatarUrl: u.avatarUrl ?? null,
  locale: u.locale as UserView['locale'],
  captionLangs: [...(u.captionLangs ?? [])],
});
